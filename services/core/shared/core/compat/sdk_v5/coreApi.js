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
const {
	Logger,
	Exceptions: { TimeoutException },
} = require('lisk-service-framework');

const {
	getGenesisBlockId,
	getGenesisBlockFromFS,
} = require('./blocksUtils');
const { getApiClient } = require('../common/wsRequest');

const { genesisHeight } = require('../../../../config');

const logger = Logger();
const timeoutMessage = 'Response not received in';

const getNetworkStatus = async () => {
	try {
		const apiClient = await getApiClient();
		const result = await apiClient.node.getNodeInfo();
		return { data: result };
	} catch (err) {
		if (err.message.includes(timeoutMessage)) {
			await getApiClient();
			throw new TimeoutException('Request timed out when calling \'getNetworkStatus\'');
		}
		throw err;
	}
};

const getBlockByID = async id => {
	try {
		const apiClient = await getApiClient();
		const block = await apiClient.block.get(id);
		return { data: [block] };
	} catch (err) {
		if (err.message.includes(timeoutMessage)) {
			await getApiClient();
			// File based Genesis block handling
			if (id === getGenesisBlockId()) return { data: [await getGenesisBlockFromFS()] };
			throw new TimeoutException(`Request timed out when calling 'getBlocksByID' for ID: ${id}`);
		}
		throw err;
	}
};

const getBlocksByIDs = async ids => {
	try {
		const apiClient = await getApiClient();
		const encodedBlocks = await apiClient._channel.invoke('app:getBlocksByIDs', { ids });
		const blocks = encodedBlocks.map(blk => apiClient.block.decode(Buffer.from(blk, 'hex')));
		return { data: blocks };
	} catch (err) {
		if (err.message.includes(timeoutMessage)) {
			await getApiClient();
			const genesisBlockId = getGenesisBlockId();
			// File based Genesis block handling
			if (ids.includes(genesisBlockId)) {
				const remainingIds = ids.filter(id => id !== genesisBlockId);
				const genesisBlockResult = await getBlockByID(genesisBlockId);
				if (remainingIds.length) {
					const { data: [genesisBlock] } = genesisBlockResult;
					const { data: [...remainingBlocks] } = await getBlocksByIDs(remainingIds);
					return { data: [genesisBlock, ...remainingBlocks] };
				}
				return genesisBlockResult;
			}
			throw new TimeoutException(`Request timed out when calling 'getBlocksByIDs' for IDs: ${ids}`);
		}
		throw err;
	}
};

const getBlockByHeight = async height => {
	try {
		const apiClient = await getApiClient();
		const block = await apiClient.block.getByHeight(height);
		return { data: [block] };
	} catch (err) {
		if (err.message.includes(timeoutMessage)) {
			await getApiClient();
			// File based Genesis block handling
			// eslint-disable-next-line max-len
			if (Number(height) === Number(genesisHeight)) return { data: [await getGenesisBlockFromFS()] };
			throw new TimeoutException(`Request timed out when calling 'getBlockByHeight' for height: ${height}`);
		}
		throw err;
	}
};

const getBlocksByHeightBetween = async (from, to) => {
	try {
		const apiClient = await getApiClient();
		const encodedBlocks = await apiClient._channel.invoke('app:getBlocksByHeightBetween', { from, to });
		const blocks = encodedBlocks.map(blk => apiClient.block.decode(Buffer.from(blk, 'hex')));
		return { data: blocks };
	} catch (err) {
		if (err.message.includes(timeoutMessage)) {
			await getApiClient();
			// File based Genesis block handling
			if (Number(from) === Number(genesisHeight)) {
				const genesisBlockResult = await getBlockByHeight(from);
				if (from < to) {
					const { data: [genesisBlock] } = genesisBlockResult;
					const { data: [...remainingBlocks] } = await getBlocksByHeightBetween(from + 1, to);
					return { data: [genesisBlock, ...remainingBlocks] };
				}
				return genesisBlockResult;
			}
			throw new TimeoutException(`Request timed out when calling 'getBlocksByHeightBetween' for heights: ${from} - ${to}`);
		}
		throw err;
	}
};

const getLastBlock = async () => {
	try {
		const apiClient = await getApiClient();
		const encodedBlock = await apiClient._channel.invoke('app:getLastBlock');
		const block = apiClient.block.decode(Buffer.from(encodedBlock, 'hex'));
		return { data: [block] };
	} catch (err) {
		if (err.message.includes(timeoutMessage)) {
			await getApiClient();
			throw new TimeoutException('Request timed out when calling \'getLastBlock\'');
		}
		throw err;
	}
};

const getTransactionByID = async id => {
	try {
		const apiClient = await getApiClient();
		const transaction = await apiClient.transaction.get(id);
		return { data: [transaction] };
	} catch (err) {
		if (err.message.includes(timeoutMessage)) {
			await getApiClient();
			throw new TimeoutException(`Request timed out when calling 'getTransactionByID' for ID: ${id}`);
		}
		throw err;
	}
};

