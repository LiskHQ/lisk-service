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
const core = require('./compat');

const {
	performLastBlockUpdate,
	getBlocks,
	deleteBlock,
} = require('./blocks');

const {
	reloadNextForgersCache,
	reloadDelegateCache,
	getNextForgers,
} = require('./delegates');

const {
	calculateEstimateFeeByteNormal,
	calculateEstimateFeeByteQuick,
} = require('./dynamicFees');

const config = require('../../config.js');

const logger = Logger();

const events = {
	newBlock: async (newBlock) => {
		logger.debug(`New block arrived: ${newBlock.id} at height ${newBlock.height}`);
		performLastBlockUpdate(newBlock);

		logger.debug(`============== Dispatching block to index: ${newBlock.id} at height ${newBlock.height} ==============`);
		const response = await getBlocks({ limit: 1 });
		logger.debug(`============== 'newBlock' signal: ${Signals.get('newBlock')} ==============`);
		Signals.get('newBlock').dispatch(response);
	},
	deleteBlock: async (block) => {
		await deleteBlock(block);
		logger.debug(`============== 'deleteBlock' signal: ${Signals.get('deleteBlock')} ==============`);
		Signals.get('deleteBlock').dispatch(block);
	},
	newRound: async () => {
		await reloadDelegateCache();
		await reloadNextForgersCache();
		const limit = core.getSDKVersion() >= 4 ? 103 : 101;
		const nextForgers = await getNextForgers({ limit, offset: 0 });
		const response = { nextForgers: nextForgers.data.map(forger => forger.address) };
		logger.debug(`============== 'newRound' signal: ${Signals.get('newRound')} ==============`);
		Signals.get('newRound').dispatch(response);
	},
	calculateFeeEstimate: async () => {
		if (core.getSDKVersion() >= 4) {
			if (config.feeEstimates.fullAlgorithmEnabled) {
				logger.debug('Initiate the dynamic fee estimates computation (full computation)');
				calculateEstimateFeeByteNormal();
			}
			if (config.feeEstimates.quickAlgorithmEnabled) {
				logger.debug('Initiate the dynamic fee estimates computation (quick algorithm)');
				const feeEstimate = await calculateEstimateFeeByteQuick();

				// TODO: Make a better control over the estimate process
				logger.debug(`============== 'newFeeEstimate' signal: ${Signals.get('newFeeEstimate')} ==============`);
				Signals.get('newFeeEstimate').dispatch(feeEstimate);
			}
		}
	},
};

const init = () => {
	core.events.register(events);
	Object.keys(events).forEach((eventName) => Signals.get(eventName));
};

init();

// Re-subscribe to the events whenever a new client is instantiated
Signals.get('newApiClient').add(() => { init(); });

module.exports = { init };
