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
const path = require('path');
const {
	Microservice,
	Logger,
	LoggerConfig,
} = require('lisk-service-framework');

const config = require('./config');
const packageJson = require('./package.json');
const { setAppContext } = require('./shared/utils/request');
const Signals = require('./shared/signals');

const loggerConf = {
	...config.log,
	name: packageJson.name,
	version: packageJson.version,
};

LoggerConfig(loggerConf);

const logger = Logger();

const app = Microservice({
	name: 'coordinator',
	transporter: config.transporter,
	brokerTimeout: config.brokerTimeout, // in seconds
	logger: loggerConf,
});

const coordinatorConfig = {
	name: 'coordinator',
	events: {
		appBlockNew: async (payload) => Signals.get('newBlock').dispatch(payload),
		appBlockDelete: async (payload) => Signals.get('deleteBlock').dispatch(payload),
		appChainValidatorsChange: async (payload) => Signals.get('newRound').dispatch(payload),
	},
};

setAppContext(app);
const broker = app.getBroker();

(async () => {
	// Add routes, events & jobs
	await app.addJobs(path.join(__dirname, 'jobs'));

	// Run the application
	broker.createService(coordinatorConfig);
	broker.start().then(async () => {
		const { init } = require('./shared/scheduler');
		logger.info(`Service started ${packageJson.name}`);

		await init();
	}).catch(err => {
		logger.fatal(`Could not start the service ${packageJson.name} + ${err.message}`);
		logger.fatal(err.stack);
		process.exit(1);
	});
})();
