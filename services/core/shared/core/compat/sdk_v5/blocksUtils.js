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
const fs = require('fs');
const https = require('https');
const path = require('path');
const tar = require('tar');

const {
	Logger,
	HTTP: { request },
} = require('lisk-service-framework');

const config = require('../../../../config');

const logger = Logger();

const genesisBlockURL = config.endpoints.genesisBlock;

const genesisBlockFilePath = './shared/core/compat/sdk_v5/static/genesis_block.json';

let genesisBlockId;

const setGenesisBlockId = (id) => genesisBlockId = id;

const getGenesisBlockId = () => genesisBlockId;

const downloadGenesisBlock = async () => {
	const directoryPath = path.dirname(genesisBlockFilePath);
	if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath);

	logger.info(`Downloading the genesis block to the filesystem from: ${genesisBlockURL}`);

	return new Promise((resolve, reject) => {
		if (genesisBlockURL.endsWith('.tar.gz')) {
			https.get(genesisBlockURL, (response) => {
				response.pipe(tar.extract({ cwd: directoryPath }));
				response.on('error', async (err) => reject(err));
				response.on('end', async () => setTimeout(resolve, 500));
			});
		} else {
			request(genesisBlockURL)
				.then(async response => {
					const genesisBlock = typeof response === 'string' ? JSON.parse(response).data : response.data;
					fs.writeFileSync(genesisBlockFilePath, JSON.stringify(genesisBlock));
					resolve();
				})
				.catch(err => reject(err));
		}
	});
};

const getGenesisBlockFromFS = async () => {
	if (!fs.existsSync(genesisBlockFilePath)) await downloadGenesisBlock();

	const genesisBlock = await new Promise((resolve, reject) => {
		fs.readFile(genesisBlockFilePath, (err, data) => {
			if (err) {
				logger.error(err);
				return reject(err);
			}
			const parsedGenesisBlock = JSON.parse(data.toString());
			return resolve(parsedGenesisBlock);
		});
	});

	if (!getGenesisBlockId()) setGenesisBlockId(genesisBlock.header.id);
	return genesisBlock;
};

module.exports = {
	getGenesisBlockId,
	getGenesisBlockFromFS,
};
