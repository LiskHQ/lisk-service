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
const logger = require('lisk-service-framework').Logger();

const { getApiClient } = require('../common/wsRequest');
const { normalizeBlocks } = require('./blocks');

const config = require('../../../../config');

const register = async (events) => {
	const apiClient = await getApiClient();
	logger.info(`(Re-)registering ${config.endpoints.liskWs} for blockchain events`);

	apiClient.subscribe('app:block:new', async data => {
		try {
			const incomingBlock = apiClient.block.decode(Buffer.from(data.block, 'hex'));
			const [newBlock] = await normalizeBlocks([incomingBlock]);
			logger.debug(`New block forged: ${newBlock.id} at height ${newBlock.height}`);
			events.newBlock(newBlock);
			events.calculateFeeEstimate();
		} catch (err) {
			logger.error(err.message);
		}
	});

	apiClient.subscribe('app:block:delete', async data => {
		try {
			const incomingBlock = apiClient.block.decode(Buffer.from(data.block, 'hex'));
			const [deletedBlock] = await normalizeBlocks([incomingBlock]);
			logger.debug(`Block deleted: ${deletedBlock.id} at height ${deletedBlock.height}`);
			events.deleteBlock(deletedBlock);
		} catch (err) {
			logger.error(err.message);
		}
	});

	apiClient.subscribe('app:chain:validators:change', data => {
		logger.debug(`Chain validators updated: ${data}`);
		events.newRound(data);
	});
};

module.exports = { register };
