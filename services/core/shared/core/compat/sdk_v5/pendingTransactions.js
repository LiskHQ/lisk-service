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
const {
	Logger,
	Exceptions: { ValidationException, NotFoundException },
} = require('lisk-service-framework');

const logger = Logger();

const coreApi = require('./coreApi');
const {
	getIndexedAccountInfo,
} = require('./accounts');
const { getRegisteredModuleAssets } = require('../common');
const { parseToJSONCompatObj } = require('../../../jsonTools');

const availableLiskModuleAssets = getRegisteredModuleAssets();
let pendingTransactionsList = [];

const normalizeTransaction = tx => {
	const [{ id, name }] = availableLiskModuleAssets
		.filter(module => module.id === String(tx.moduleID).concat(':').concat(tx.assetID));
	tx = parseToJSONCompatObj(tx);
	tx.moduleAssetId = id;
	tx.moduleAssetName = name;
	return tx;
};

const getPendingTransactionsFromCore = async () => {
	const response = await coreApi.getPendingTransactions();
	let pendingTx = response.data.map(tx => normalizeTransaction(tx));
	pendingTx = await BluebirdPromise.map(
		pendingTx,
		async transaction => {
			const account = await getIndexedAccountInfo({ publicKey: transaction.senderPublicKey });
			transaction.senderId = account && account.address ? account.address : undefined;
			transaction.username = account && account.username ? account.username : undefined;
			transaction.isPending = true;
			return transaction;
		},
		{ concurrency: pendingTx.length },
	);
	return pendingTx;
};

const loadAllPendingTransactions = async () => {
	pendingTransactionsList = await getPendingTransactionsFromCore();
	logger.info(`Initialized/Updated pending transactions cache with ${pendingTransactionsList.length} transactions.`);
};

const validateParams = async params => {
	const requestParams = {};
	if (params.nonce && !(params.senderAddress || params.senderPublicKey)) {
		throw new ValidationException('Nonce based retrieval is only possible along with senderAddress or senderPublicKey');
	}

	if (params.username) {
		const accountInfo = await getIndexedAccountInfo({ username: params.username });
		if (!accountInfo || accountInfo.address === undefined) return new NotFoundException(`Account with username: ${params.username} does not exist`);
		requestParams.senderPublicKey = accountInfo.publicKey;
	}

	if (params.senderIdOrRecipientId) {
		requestParams.senderId = params.senderIdOrRecipientId;
		requestParams.recipientId = params.senderIdOrRecipientId;
	}

	if (params.senderId) {
		const account = await getIndexedAccountInfo({ address: params.senderId });
		requestParams.senderPublicKey = account.publicKey;
	}

	if (params.amount && params.amount.includes(':')) {
		const minAmount = params.amount.split(':')[0];
		const maxAmount = params.amount.split(':')[1];
		requestParams.minAmount = Number(minAmount);
		requestParams.maxAmount = Number(maxAmount);
	}
	return requestParams;
};

const getPendingTransactions = async params => {
	const pendingTransactions = {
		data: [],
		meta: {},
	};

	const offset = Number(params.offset) || 0;
	const limit = Number(params.limit) || 10;

	const requestParams = await validateParams(params);
	const sortComparator = (sortParam) => {
		const sortProp = sortParam.split(':')[0];
		const sortOrder = sortParam.split(':')[1];

		const comparator = (a, b) => (sortOrder === 'asc')
			? Number(a[sortProp]) - Number(b[sortProp])
			: Number(b[sortProp]) - Number(a[sortProp]);
		return comparator;
	};

	if (pendingTransactionsList.length) {
		const filteredPendingTxs = pendingTransactionsList.filter(transaction => (
			(!requestParams.senderPublicKey
				|| transaction.senderPublicKey === requestParams.senderPublicKey)
			&& (!requestParams.recipientId
				|| transaction.asset.recipientAddress === requestParams.recipientId)
			&& (!requestParams.moduleAssetId
				|| transaction.amoduleAssetId === requestParams.moduleAssetId)
			&& (!requestParams.moduleAssetName
				|| transaction.moduleAssetName === requestParams.moduleAssetName)
			&& (!requestParams.data
				|| transaction.asset.data.includes(requestParams.data))
			&& (!requestParams.data
				|| transaction.asset.data.includes(requestParams.data))
			&& (!requestParams.from
				|| Number(transaction.amount) >= requestParams.minAmount)
			&& (!requestParams.to
				|| Number(transaction.amount) <= requestParams.maxAmount)
		));
		pendingTransactions.data = filteredPendingTxs
			.sort(sortComparator(params.sort))
			.slice(offset, offset + limit);

		pendingTransactions.meta = {
			count: pendingTransactions.data.length,
			offset,
			total: filteredPendingTxs.length,
		};
	}
	return pendingTransactions;
};

module.exports = {
	getPendingTransactions,
	loadAllPendingTransactions,
};
