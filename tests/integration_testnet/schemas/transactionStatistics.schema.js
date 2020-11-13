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

export const timelineItemSchema = {
	timestamp: Joi.number().required(),
	date: Joi.string().required(),
	transactionCount: Joi.number().required(),
	volume: Joi.number().required(),
};

const transactionStatisticsSchema = {
	timeline: Joi.array().items(timelineItemSchema).required(),
	distributionByType: Joi.object().required(),
	distributionByAmount: Joi.object().required(),
};

export const metaSchema = {
	limit: Joi.number().required(),
	offset: Joi.number().required(),
	dateFormat: Joi.string().required(),
	dateFrom: Joi.string().required(),
	dateTo: Joi.string().required(),
};

module.exports = {
	transactionStatisticsSchema: Joi.object(transactionStatisticsSchema),
	metaSchema: Joi.object(metaSchema),
};
