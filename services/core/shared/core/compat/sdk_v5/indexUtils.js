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
const fs = require('fs');
const https = require('https');
const path = require('path');
const tar = require('tar');

const {
	CacheRedis,
	Logger,
	Exceptions: { NotFoundException },
} = require('lisk-service-framework');

const {
	exists,
	mkdir,
} = require('../../../fsUtils');

const config = require('../../../../config');

const logger = Logger();

let readStream;
let indexSnapshotUrl;
let indexSnapshotFilePath;

const constantsCache = CacheRedis('networkConstants', config.endpoints.redis);

// const parseStream = json.createParseStream();

const downloadSnapshot = async () => {
	const directoryPath = path.dirname(indexSnapshotFilePath);
	if (!(await exists(directoryPath))) await mkdir(directoryPath, { recursive: true });

	return new Promise((resolve, reject) => {
		https.get(indexSnapshotUrl, (response) => {
			if (response.statusCode === 200) {
				response.pipe(tar.extract({ cwd: directoryPath }));
				response.on('error', async (err) => reject(err));
				response.on('end', async () => {
					logger.info('Snapshot downloaded successfully');
					return setTimeout(resolve, 500);
				});
			} else {
				const errMessage = `Download failed with HTTP status code: ${response.statusCode} (${response.statusMessage})`;
				logger.error(errMessage);
				if (response.statusCode === 404) throw new NotFoundException(errMessage);
				throw new Error(errMessage);
			}
		});
	});
};

const initSnapshot = async () => {
	const { data: { networkIdentifier } } = JSON.parse(await constantsCache.get('networkConstants'));

	const [networkConfig] = config.networks.filter(c => networkIdentifier === c.identifier);
	if (networkConfig) {
		indexSnapshotUrl = networkConfig.indexSnapshotUrl;
		indexSnapshotFilePath = `./data/${networkIdentifier}/blockchainIndex.json`;
	} else {
		logger.info(`Network is neither defined in the config, nor in the environment variable (${networkIdentifier})`);
		return;
	}

	if (!(await exists(indexSnapshotFilePath))) {
		await downloadSnapshot();
		readStream = fs.createReadStream(indexSnapshotFilePath);
	}
};

module.exports = {
	initSnapshot,
};
