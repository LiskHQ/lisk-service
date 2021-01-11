/*
 * LiskHQ/lisk-service
 * Copyright © 2020 Lisk Foundation
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
const coreApi = require('./coreApi');


const normalizeTransaction = tx => {
	tx.id = tx.id.toString('hex');
	tx.senderPublicKey = tx.senderPublicKey.toString('hex');
	tx.signatures = tx.signatures.map(signature => signature.toString('hex'));
	return tx;
};

const getTransactions = async params => {
	const transactions = {
		data: [],
		meta: {},
	};

	const response = await coreApi.getTransactions(params);
	if (response.data) transactions.data = response.data.map(tx => normalizeTransaction(tx));
    if (response.meta) transactions.meta = response.meta;

    // timestamp logic to transactions
    // transactions.data = await BluebirdPromise.map(
	// 	transactions.data,
	// 	async transaction => {
	// 		if (!transaction.timestamp) {
	// 			const txBlock = (await coreApi.getBlocks({ height: transaction.height })).data[0];
	// 			transaction.timestamp = txBlock.timestamp;
	// 		}
	// 		transaction.unixTimestamp = await getUnixTime(transaction.timestamp);
	// 		return transaction;
	// 	},
	// 	{ concurrency: transactions.data.length },
	// );

	transactions.meta.total = transactions.meta.count;
	transactions.meta.count = transactions.data.length;
	transactions.meta.offset = params.offset || 0;

	return transactions;
};

module.exports = { getTransactions };
