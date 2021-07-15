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
const { CacheRedis, Logger, Signals } = require('lisk-service-framework');

const coreApi = require('./coreApi');

const config = require('../../../../config');
const { initializeQueue } = require('../../queue');

const {
	getUnixTime,
	getBlockchainTime,
	validateTimestamp,
} = require('../common');

const mysqlIdx = require('../../../indexdb/mysql');
const blockIdxSchema = require('./schema/blocks');

const getBlockIdx = () => mysqlIdx('blockIdx', blockIdxSchema);

const logger = Logger();

const bIdCache = CacheRedis('blockIdToTimestamp', config.endpoints.redis);

const MAX_BLOCKS_LIMIT_PP = 100;

let currentHeight = 0;

let heightFinalized;

const setFinalizedHeight = (height) => {
	heightFinalized = height;
};

const updateFinalizedHeight = async () => {
	const result = await coreApi.getNetworkStatus();
	setFinalizedHeight(result.data.chainMaxHeightFinalized);
	return result;
};

const getFinalizedHeight = () => heightFinalized;

const indexBlocks = async job => {
	const { blocks } = job.data;
	const blockIdx = await getBlockIdx();
	blocks.forEach(block => {
		if (block.numberOfTransactions > 0) {
			blockIdx.upsert(block);
			logger.debug(`============== 'indexTransactions' signal: ${Signals.get('indexTransactions')} ==============`);
			Signals.get('indexTransactions').dispatch(block.id);
		}
	});
};

const indexBlocksQueue = initializeQueue('indexBlocksQueuev4', indexBlocks);

const getBlocks = async (params) => {
	const blocks = {
		data: [],
		meta: {},
	};

	await Promise.all(
		['fromTimestamp', 'toTimestamp'].map(async (timestamp) => {
			if (await validateTimestamp(params[timestamp])) {
				params[timestamp] = await getBlockchainTime(params[timestamp]);
			}
			return Promise.resolve();
		}),
	);

	const response = await coreApi.getBlocks(params);
	if (response.data) blocks.data = response.data;
	if (response.meta) blocks.meta = response.meta;

	blocks.data.forEach((block) => {
		if (block.height > currentHeight) currentHeight = block.height;
	});

	await Promise.all(
		blocks.data.map(async (o) => Object.assign(o, {
			unixTimestamp: await getUnixTime(o.timestamp),
			isImmutable: currentHeight - o.height >= getFinalizedHeight(),
		}),
		),
	);
	if (blocks.data.length === 1) await indexBlocksQueue.add('indexBlocksQueuev4', { blocks: blocks.data });

	return blocks;
};

const buildIndex = async (from, to) => {
	logger.info('Building index of blocks');

	if (from >= to) {
		logger.warn(`Invalid interval of blocks to index: ${from} -> ${to}`);
		return;
	}

	const numOfPages = Math.ceil((to + 1) / MAX_BLOCKS_LIMIT_PP - from / MAX_BLOCKS_LIMIT_PP);
	const highestIndexedHeight = await bIdCache.get('highestIndexedHeight');

	for (let pageNum = 0; pageNum < numOfPages; pageNum++) {
		/* eslint-disable no-await-in-loop */
		const pseudoOffset = to - (MAX_BLOCKS_LIMIT_PP * (pageNum + 1));
		const offset = pseudoOffset > from ? pseudoOffset : from - 1;
		logger.info(`Attempting to cache blocks ${offset + 1}-${offset + MAX_BLOCKS_LIMIT_PP}`);
		let blocks;
		do {
			blocks = await getBlocks({
				limit: MAX_BLOCKS_LIMIT_PP,
				offset,
				sort: 'height:asc',
			});
		} while (!(blocks.data.length && blocks.data.every(block => !!block && !!block.height)));

		await indexBlocksQueue.add('indexBlocksQueuev4', { blocks: blocks.data });

		blocks.data = blocks.data.sort((a, b) => a.height - b.height);
		const topHeightFromBatch = (blocks.data.pop()).height;
		const bottomHeightFromBatch = (blocks.data.shift()).height;
		const lowestIndexedHeight = await bIdCache.get('lowestIndexedHeight');
		if (bottomHeightFromBatch < lowestIndexedHeight || lowestIndexedHeight === 0) await bIdCache.set('lowestIndexedHeight', bottomHeightFromBatch);
		if (topHeightFromBatch > highestIndexedHeight) await bIdCache.set('highestIndexedHeight', topHeightFromBatch);
		/* eslint-enable no-await-in-loop */
	}
	logger.info(`Finished building block index (${from}-${to})`);
	logger.debug(`============== 'blockIndexReady' signal: ${Signals.get('blockIndexReady')} ==============`);
	Signals.get('blockIndexReady').dispatch(true);
};

const init = async () => {
	try {
		await getBlockIdx();
		const genesisHeight = 1;
		currentHeight = (await coreApi.getNetworkStatus()).data.height;

		const blockIndexLowerRange = config.indexNumOfBlocks > 0
			? currentHeight - config.indexNumOfBlocks : genesisHeight;
		const blockIndexHigherRange = currentHeight;

		// Index genesis block first
		await getBlocks({ height: genesisHeight });

		const highestIndexedHeight = await bIdCache.get('highestIndexedHeight') || blockIndexLowerRange;

		const lastNumOfBlocks = await bIdCache.get('lastNumOfBlocks');
		if (lastNumOfBlocks !== config.indexNumOfBlocks) {
			logger.info('Configuration has been updated, re-index eveything');
			await bIdCache.set('lastNumOfBlocks', config.indexNumOfBlocks);
			await bIdCache.set('lowestIndexedHeight', 0);
			await bIdCache.set('highestIndexedHeight', currentHeight);
		}

		await buildIndex(highestIndexedHeight, blockIndexHigherRange);

		const lowestIndexedHeight = await bIdCache.get('lowestIndexedHeight');
		if (blockIndexLowerRange < lowestIndexedHeight) {
			// For when the index is partially built
			await buildIndex(blockIndexLowerRange, lowestIndexedHeight);
		}
	} catch (err) {
		logger.warn('Unable to build block cache');
		logger.warn(err.message);
	}
};

module.exports = {
	getBlocks,
	updateFinalizedHeight,
	getFinalizedHeight,
	getBlockIdx,
	init,
};
