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
	encodeBlock,
	encodeTransaction,
	encodeEvent,
} = require('../../shared/sdk/encoder');

module.exports = [
	{
		name: 'encodeTransaction',
		controller: async ({ transaction }) => encodeTransaction(transaction),
		params: {
			transaction: { optional: false, type: 'object' },
		},
	},
	{
		name: 'encodeBlock',
		controller: async ({ block }) => encodeBlock(block),
		params: {
			block: { optional: false, type: 'object' },
		},
	},
	{
		name: 'encodeEvent',
		controller: async ({ event }) => encodeEvent(event),
		params: {
			event: { optional: false, type: 'object' },
		},
	},
];
