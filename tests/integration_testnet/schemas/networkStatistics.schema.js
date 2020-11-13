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
import Joi from 'joi';

const basicNetworkStatisticsSchema = {
	connectedPeers: Joi.number().required(),
	disconnectedPeers: Joi.number().required(),
	totalPeers: Joi.number().required(),
};

const networkStatisticsSchema = {
	basic: Joi.object(basicNetworkStatisticsSchema).required(),
	height: Joi.object().required(), // TODO: Check if generic "string: number" validation possible?
	coreVer: Joi.object().required(),
	os: Joi.object().required(),
};

module.exports = {
	networkStatisticsSchema: Joi.object(networkStatisticsSchema),
};
