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
const { Utils } = require('lisk-service-framework');
const { getIndexedAccountInfo } = require('./accountUtils');
const { getBase32AddressFromHex } = require('./accountUtils');

const coreApi = require('./coreApi');

const ObjectUtilService = Utils.Data;
const { isProperObject } = ObjectUtilService;

const getForgers = async params => {
	const forgers = await coreApi.getForgers(params);
	forgers.data = forgers.data
		.map(forger => ({
			...forger,
			address: getBase32AddressFromHex(forger.address),
		}));

	forgers.data = await BluebirdPromise.map(
		forgers.data,
		async forger => {
			const account = await getIndexedAccountInfo({ address: forger.address });
			forger.username = account && account.username
				? account.username
				: undefined;
			forger.totalVotesReceived = account && account.totalVotesReceived
				? Number(account.totalVotesReceived)
				: undefined;
			return forger;
		},
		{ concurrency: forgers.data.length },
	);
	return isProperObject(forgers) && Array.isArray(forgers.data) ? forgers : [];
};

module.exports = {
	getForgers,
};