const getTransactionsByIDs = async ids => {
	try {
		const apiClient = await getApiClient();
		const encodedTransactions = await apiClient._channel.invoke('app:getTransactionsByIDs', { ids });
		const transactions = encodedTransactions.map(tx => apiClient.transaction.decode(Buffer.from(tx, 'hex')));
		return { data: transactions };
	} catch (err) {
		if (err.message.includes(timeoutMessage)) {
			await getApiClient();
			throw new TimeoutException(`Request timed out when calling 'getTransactionsByIDs' for IDs: ${ids}`);
		}
		throw err;
	}
};

const getAccountByAddress = async address => {
	try {
		const apiClient = await getApiClient();
		const account = await apiClient.account.get(address);
		return { data: [account] };
	} catch (err) {
		if (err.message.includes(timeoutMessage)) {
			await getApiClient();
			throw new TimeoutException(`Request timed out when calling 'getAccountByAddress' for address: ${address}`);
		}
		logger.warn(`Unable to currently fetch account information for address: ${address}. The network synchronization process might still be in progress for the Lisk Core node or the requested account has not been migrated yet.`);
		throw new Error('MISSING_ACCOUNT_IN_BLOCKCHAIN');
	}
};

const getAccountsByAddresses = async addresses => {
	try {
		const apiClient = await getApiClient();
		const encodedAccounts = await apiClient._channel.invoke('app:getAccounts', { address: addresses });
		const accounts = encodedAccounts.map(acc => apiClient.account.decode(Buffer.from(acc, 'hex')));
		return { data: accounts };
	} catch (err) {
		if (err.message.includes(timeoutMessage)) {
			await getApiClient();
			throw new TimeoutException(`Request timed out when calling 'getAccountsByAddresses' for addresses: ${addresses}`);
		}
		throw err;
	}
};

const getLegacyAccountInfo = async publicKey => {
	try {
		const apiClient = await getApiClient();
		const legacyAccountInfo = await apiClient._channel.invoke('legacyAccount:getUnregisteredAccount', { publicKey });
		return legacyAccountInfo;
	} catch (err) {
		if (err.message.includes(timeoutMessage)) {
			await getApiClient();
			throw new TimeoutException(`Request timed out when calling 'getLegacyAccountInfo' for publicKey: ${publicKey}`);
		}
		throw err;
	}
};

const getPeers = async (state = 'connected') => {
	try {
		const apiClient = await getApiClient();
		const peers = state === 'connected'
			? await apiClient._channel.invoke('app:getConnectedPeers')
			: await apiClient._channel.invoke('app:getDisconnectedPeers');

		return { data: peers };
	} catch (err) {
		if (err.message.includes(timeoutMessage)) {
			await getApiClient();
			throw new TimeoutException(`Request timed out when calling 'getPeers' for state: ${state}`);
		}
		throw err;
	}
};

const getForgers = async () => {
	try {
		const apiClient = await getApiClient();
		const forgers = await apiClient._channel.invoke('app:getForgers', {});
		return { data: forgers };
	} catch (err) {
		if (err.message.includes(timeoutMessage)) {
			await getApiClient();
			throw new TimeoutException('Request timed out when calling \'getForgers\'');
		}
		throw err;
	}
};

const getPendingTransactions = async () => {
	try {
		const apiClient = await getApiClient();
		let transactions = await apiClient._channel.invoke('app:getTransactionsFromPool', {});
		if (transactions) transactions = transactions.map(tx => apiClient.transaction.decode(Buffer.from(tx, 'hex')));
		return { data: transactions };
	} catch (err) {
		if (err.message.includes(timeoutMessage)) {
			await getApiClient();
			throw new TimeoutException('Request timed out when calling \'getPendingTransactions\'');
		}
		throw err;
	}
};

const postTransaction = async transaction => {
	try {
		const apiClient = await getApiClient();
		const response = await apiClient._channel.invoke('app:postTransaction', { transaction });
		return response;
	} catch (err) {
		if (err.message.includes(timeoutMessage)) {
			await getApiClient();
			throw new TimeoutException(`Request timed out when calling 'postTransaction' with transaction: ${transaction}`);
		}
		throw err;
	}
};

const getTransactionsSchemas = async () => {
	try {
		const apiClient = await getApiClient();
		return apiClient.schemas;
	} catch (err) {
		if (err.message.includes(timeoutMessage)) {
			await getApiClient();
			throw new TimeoutException('Request timed out when calling \'getTransactionsSchemas\'');
		}
		throw err;
	}
};

module.exports = {
	getBlockByID,
	getBlocksByIDs,
	getBlockByHeight,
	getBlocksByHeightBetween,
	getLastBlock,
	getAccountByAddress,
	getAccountsByAddresses,
	getLegacyAccountInfo,
	getNetworkStatus,
	getPeers,
	getForgers,
	getPendingTransactions,
	postTransaction,
	getTransactionsSchemas,
	getTransactionsByIDs,
	getTransactionByID,
};
