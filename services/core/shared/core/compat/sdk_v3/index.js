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
const { Logger, Signals } = require('lisk-service-framework');

const {
	getBlocks,
	updateFinalizedHeight,
	getFinalizedHeight,
} = require('./blocks');

const {
	getDelegates,
	getNextForgers,
} = require('./delegates');
const { getVotes } = require('./votes');
const { getVoters } = require('./voters');
const events = require('./events');
const { getNetworkStatus } = require('./network');

const logger = Logger();

const init = () => {
	logger.debug(`============== 'blockIndexReady' signal: ${Signals.get('blockIndexReady')} ==============`);
	Signals.get('blockIndexReady').dispatch(true);
};

module.exports = {
	...require('../sdk_v2'),
	getBlocks,
	updateFinalizedHeight,
	getFinalizedHeight,
	getDelegates,
	getNextForgers,
	getVotes,
	getVoters,
	events,
	getNetworkStatus,
	init,
};
