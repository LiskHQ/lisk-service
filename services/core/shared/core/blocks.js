/*
 * LiskHQ/lisk-service
 * Copyright © 2020 Lisk Foundation
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
const { Logger } = require('lisk-service-framework');
const util = require('util');

const logger = Logger();

const coreApi = require('./compat');
const { getUsernameByAddress } = require('./delegateUtils');

let lastBlock = {};

const setLastBlock = block => {
	if (block && block.height && block.height > lastBlock.height) lastBlock = block;
	else if (!lastBlock.height) lastBlock = block;
};
const getLastBlock = () => lastBlock;
const waitForLastBlock = () => new Promise((resolve) => {
	const checkLastBlock = (interval) => {
		const block = getLastBlock();
		if (block && block.height > 0) {
			if (interval) clearInterval(interval);
			resolve(getLastBlock());
		}
	};
	checkLastBlock();
	const interval = setInterval(() => checkLastBlock(interval), 500);
});

const getBlocksFromServer = async params => {
	const blocks = {
		data: [],
		meta: {},
	};

	if (params.blockId) logger.debug(`Retrieved block with id ${params.blockId} from Lisk Core`);
	else if (params.height) logger.debug(`Retrieved block with height: ${params.height} from Lisk Core`);
	else logger.debug(`Retrieved block with custom search: ${util.inspect(params)} from Lisk Core`);

	const response = await coreApi.getBlocks(params);
	if (response.data) blocks.data = response.data;
	if (response.meta) blocks.meta = response.meta;

	if (blocks.data.length) {
		blocks.data.forEach(block => setLastBlock(block));
	}

	return blocks;
};

const getBlocks = async (params = {}) => {
	const blocks = {
		data: [],
		meta: {},
	};

	const response = await getBlocksFromServer(params);
	if (response.data) blocks.data = response.data;
	if (response.meta) blocks.meta = response.meta;

	await Promise.all(blocks.data.map(async block => {
		block.generatorUsername = await getUsernameByAddress(block.generatorAddress);
		return block;
	}));

	let total;
	if (params.generatorPublicKey) {
		total = blocks.meta.total || undefined;
	} else if (params.blockId || (params.height && !params.height.includes(':'))) {
		total = blocks.data.length;
	} else if ((params.height && params.height.includes(':'))
		|| (params.timestamp && params.timestamp.includes(':'))) {
		total = blocks.meta.total;
	} else {
		total = (getLastBlock()).height - coreApi.getGenesisHeight() + 1;
	}

	if (coreApi.getFinalizedHeight) {
		const finalHeight = coreApi.getFinalizedHeight();
		const data = blocks.data.map((block) => Object.assign(block,
			{ isFinal: block.height <= finalHeight },
		));
		blocks.data = data;
	}

	return {
		data: blocks.data,
		meta: {
			count: blocks.data.length,
			offset: parseInt(params.offset, 10) || 0,
			total,
		},
	};
};

const preloadBlocksOneByOne = async (n) => {
	let blockId = (getLastBlock()).previousBlockId;
	for (let i = 0; i <= n; i++) {
		// eslint-disable-next-line no-await-in-loop
		blockId = (await getBlocks({ blockId })).data[0].previousBlockId;
	}
};

const preloadBlocksByPage = async (n) => {
	const pageSize = 100;
	const numberOfPages = Math.ceil(n / pageSize);

	const limit = 100;
	for (let i = 0; i <= numberOfPages; i++) {
		// eslint-disable-next-line no-await-in-loop
		await getBlocks({ sort: 'height:desc', offset: (i * limit) + 1, limit });
	}
};

const reloadBlocks = async (n) => preloadBlocksByPage(n);

const performLastBlockUpdate = (newBlock) => {
	try {
		logger.debug(`Setting last block to height: ${newBlock.height} (id: ${newBlock.id})`);
		setLastBlock(newBlock);
	} catch (err) {
		logger.error(err);
	}
};

const deleteBlock = async (block) => coreApi.deleteBlock(block);

const initBlocks = (async () => {
	await coreApi.updateFinalizedHeight();

	const { data: [newBlock] } = await getBlocks({ limit: 1 });
	performLastBlockUpdate(newBlock);
})();

module.exports = {
	getBlocks,
	preloadBlocksOneByOne,
	preloadBlocksByPage,
	setLastBlock,
	getLastBlock,
	waitForLastBlock,
	initBlocks,
	reloadBlocks,
	performLastBlockUpdate,
	deleteBlock,
};
