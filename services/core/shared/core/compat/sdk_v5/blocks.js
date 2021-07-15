/*
 * LiskHQ/lisk-service
 * Copyright © 2021 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
const BluebirdPromise = require('bluebird');
const util = require('util');
const {
	Logger,
	Signals,
	Exceptions: { ValidationException, NotFoundException },
} = require('lisk-service-framework');

const coreApi = require('./coreApi');
const config = require('../../../../config');

const {
	indexAccountsbyPublicKey,
	getIndexedAccountInfo,
	indexAccountsbyAddress,
} = require('./accounts');

const {
	indexVotes,
} = require('./voters');

const {
	indexTransactions,
	removeTransactionsByBlockIDs,
} = require('./transactions');

const {
	getApiClient,
	getIndexReadyStatus,
	setIndexReadyStatus,
	setIsSyncFullBlockchain,
} = require('../common');

const { initializeQueue } = require('../../queue');
const { parseToJSONCompatObj } = require('../../../jsonTools');

const mysqlIndex = require('../../../indexdb/mysql');
const blocksIndexSchema = require('./schema/blocks');

const getBlocksIndex = () => mysqlIndex('blocks', blocksIndexSchema);

const logger = Logger();

const { genesisHeight } = config;
let finalizedHeight;
let indexStartHeight;

const getGenesisHeight = () => genesisHeight;

const setFinalizedHeight = (height) => finalizedHeight = height;

const getFinalizedHeight = () => finalizedHeight;

const setIndexStartHeight = (height) => indexStartHeight = height;

const getIndexStartHeight = () => indexStartHeight;

const updateFinalizedHeight = async () => {
	const result = await coreApi.getNetworkStatus();
	setFinalizedHeight(result.data.finalizedHeight);
	return result;
};

const deleteIndexedBlocks = async job => {
	const { blocks } = job.data;
	const blocksDB = await getBlocksIndex();
	const generatorPkInfoArray = [];
	blocks.forEach(async block => {
		if (block.generatorPublicKey) generatorPkInfoArray.push({
			publicKey: block.generatorPublicKey,
			reward: block.reward,
			isForger: true,
			isDeleteBlock: true,
		});
	});
	await indexAccountsbyPublicKey(generatorPkInfoArray);
	await removeTransactionsByBlockIDs(blocks.map(b => b.id));
	await blocksDB.deleteIds(blocks.map(b => b.height));
};

const indexBlocks = async job => {
	const { blocks } = job.data;
	const blocksDB = await getBlocksIndex();
	const generatorPkInfoArray = [];
	blocks.forEach(async block => {
		if (block.generatorPublicKey) {
			const [blockInfo] = await blocksDB.find({ id: block.id });
			generatorPkInfoArray.push({
				publicKey: block.generatorPublicKey,
				reward: block.reward,
				isForger: true,
				isBlockIndexed: !!blockInfo,
			});
		}
	});
	await blocksDB.upsert(blocks);
	await indexAccountsbyPublicKey(generatorPkInfoArray);
	await indexTransactions(blocks);
	await indexVotes(blocks);
};

const updateBlockIndex = async job => {
	const { blocks } = job.data;
	const blocksDB = await getBlocksIndex();
	await blocksDB.upsert(blocks);
};

const indexBlocksQueue = initializeQueue('indexBlocksQueue', indexBlocks);
const updateBlockIndexQueue = initializeQueue('updateBlockIndexQueue', updateBlockIndex);
const deleteIndexedBlocksQueue = initializeQueue('deleteIndexedBlocksQueue', deleteIndexedBlocks);

const normalizeBlocks = async blocks => {
	const apiClient = await getApiClient();

	const normalizedBlocks = BluebirdPromise.map(
		blocks.map(block => ({ ...block.header, payload: block.payload })),
		async block => {
			const account = await getIndexedAccountInfo({ publicKey: block.generatorPublicKey.toString('hex') });
			block.generatorAddress = account && account.address ? account.address : undefined;
			block.generatorUsername = account && account.username ? account.username : undefined;
			block.isFinal = block.height <= getFinalizedHeight();
			block.numberOfTransactions = block.payload.length;

			block.size = 0;
			block.totalForged = Number(block.reward);
			block.totalBurnt = 0;
			block.totalFee = 0;

			block.payload.forEach(txn => {
				txn.size = apiClient.transaction.encode(txn).length;
				txn.minFee = apiClient.transaction.computeMinFee(txn);

				block.size += txn.size;

				const txnMinFee = Number(txn.minFee);
				block.totalForged += Number(txn.fee);
				block.totalBurnt += txnMinFee;
				block.totalFee += Number(txn.fee) - txnMinFee;
			});

			return parseToJSONCompatObj(block);
		},
		{ concurrency: blocks.length },
	);

	return normalizedBlocks;
};

const getBlockByID = async id => {
	const response = await coreApi.getBlockByID(id);
	return normalizeBlocks(response.data);
};

const getBlocksByIDs = async ids => {
	const response = await coreApi.getBlocksByIDs(ids);
	return normalizeBlocks(response.data);
};

const getBlockByHeight = async height => {
	const response = await coreApi.getBlockByHeight(height);
	return normalizeBlocks(response.data);
};

const getBlocksByHeightBetween = async (from, to) => {
	const response = await coreApi.getBlocksByHeightBetween(from, to);
	return normalizeBlocks(response.data);
};

const getLastBlock = async () => {
	const response = await coreApi.getLastBlock();
	return normalizeBlocks(response.data);
};

const isQueryFromIndex = params => {
	const paramProps = Object.getOwnPropertyNames(params);

	const isDirectQuery = ['id', 'height', 'heightBetween'].some(prop => paramProps.includes(prop));

	const sortOrder = params.sort ? params.sort.split(':')[1] : undefined;
	const isLatestBlockFetch = (paramProps.length === 1 && params.limit === 1)
		|| (paramProps.length === 2
			&& ((params.limit === 1 && params.offset === 0)
				|| (sortOrder === 'desc' && (params.limit === 1 || params.offset === 0))
			))
		|| (paramProps.length === 3 && params.limit === 1 && params.offset === 0 && sortOrder === 'desc');

	return !isDirectQuery && !isLatestBlockFetch;
};

const indexNewBlocks = async blocks => {
	const blocksDB = await getBlocksIndex();
	if (blocks.data.length === 1) {
		const [block] = blocks.data;
		logger.info(`Indexing new block: ${block.id} at height ${block.height}`);

		const [blockInfo] = await blocksDB.find({ height: block.height });
		if (!blockInfo || (!blockInfo.isFinal && block.isFinal)) {
			// Index if doesn't exist, or update if it isn't set to final
			await indexBlocksQueue.add('indexBlocksQueue', { blocks: blocks.data });

			// Update block finality status
			const finalizedBlockHeight = getFinalizedHeight();
			const nonFinalBlocks = await blocksDB.find({ isFinal: false, limit: 1000 });
			await updateBlockIndexQueue.add('updateBlockIndexQueue', {
				blocks: nonFinalBlocks
					.filter(b => b.height <= finalizedBlockHeight)
					.map(b => ({ ...b, isFinal: true })),
			});

			if (blockInfo && blockInfo.id !== block.id) {
				// Fork detected

				const [highestIndexedBlock] = await blocksDB.find({ sort: 'height:desc', limit: 1 });
				const blocksToRemove = await blocksDB.find({
					propBetweens: [{
						property: 'height',
						from: block.height + 1,
						to: highestIndexedBlock.height,
					}],
					limit: highestIndexedBlock.height - block.height,
				});
				const blockIDsToRemove = blocksToRemove.map(b => b.id);
				await blocksDB.deleteIds(blockIDsToRemove);

				// Remove transactions in the forked blocks
				await removeTransactionsByBlockIDs(blockIDsToRemove);
			}
		}
	}
};

const getBlocks = async params => {
	const blocksDB = await getBlocksIndex();
	const blocks = {
		data: [],
		meta: {},
	};

	if (params.blockId) {
		const { blockId, ...remParams } = params;
		params = remParams;
		params.id = blockId;
	}

	let accountInfo;

	if (params.address) {
		const { address, ...remParams } = params;
		params = remParams;
		accountInfo = await getIndexedAccountInfo({ address });
	}
	if (params.username) {
		const { username, ...remParams } = params;
		params = remParams;
		accountInfo = await getIndexedAccountInfo({ username });
	}

	if (accountInfo && accountInfo.publicKey) {
		params.generatorPublicKey = accountInfo.publicKey;
	}

	if (params.height && typeof params.height === 'string' && params.height.includes(':')) {
		const { height, ...remParams } = params;
		params = remParams;
		const [from, to] = height.split(':');
		if (from && to && from > to) throw new ValidationException('From height cannot be greater than to height');
		if (!params.propBetweens) params.propBetweens = [];
		params.propBetweens.push({
			property: 'height',
			from,
			to,
		});
	}

	if (params.timestamp && params.timestamp.includes(':')) {
		const { timestamp, ...remParams } = params;
		params = remParams;
		const [from, to] = timestamp.split(':');
		if (from && to && from > to) throw new ValidationException('From timestamp cannot be greater than to timestamp');
		if (!params.propBetweens) params.propBetweens = [];
		params.propBetweens.push({
			property: 'timestamp',
			from,
			to,
		});
	}

	const total = await blocksDB.count(params);
	if (isQueryFromIndex(params)) {
		const resultSet = await blocksDB.find(params);
		params.ids = resultSet.map(row => row.id);
	}

	try {
		if (params.id) {
			blocks.data = await getBlockByID(params.id);
			if ('offset' in params && params.limit) blocks.data = blocks.data.slice(params.offset, params.offset + params.limit);
		} else if (params.ids) {
			blocks.data = await getBlocksByIDs(params.ids);
		} else if (params.height) {
			blocks.data = await getBlockByHeight(params.height);
			if ('offset' in params && params.limit) blocks.data = blocks.data.slice(params.offset, params.offset + params.limit);
		} else if (params.heightBetween) {
			const { from, to } = params.heightBetween;
			blocks.data = await getBlocksByHeightBetween(from, to);
			if (params.sort) {
				const [sortProp, sortOrder] = params.sort.split(':');
				blocks.data = blocks.data.sort(
					(a, b) => sortOrder === 'asc' ? a[sortProp] - b[sortProp] : b[sortProp] - a[sortProp],
				);
			}
		} else {
			blocks.data = await getLastBlock();
		}
	} catch (err) {
		// Block does not exist
		if (err.message.includes('does not exist')) {
			let errMessage;
			if (err.message.includes(':id')) errMessage = `Block ${params.id} does not exist`;
			if (err.message.includes(':height')) errMessage = `Block at height ${params.height} does not exist`;
			throw new NotFoundException(errMessage);
		}
		throw err;
	}

	blocks.meta = {
		count: blocks.data.length,
		offset: params.offset,
		total,
	};

	return blocks;
};

const deleteBlock = async (block) => {
	await deleteIndexedBlocksQueue.add('deleteIndexedBlocksQueue', { blocks: [block] });
	return block;
};

const indexGenesisBlock = async () => {
	logger.info(`Ìndexing genesis block at height ${genesisHeight}`);
	const [genesisBlock] = await getBlockByHeight(genesisHeight);

	const accountAddressesToIndex = genesisBlock.asset.accounts
		.filter(account => account.address.length > 16) // Filter out reclaim accounts
		.map(account => account.address);

	const PAGE_SIZE = 50;
	const NUM_PAGES = Math.ceil(accountAddressesToIndex.length / PAGE_SIZE);
	for (let i = 0; i < NUM_PAGES; i++) {
		// eslint-disable-next-line no-await-in-loop
		await indexAccountsbyAddress(
			accountAddressesToIndex.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE),
			true,
		);
	}
	await indexTransactions([genesisBlock]);
	await indexBlocksQueue.add('indexBlocksQueue', { blocks: [genesisBlock] });
	logger.info('Finished indexing the genesis block');
};

const buildIndex = async (from, to) => {
	logger.info('Building index of blocks');

	if (from > to) {
		logger.warn(`Invalid interval of blocks to index: ${from} -> ${to}`);
		return;
	}

	const MAX_BLOCKS_LIMIT_PP = 50;
	const numOfPages = Math.ceil((to + 1) / MAX_BLOCKS_LIMIT_PP - from / MAX_BLOCKS_LIMIT_PP);

	for (let pageNum = 0; pageNum < numOfPages; pageNum++) {
		/* eslint-disable no-await-in-loop */
		const pseudoOffset = to - (MAX_BLOCKS_LIMIT_PP * (pageNum + 1));
		const offset = pseudoOffset > from ? pseudoOffset : from - 1;
		const batchFromHeight = offset + 1;
		const batchToHeight = (offset + MAX_BLOCKS_LIMIT_PP) <= to
			? (offset + MAX_BLOCKS_LIMIT_PP) : to;
		logger.info(`Attempting to cache blocks ${batchFromHeight}-${batchToHeight}`);

		let blocks;
		do {
			blocks = await getBlocksByHeightBetween(batchFromHeight, batchToHeight);
		} while (!(blocks.length && blocks.every(block => !!block && block.height >= 0)));

		await indexBlocksQueue.add('indexBlocksQueue', { blocks });
		/* eslint-enable no-await-in-loop */
	}
	logger.info(`Finished building block index (${from}-${to})`);
};

