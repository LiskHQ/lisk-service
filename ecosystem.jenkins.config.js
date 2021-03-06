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
				SERVICE_BROKER: 'redis://localhost:6379/0',
				STRICT_READINESS_CHECK: true,
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
				SERVICE_BROKER: 'redis://localhost:6379/0',
				LISK_CORE_WS: 'ws://localhost:5001',
				SERVICE_CORE_REDIS: 'redis://localhost:6379/1',
				SERVICE_CORE_MYSQL: 'mysql://lisk:password@localhost:3306/lisk',
				LISK_STATIC: 'https://static-data.lisk.io',
				GEOIP_JSON: 'https://geoip.lisk.io/json',
				ENABLE_TRANSACTION_STATS: 'true',
				TRANSACTION_STATS_HISTORY_LENGTH_DAYS: '40',
				TRANSACTION_STATS_UPDATE_INTERVAL: '3600',
				INDEX_N_BLOCKS: '0',
				ENABLE_FEE_ESTIMATOR_QUICK: 'true',
				ENABLE_FEE_ESTIMATOR_FULL: 'false',
			},
		},
		{
			name: 'lisk-service-market',
			script: 'app.js',
			cwd: './services/market',
			pid_file: './pids/service_market.pid',
			out_file: './logs/service_market.log',
			error_file: './logs/service_market.err',
			log_date_format: 'YYYY-MM-DD HH:mm:ss SSS',
			watch: false,
			kill_timeout: 10000,
			max_memory_restart: '512M',
			instances: 1,
			autorestart: true,
			env: {
				SERVICE_BROKER: 'redis://localhost:6379/0',
			},
		},
	],
};
