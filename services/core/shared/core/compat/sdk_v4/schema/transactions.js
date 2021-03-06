
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
	primaryKey: 'id',
	schema: {
		id: { type: 'string' },
		type: { type: 'integer' },
		senderId: { type: 'string' },
		recipientId: { type: 'string' },
		amount: { type: 'bigInteger' },
		fee: { type: 'bigInteger' },
		timestamp: { type: 'integer' },
		unixTimestamp: { type: 'integer' },
		blockId: { type: 'string' },
		height: { type: 'integer' },
	},
	indexes: {
		type: { type: 'key' },
		sender: { type: 'key' },
		recipient: { type: 'key' },
		amount: { type: 'range' },
		fee: { type: 'range' },
		timestamp: { type: 'range' },
		unixTimestamp: { type: 'range' },
		blockId: { type: 'key' },
		height: { type: 'range' },
	},
	purge: {
		interval: 3600, // seconds
		maxItems: 202,
		purgeBy: 'height',
	},
};
