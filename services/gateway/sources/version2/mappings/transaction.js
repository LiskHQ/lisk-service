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
module.exports = {
	id: '=,string',
	moduleAssetId: '=,string',
	moduleAssetName: '=,string',
	fee: '=,string',
	height: '=,number',
	nonce: '=,string',
	block: {
		id: 'blockId,string',
		height: '=,number',
		timestamp: 'unixTimestamp,number',
	},
	sender: {
		address: 'senderId,string',
		publicKey: 'senderPublicKey,string',
		username: '=,string',
	},
	signatures: '=',
	confirmations: '=,number',
	asset: '=',
	relays: '=,number',
	isPending: '=,boolean',
};
