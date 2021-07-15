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

const { reloadDelegateCache } = require('../shared/core/delegates');

module.exports = [
	{
		name: 'reload.delegates',
		description: 'Keep the delegate list up-to-date',
		schedule: '*/2 * * * *', // Every 2 min
		init: async () => {
			logger.debug('Initializing delegate cache...');
			await reloadDelegateCache();
		},
		controller: async () => {
			logger.debug('Reloading delegate cache...');
			await reloadDelegateCache();
		},
	},
];
