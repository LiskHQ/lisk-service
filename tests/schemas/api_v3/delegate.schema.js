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
import Joi from 'joi';

const regex = require('./regex');

const DELEGATE_STATUSES = [
	'active',
	'standby',
	'punished',
	'banned',
	'ineligible',
];

const punishmentPeriodSchema = {
	start: Joi.number().integer().positive().required(),
	end: Joi.number().integer().positive().required(),
};

const delegateSchema = {
	name: Joi.string().pattern(regex.NAME).required(),
	totalVotesReceived: Joi.string().min(0).required(),
	selfVotes: Joi.string().min(0).required(),
	voteWeight: Joi.string().pattern(regex.VOTE_WEIGHT).required(),
	address: Joi.string().pattern(regex.ADDRESS_LISK32).required(),
	lastGeneratedHeight: Joi.number().integer().min(0).required(),
	status: Joi.string().valid(...DELEGATE_STATUSES).required(),
	isBanned: Joi.boolean().required(),
	pomHeights: Joi.array().items(Joi.number().integer().positive().required()).min(0).required(),
	punishmentPeriods: Joi.array().items(punishmentPeriodSchema).min(0).required(),
	consecutiveMissedBlocks: Joi.number().integer().min(0).required(),
	generatedBlocks: Joi.number().integer().min(0).required(),
	rank: Joi.number().integer().min(1).required(),
	rewards: Joi.string().pattern(regex.DIGITS).allow(regex.EMPTY_STRING).required(),
};

module.exports = {
	delegateSchema: Joi.object(delegateSchema),
};