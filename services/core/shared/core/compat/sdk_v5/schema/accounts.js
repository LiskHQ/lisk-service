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
module.exports = {
	primaryKey: 'address',
	schema: {
		address: { type: 'string' },
		publicKey: { type: 'string' },
		isDelegate: { type: 'boolean', null: false, defaultValue: false },
		balance: { type: 'bigInteger' },
		username: { type: 'string' },
		rewards: { type: 'bigInteger', defaultValue: 0 },
		producedBlocks: { type: 'integer', defaultValue: 0 },
		totalVotesReceived: { type: 'string' },
	},
	indexes: {
		address: { type: 'key' },
		publicKey: { type: 'key' },
		isDelegate: { type: 'key' },
		balance: { type: 'range' },
		username: { type: 'key' },
	},
	purge: {},
};
