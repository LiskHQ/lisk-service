/*
 * LiskHQ/lisk-service
 * Copyright © 2023 Lisk Foundation
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
const {
	Logger,
} = require('lisk-service-framework');

const config = require('../config');

const { getTokenConstants, getRewardConstants, getPosConstants } = require('./dataService');
const indexStatus = require('./indexer/indexStatus');
const processor = require('./processor');

const logger = Logger();

const init = async () => {
	try {
		// Update the constants cache
		await getPosConstants();
		await getTokenConstants();
		await getRewardConstants();

		// Init index status updates
		await indexStatus.init();

		if (config.operations.isIndexingModeEnabled) {
			await processor.init();
		}
	} catch (error) {
		const errorMsg = Array.isArray(error)
			? error.map(e => e.message).join('\n')
			: error.message;
		logger.error(`Indexer initialisation failed: ${errorMsg}`);
	}
};

module.exports = {
	init,
};