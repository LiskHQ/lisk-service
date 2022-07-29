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
const BluebirdPromise = require('bluebird');

const { initDatabase } = require('./database/index');
const { downloadRepositoryToFS } = require('./utils/downloadRepository');

const { getDirectories } = require('./utils/fsUtils');

const indexBlockchainMetadata = async () => {
	const localRepoPath = './data/repo';
	const allAvailableDir = await getDirectories(localRepoPath);

	await BluebirdPromise.map(
		allAvailableDir,
		dir => {
			// Placeholder for indexing
		},
		{ concurrency: allAvailableDir.length },
	);
};

const init = async () => {
	await initDatabase();
	await downloadRepositoryToFS();
	await indexBlockchainMetadata();
};

module.exports = {
	init,
};
