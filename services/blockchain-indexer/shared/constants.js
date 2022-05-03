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
const blockchainStore = require('./database/blockchainStore');
const { requestConnector } = require('./utils/request');

const setGenesisHeight = (height) => blockchainStore.set('genesisHeight', height);
const getGenesisHeight = () => blockchainStore.get('genesisHeight');

let genesisConfig;
let registeredModules;

const getFinalizedHeight = async () => {
	const { finalizedHeight } = await requestConnector('getNodeInfo');
	return finalizedHeight;
};

const updateGenesisHeight = async () => {
	const genesisHeight = await requestConnector('getGenesisHeight');
	await setGenesisHeight(genesisHeight);
};

const getCurrentHeight = async () => {
	const currentHeight = (await requestConnector('getNodeInfo')).height;
	return currentHeight;
};

const getGenesisConfig = async () => {
	if (!genesisConfig) genesisConfig = (await requestConnector('getNodeInfo')).genesisConfig;
	return genesisConfig;
};

const resolveModuleCommands = (data) => {
	let result = [];
	data.forEach(liskModule => {
		if (liskModule.commands.length) {
			result = result.concat(
				liskModule.commands.map(command => {
					const id = String(liskModule.id).concat(':').concat(command.id);
					if (liskModule.name && command.name) {
						const name = liskModule.name.concat(':').concat(command.name);
						return { id, name };
					}
					return { id };
				}),
			);
		}
	});
	return result;
};

const getAvailableModuleCommands = async () => {
	if (!registeredModules) {
		const response = await requestConnector('getRegisteredModules', {});
		registeredModules = resolveModuleCommands(response);
	}
	return registeredModules;
};

module.exports = {
	getFinalizedHeight,
	getCurrentHeight,
	getGenesisConfig,
	getGenesisHeight,
	updateGenesisHeight,
	getAvailableModuleCommands,
};
