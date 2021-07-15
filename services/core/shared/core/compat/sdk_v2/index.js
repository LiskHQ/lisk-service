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
const { Logger, Signals } = require('lisk-service-framework');

const coreApi = require('./coreApi');

const { request } = require('./request');
const {
	getBlocks,
	getGenesisHeight,
} = require('./blocks');

const {
	getTransactions,
	getTransactionsByBlockId,
} = require('./transactions');

const {
	getAccounts,
	getMultisignatureGroups,
	getMultisignatureMemberships,
} = require('./accounts');

const {
	getDelegates,
	getNextForgers,
} = require('./delegates');

const { getVotes } = require('./votes');
const { getVoters } = require('./voters');
const { getNetworkStatus } = require('./network');

const {
	getIncomingTxsCount,
	getOutgoingTxsCount,
} = require('./transactionUtils');

const events = require('./events');

const logger = Logger();

const numOfActiveDelegates = 101;

const peerStates = {
	UNKNOWN: 0,
	DISCONNECTED: 1,
	CONNECTED: 2,
};

// Utils & helpers
const isStringType = value => typeof value === 'string';

const parseAddress = address => isStringType(address) ? address.toUpperCase() : '';

const validateAddress = address => isStringType(address) && address.match(/^[0-9]{1,20}[L|l]$/g);

// Lisk Core API functions
const getForgingStats = async address => {
	if (!validateAddress(address)) throw new Error('Missing/Invalid address');
	try {
		const result = await coreApi.getForgingStats(parseAddress(address));
		return { ...result.data, ...result.meta };
	} catch (e) {
		return {};
	}
};

const init = () => {
	logger.debug(`============== 'blockIndexReady' signal: ${Signals.get('blockIndexReady')} ==============`);
	Signals.get('blockIndexReady').dispatch(true);
};

const nop = () => { };
const updateFinalizedHeight = () => null;

module.exports = {
	...require('./coreCache'),
	get: request,
	request,
	validateAddress,
	getAccounts,
	getBlocks,
	getGenesisHeight,
	getIndexStartHeight: nop,
	deleteBlock: nop,
	indexMissingBlocks: nop,
	getMultisignatureGroups,
	getMultisignatureMemberships,
	getVotes,
	getVoters,
	getDelegates,
	getForgingStats,
	getNextForgers,
	getNetworkStatus,
	getTransactions,
	getTransactionsByBlockId,
	getPeers: coreApi.getPeers,
	numOfActiveDelegates,
	peerStates,
	EMAcalc: nop,
	getEstimateFeeByte: nop,
	getEstimateFeeByteCoreLogic: nop,
	getTransactionInstanceByType: nop,
	calculateBlockSize: nop,
	calculateFeePerByte: nop,
	calcAvgFeeByteModes: nop,
	calculateAvgFeePerByte: nop,
	calculateWeightedAvg: nop,
	updateFinalizedHeight,
	getPendingTransactions: nop,
	loadAllPendingTransactions: nop,
	postTransactions: nop,
	getTransactionsSchemas: nop,
	events,
	init,
	getIncomingTxsCount,
	getOutgoingTxsCount,
};
