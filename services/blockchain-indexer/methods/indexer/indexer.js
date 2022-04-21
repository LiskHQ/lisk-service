/*
 * LiskHQ/lisk-service
 * Copyright © 2022 Lisk Foundation
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
	getMissingBlocks,
	isGenesisBlockIndexed,
} = require('../../shared/indexer/blockchainIndex');

const {
	getDelegateAccounts,
	buildLegacyAccountCache,
	getGenesisAccountAddresses,
	isGenesisAccountsIndexed,
} = require('../../shared/indexer/accountIndex');

const {
	getCurrentHeight,
	getGenesisHeight,
} = require('../../shared/constants');

module.exports = [
	{
		name: 'getMissingBlocks',
		controller: getMissingBlocks,
		params: {
			from: { optional: false, type: 'any' },
			to: { optional: false, type: 'any' },
		},
	},
	{
		name: 'isGenesisBlockIndexed',
		controller: isGenesisBlockIndexed,
		params: {},
	},
	{
		name: 'getGenesisAccountAddresses',
		controller: async ({ includeLegacy }) => getGenesisAccountAddresses(includeLegacy),
		params: {
			includeLegacy: { optional: true, type: 'boolean', defaultValue: false },
		},
	},
	{
		name: 'isGenesisAccountsIndexed',
		controller: isGenesisAccountsIndexed,
		params: {},
	},
	{
		name: 'getDelegateAccounts',
		controller: getDelegateAccounts,
		params: {},
	},
	{
		name: 'buildLegacyAccountCache',
		controller: buildLegacyAccountCache,
		params: {},
	},
	{
		name: 'getCurrentHeight',
		controller: getCurrentHeight,
		params: {},
	},
	{
		name: 'getGenesisHeight',
		controller: getGenesisHeight,
		params: {},
	},
];
