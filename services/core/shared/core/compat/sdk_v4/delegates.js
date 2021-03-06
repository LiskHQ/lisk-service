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
const { Utils } = require('lisk-service-framework');
const coreApi = require('./coreApi');

const ObjectUtilService = Utils.Data;

const { isProperObject } = ObjectUtilService;

const getDelegates = async params => {
	const delegates = {
		data: [],
		meta: {},
	};

	const punishmentHeight = 780000;
	const response = await coreApi.getDelegates(params);
	if (response.data) delegates.data = response.data;
	if (response.meta) delegates.meta = response.meta;

	delegates.data.map((delegate) => {
		delegate.account = {
			address: delegate.address,
			publicKey: delegate.publicKey,
		};

		const adder = (acc, curr) => BigInt(acc) + BigInt(curr.amount);
		const totalVotes = delegate.votes.reduce(adder, BigInt(0));
		const selfVote = delegate.votes.find(vote => vote.delegateAddress === delegate.address);
		const selfVoteAmount = selfVote ? BigInt(selfVote.amount) : BigInt(0);
		const cap = selfVoteAmount * BigInt(10);

		delegate.totalVotesReceived = BigInt(delegate.totalVotesReceived);
		const voteWeight = BigInt(totalVotes) > cap ? cap : delegate.totalVotesReceived;
		delegate.delegateWeight = voteWeight;
		delegate.vote = delegate.delegateWeight;
		delegate.isBanned = delegate.delegate.isBanned;
		delegate.pomHeights = delegate.delegate.pomHeights
			.sort((a, b) => b - a).slice(0, 5)
			.map(height => ({ start: height, end: height + punishmentHeight }));
		delegate.lastForgedHeight = delegate.delegate.lastForgedHeight;
		delegate.consecutiveMissedBlocks = delegate.delegate.consecutiveMissedBlocks;

		return delegate;
	});

	return delegates;
};

const getNextForgers = async params => {
	const result = await coreApi.getNextForgers(params);
	return isProperObject(result) && Array.isArray(result.data) ? result : [];
};


module.exports = {
	getDelegates,
	getNextForgers,
};
