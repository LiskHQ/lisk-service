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
const { Signals } = require('lisk-service-framework');

const {
	getLastBlock,
	getBlockByID,
	getBlocksByIDs,
	getBlockByHeight,
	getBlocksByHeightBetween,
} = require('./blocks');

const {
	getTransactionByID,
	getTransactionsByIDs,
	getTransactionsFromPool,
	postTransaction,
	dryRunTransaction,
} = require('./transactions');

const {
	getGenesisHeight,
	getGenesisBlockID,
	getGenesisBlock,
	getGenesisConfig,
} = require('./genesisBlock');

const {
	getGenerators,
	getForgingStatus,
	updateForgingStatus,
	invokeEndpointProxy,
	getSchemas,
	getRegisteredActions,
	getRegisteredEvents,
	getRegisteredModules,
	getNodeInfo,
	getSystemMetadata,
} = require('./endpoints');

const {
	getPeers,
	getConnectedPeers,
	getDisconnectedPeers,
	getPeersStatistics,
} = require('./peers');

const {
	getTokenBalance,
	getTokenBalances,
	getEscrowedAmounts,
	getSupportedTokens,
	getTotalSupply,
} = require('./tokens');

const {
	getDelegate,
	getAllDelegates,
	getDPoSConstants,
	getVoter,
} = require('./dpos');
const { getAuthAccount } = require('./auth');
const { getValidator, validateBLSKey } = require('./validators');
const { getLegacyAccount } = require('./legacy');
const { getEventsByHeight } = require('./events');
const { refreshNetworkStatus, getNetworkStatus } = require('./network');
const { setSchemas, setMetadata } = require('./schema');

const {
	getFeeConstants,
	refreshFeeConstants,
} = require('./fee');

const init = async () => {
	await refreshNetworkStatus();

	// Cache all the schemas
	setSchemas(await getSchemas());
	setMetadata(await getSystemMetadata());

	// Download the genesis block, if applicable
	await getGenesisBlock();

	await refreshFeeConstants();

	// Register listener to update the nodeInfo cache only when it updates
	const updateNodeInfoCacheListener = getNodeInfo.bind(null, true);
	Signals.get('chainNewBlock').add(updateNodeInfoCacheListener);
	Signals.get('chainDeleteBlock').add(updateNodeInfoCacheListener);
};

module.exports = {
	init,

	getLastBlock,
	getBlockByID,
	getBlocksByIDs,
	getBlockByHeight,
	getBlocksByHeightBetween,

	getEventsByHeight,

	getTransactionByID,
	getTransactionsByIDs,
	getTransactionsFromPool,
	postTransaction,
	dryRunTransaction,

	getFeeConstants,

	getGenesisHeight,
	getGenesisBlockID,
	getGenesisBlock,
	getGenesisConfig,

	getGenerators,
	getForgingStatus,
	updateForgingStatus,

	getNetworkStatus,

	invokeEndpointProxy,
	getSchemas,
	getRegisteredActions,
	getRegisteredEvents,
	getRegisteredModules,
	getNodeInfo,
	getSystemMetadata,

	getPeers,
	getConnectedPeers,
	getDisconnectedPeers,
	getPeersStatistics,

	getTokenBalance,
	getTokenBalances,
	getEscrowedAmounts,
	getSupportedTokens,
	getTotalSupply,

	getDelegate,
	getAllDelegates,
	getDPoSConstants,
	getVoter,

	getAuthAccount,

	getValidator,
	validateBLSKey,

	getLegacyAccount,
};
