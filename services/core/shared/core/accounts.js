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
const BluebirdPromise = require('bluebird');

const coreApi = require('./compat');
const { getDelegates } = require('./delegates');
const { parseToJSONCompatObj } = require('../jsonTools');
const { getAccountKnowledge } = require('../knownAccounts');

const getAccounts = async params => {
	const accounts = {
		data: [],
		meta: {},
	};
	const { status, ...remainingParams } = params;
	let response = await coreApi.getAccounts(remainingParams);
	if (status && ['active', 'banned', 'punished', 'standby'].some(item => status.includes(item))) {
		// Include delegate info in all accounts requests unless explicitly stated
		response = params.isDelegate !== false ? await getDelegates(params) : { data: [] };
	}
	if (response.data) accounts.data = response.data;
	if (response.meta) accounts.meta = response.meta;

	accounts.data = await BluebirdPromise.map(
		accounts.data,
		async account => {
			account.multisignatureGroups = await coreApi.getMultisignatureGroups(account);
			account.incomingTxsCount = await coreApi.getIncomingTxsCount(account.address);
			account.outgoingTxsCount = await coreApi.getOutgoingTxsCount(account.address);
			account.multisignatureMemberships = await coreApi.getMultisignatureMemberships(account);
			account.knowledge = await getAccountKnowledge(account.address);

			if (account.isDelegate === true) {
				const delegate = await getDelegates({ address: account.address });
				const delegateOrigProps = account.delegate;
				const [delegateExtraProps = {}] = delegate.data;
				const delegateAccount = {
					...account,
					rank: delegateExtraProps.rank,
					delegate: { ...delegateOrigProps, ...delegateExtraProps },
				};
				return delegateAccount;
			}
			const {
				delegate, approval, missedBlocks, producedBlocks, productivity,
				rank, rewards, username, vote, isBanned, status: _status, pomHeights,
				lastForgedHeight, consecutiveMissedBlocks,
				...nonDelegateAccount
			} = account;
			return nonDelegateAccount;
		},
		{ concurrency: accounts.data.length },
	);

	return parseToJSONCompatObj(accounts);
};

module.exports = {
	getAccounts,
};