const indexMissingBlocks = async (startHeight, endHeight) => {
	// startHeight can never be lower than genesisHeight
	if (startHeight < genesisHeight) startHeight = genesisHeight;

	const PAGE_SIZE = 100000;
	const numOfPages = Math.ceil((endHeight - startHeight) / PAGE_SIZE);
	for (let pageNum = 0; pageNum < numOfPages; pageNum++) {
		/* eslint-disable no-await-in-loop */
		const toHeight = endHeight - (PAGE_SIZE * pageNum);
		const fromHeight = (toHeight - PAGE_SIZE) > startHeight
			? (toHeight - PAGE_SIZE) : startHeight;

		logger.info(`Checking for missing blocks between height ${fromHeight} - ${toHeight}`);

		const blocksDB = await getBlocksIndex();
		const propBetweens = [{
			property: 'height',
			from: fromHeight,
			to: toHeight,
		}];
		const indexedBlockCount = await blocksDB.count({ propBetweens });
		if (indexedBlockCount < toHeight) {
			const missingBlocksQueryStatement = `
			SELECT
				(SELECT COALESCE(MAX(b0.height)+1, ${genesisHeight}) FROM blocks b0 WHERE b0.height < b1.height) AS 'from',
				(b1.height - 1) AS 'to'
			FROM blocks b1
			WHERE b1.height BETWEEN ${fromHeight} AND ${toHeight}
				AND b1.height != ${genesisHeight}
				AND NOT EXISTS (SELECT 1 FROM blocks b2 WHERE b2.height = b1.height - 1)
		`;

			logger.debug('propBetweens', util.inspect(propBetweens));
			const missingBlocksRanges = await blocksDB.rawQuery(missingBlocksQueryStatement);
			logger.debug('missingBlocksRanges', util.inspect(missingBlocksRanges));
			for (let i = 0; i < missingBlocksRanges.length; i++) {
				const { from, to } = missingBlocksRanges[i];

				logger.info(`Attempting to cache missing blocks ${from}-${to}`);

				if (from === genesisHeight) await indexGenesisBlock();
				await buildIndex(from, to);
			}
		}
		/* eslint-enable no-await-in-loop */
	}
};

