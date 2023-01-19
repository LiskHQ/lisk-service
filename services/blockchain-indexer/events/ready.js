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
const { Logger, Signals } = require('lisk-service-framework');
const { getCurrentSvcStatus } = require('../ready');

const logger = Logger();

module.exports = [
	{
		name: 'indexer.Ready',
		description: 'Returns current readiness status of blockchain indexer microservice',
		controller: async callback => {
			const indexerServiceReadyListener = async () => {
				const status = await getCurrentSvcStatus();
				logger.debug(`Indexer readiness status: ${JSON.stringify(status, null, 2)}`);
				callback(true);
			};
			Signals.get('indexerServiceReady').add(indexerServiceReadyListener);
		},
	},
];