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
const transactionsSource = require('../../../sources/version2/transactions');
const envelope = require('../../../sources/version2/mappings/stdEnvelope');
const { transformParams, response, getSwaggerDescription } = require('../../../shared/utils');

module.exports = {
	version: '2.0',
	swaggerApiPath: '/transactions',
	rpcMethod: 'get.transactions',
	tags: ['Transactions'],
	params: {
		transactionId: { optional: true, type: 'string', min: 1, max: 64 },
		moduleAssetId: { optional: true, type: 'string', min: 1, max: 21 },
		moduleAssetName: { optional: true, type: 'string', min: 1 },
		address: { optional: true, type: 'string', min: 38, max: 41, pattern: /^lsk[a-hjkm-z2-9]{38}$/ },
		senderAddress: { optional: true, type: 'string', min: 3, max: 41, pattern: /^lsk[a-hjkm-z2-9]{38}$/ },
		senderPublicKey: { optional: true, type: 'string', min: 64, max: 64, pattern: /^([A-Fa-f0-9]{2}){32}$/ },
		senderUsername: { optional: true, type: 'string', min: 1, max: 20, pattern: /^[a-z0-9!@$&_.]{1,20}$/ },
		recipientAddress: { optional: true, type: 'string', min: 3, max: 41, pattern: /^lsk[a-hjkm-z2-9]{38}$/ },
		recipientPublicKey: { optional: true, type: 'string', min: 64, max: 64, pattern: /^([A-Fa-f0-9]{2}){32}$/ },
		recipientUsername: { optional: true, type: 'string', min: 1, max: 20, pattern: /^[a-z0-9!@$&_.]{1,20}$/ },
		amount: { optional: true, type: 'string', min: 1, pattern: /([0-9]+|[0-9]+:[0-9]+)/ },
		timestamp: { optional: true, type: 'string', min: 1, pattern: /([0-9]+|[0-9]+:[0-9]+)/ },
		nonce: { optional: true, type: 'string', min: 1 },
		blockId: { optional: true, type: 'string', min: 1 },
		height: { optional: true, type: 'string', min: 1 },
		search: { optional: true, type: 'string' },
		data: { optional: true, type: 'string' },
		limit: { optional: true, type: 'number', min: 1, max: 100, default: 10 },
		offset: { optional: true, type: 'number', min: 0, default: 0 },
		includePending: { optional: true, type: 'boolean', default: false },
		sort: {
			optional: true,
			type: 'string',
			min: 1,
			enum: ['amount:asc', 'amount:desc', 'timestamp:asc', 'timestamp:desc'],
			default: 'timestamp:desc',
		},
	},
	get schema() {
		const transactionSchema = {};
		transactionSchema[this.swaggerApiPath] = { get: {} };
		transactionSchema[this.swaggerApiPath].get.tags = this.tags;
		transactionSchema[this.swaggerApiPath].get.summary = 'Requests transactions data';
		transactionSchema[this.swaggerApiPath].get.description = getSwaggerDescription({
			rpcMethod: this.rpcMethod,
			description: 'Returns transactions data',
		});
		transactionSchema[this.swaggerApiPath].get.parameters = transformParams('transactions', this.params);
		transactionSchema[this.swaggerApiPath].get.responses = {
			200: {
				description: 'array of transactions with details',
				schema: {
					$ref: '#/definitions/TransactionsWithEnvelope',
				},
			},
		};
		Object.assign(transactionSchema[this.swaggerApiPath].get.responses, response);
		return transactionSchema;
	},
	source: transactionsSource,
	envelope,
};
