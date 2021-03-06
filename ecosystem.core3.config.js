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
	apps: [
		{
			name: 'lisk-service-gateway',
			script: 'app.js',
			cwd: './services/gateway',
			pid_file: './pids/service_gateway.pid',
			out_file: './logs/service_gateway.log',
			error_file: './logs/service_gateway.err',
			log_date_format: 'YYYY-MM-DD HH:mm:ss SSS',
			watch: false,
			kill_timeout: 10000,
			max_memory_restart: '512M',
			instances: 1,
			autorestart: true,
			env: {
				PORT: '9901',

				// --- Remember to set the properties below
				// SERVICE_BROKER: 'redis://localhost:6379/0',
			},
		},
		{
			name: 'lisk-service-core',
			script: 'app.js',
			cwd: './services/core',
			pid_file: './pids/service_core.pid',
			out_file: './logs/service_core.log',
			error_file: './logs/service_core.err',
			log_date_format: 'YYYY-MM-DD HH:mm:ss SSS',
			watch: false,
			kill_timeout: 10000,
			max_memory_restart: '512M',
			instances: 1,
			autorestart: true,
			env: {
				// --- Remember to set the properties below
				// SERVICE_BROKER: 'redis://localhost:6379/0',
				// LISK_CORE_WS: 'ws://localhost:4002',
				// SERVICE_CORE_REDIS: 'redis://localhost:6379/1',
				// SERVICE_CORE_MYSQL: 'mysql://root@localhost:3306/sdk_v5_betanet',
				LISK_STATIC: 'https://static-data.lisk.io',
				GEOIP_JSON: 'https://geoip.lisk.io/json',
				ENABLE_TRANSACTION_STATS: 'true',
				TRANSACTION_STATS_HISTORY_LENGTH_DAYS: '40',
				TRANSACTION_STATS_UPDATE_INTERVAL: '3600',
				INDEX_N_BLOCKS: '12000',
				ENABLE_FEE_ESTIMATOR_QUICK: 'false',
				ENABLE_FEE_ESTIMATOR_FULL: 'false',
				FEE_EST_COLD_START_BATCH_SIZE: '1',
				FEE_EST_DEFAULT_START_BLOCK_HEIGHT: '1',
			},
		},
	],
};
