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
const core = require('../shared/core');
const config = require('../config');

module.exports = [
	{
		name: 'index.missing.blocks',
		description: 'Keep the blocks index up-to-date',
		schedule: '0 */3 * * *', // Every 3 hours
		controller: async () => {
			if (config.jobs.missingBlocks.enabled) {
				logger.debug('Checking for missing blocks in index...');
				const indexStartHeight = core.getIndexStartHeight();
				const toHeight = (await core.getNetworkStatus()).data.height;

				// fromHeight should not be lower than indexStartHeight
				// indexStartHeight is the lowest indexing height determined based on INDEX_N_BLOCKS
				const fromHeight = config.jobs.missingBlocks.range > 0
					? Math.max(toHeight - config.jobs.missingBlocks.range, indexStartHeight)
					: indexStartHeight;
				await core.indexMissingBlocks(fromHeight, toHeight);
			}
		},
	},
];