const indexPastBlocks = async () => {
	const blocksDB = await getBlocksIndex();

	if (config.indexNumOfBlocks === 0) setIsSyncFullBlockchain(true);

	// Lowest and highest block heights expected to be indexed
	const blockIndexHigherRange = (await coreApi.getNetworkStatus()).data.height;
	const blockIndexLowerRange = config.indexNumOfBlocks > 0
		? blockIndexHigherRange - config.indexNumOfBlocks : genesisHeight;

	// Store the value for the missing blocks job
	setIndexStartHeight(blockIndexLowerRange);

	// Highest block available within the index
	// If index empty, default lastIndexedHeight (alias for height) to blockIndexLowerRange
	const [{ height: lastIndexedHeight = blockIndexLowerRange } = {}] = await blocksDB.find({ sort: 'height:desc', limit: 1 });
	const highestIndexedHeight = lastIndexedHeight > blockIndexLowerRange
		? lastIndexedHeight : blockIndexLowerRange;

	// Start building the block index
	await buildIndex(highestIndexedHeight, blockIndexHigherRange);
	await indexMissingBlocks(blockIndexLowerRange, blockIndexHigherRange);
};

const checkIndexReadiness = async () => {
	logger.debug('============== Checking blocks index ready status ==============');
	if (!getIndexReadyStatus()) {
		const blocksDB = await getBlocksIndex();
		const currentChainHeight = (await coreApi.getNetworkStatus()).data.height;
		const numBlocksIndexed = await blocksDB.count();
		const [lastIndexedBlock] = await blocksDB.find({ sort: 'height:desc', limit: 1 });

		logger.debug(
			`\nnumBlocksIndexed: ${numBlocksIndexed}`,
			`\nlastIndexedBlock: ${lastIndexedBlock.height}`,
			`\ncurrentChainHeight: ${currentChainHeight}`,
		);
		if (numBlocksIndexed >= currentChainHeight - genesisHeight
			&& lastIndexedBlock.height >= currentChainHeight - 1) {
			setIndexReadyStatus(true);
			logger.info('Blocks index is now ready');
			logger.debug(`============== 'blockIndexReady' signal: ${Signals.get('blockIndexReady')} ==============`);
			Signals.get('blockIndexReady').dispatch(true);
		} else {
			logger.debug('Blocks index is not yet ready');
		}
	}
	return getIndexReadyStatus();
};

const init = async () => {
	// Index every new incoming block
	Signals.get('newBlock').add(async data => { await indexNewBlocks(data); });

	// Check state of index and perform update
	try {
		await indexGenesisBlock().catch(err => {
			logger.error(err.message);
			logger.warn('Unable to index the Genesis block. Continuing with the remaining...');
		});
		await indexPastBlocks();
	} catch (err) {
		logger.warn('Unable to update block index');
		logger.warn(err.message);
	}

	// Check and update index readiness status
	Signals.get('newBlock').add(checkIndexReadiness);
};

module.exports = {
	init,
	getBlocks,
	deleteBlock,
	getGenesisHeight,
	getIndexStartHeight,
	indexMissingBlocks,
	updateFinalizedHeight,
	getFinalizedHeight,
	normalizeBlocks,
};
