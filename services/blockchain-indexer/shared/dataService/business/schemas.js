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
const { requestConnector } = require('../../utils/request');

let allSchemasCache;

const getSchemasFromCore = async () => {
	const systemMetadata = await requestConnector('getSystemMetadata');
	const schema = await requestConnector('getSchema');
	return { schema, systemMetadata };
};

const getAllSchemasFromCache = async () => {
	if (!allSchemasCache) {
		allSchemasCache = await getSchemasFromCore();
	}
	return allSchemasCache;
};

const getSchemasFromSystemMetadata = async (systemMetadata) => {
	const allCommandsParamsSchemas = [];
	const assetsSchemas = [];
	const eventsSchemas = [];

	systemMetadata.modules.forEach(module => {
		module.events.forEach(event => {
			const formattedEvents = {};
			formattedEvents.module = module.name;
			formattedEvents.name = event.name;
			formattedEvents.schema = event.data;
			eventsSchemas.push(formattedEvents);
		});

		module.assets.forEach(asset => {
			const formattedAssets = {};
			formattedAssets.module = module.name;
			formattedAssets.version = asset.version;
			formattedAssets.schema = asset.data;
			assetsSchemas.push(formattedAssets);
		});

		module.commands.forEach(command => {
			const formattedTxParams = {};
			formattedTxParams.moduleCommand = String(module.name).concat(':').concat(command.name);
			formattedTxParams.schema = command.params;
			allCommandsParamsSchemas.push(formattedTxParams);
		});
	});

	return { allCommandsParamsSchemas, assetsSchemas, eventsSchemas };
};

const getSchemas = async () => {
	const schemas = {
		data: {},
		meta: {},
	};

	const allSchemas = await getAllSchemasFromCache();
	const systemMetadataSchemas = await getSchemasFromSystemMetadata(allSchemas.systemMetadata);

	schemas.data = allSchemas.schema;
	schemas.data.assets = systemMetadataSchemas.assetsSchemas;
	schemas.data.commands = systemMetadataSchemas.allCommandsParamsSchemas;
	schemas.data.events = systemMetadataSchemas.eventsSchemas;

	return schemas;
};

module.exports = {
	getSchemas,
};
