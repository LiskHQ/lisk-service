/*
 * LiskHQ/lisk-service
 * Copyright © 2019 Lisk Foundation
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
const { createWSClient } = require('@liskhq/lisk-api-client');
const config = require('../../../../config');

const logger = Logger();

const liskAddress = config.endpoints.liskWs;
let clientCache;

const getApiClient = async () => {
	try {
		if (!clientCache || !clientCache._channel.isAlive) {
			if (clientCache) await clientCache.disconnect();
			clientCache = await createWSClient(`${liskAddress}/ws`);

			// Inform listeners about the newly created ApiClient
			logger.debug(`============== 'newApiClient' signal: ${Signals.get('newApiClient')} ==============`);
			Signals.get('newApiClient').dispatch();
		}
		return clientCache;
	} catch (err) {
		logger.error(`Error instantiating WS client to ${liskAddress}`);
		logger.error(err.message);
		if (err.code === 'ECONNREFUSED') throw new Error('ECONNREFUSED: Unable to reach a network node');

		return {
			data: { error: 'Action not supported' },
			status: 'METHOD_NOT_ALLOWED',
		};
	}
};

module.exports = {
	getApiClient,
};
