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
const { Logger, CacheRedis } = require('lisk-service-framework');
const BluebirdPromise = require('bluebird');

const config = require('../../config');

const cacheRedisDelegates = CacheRedis('delegates', config.endpoints.redis);

const requestAll = require('../requestAll');
const coreApi = require('./compat');
const { getLastBlock } = require('./blocks');
const { parseToJSONCompatObj } = require('../jsonTools');

const logger = Logger();
const sdkVersion = coreApi.getSDKVersion();

const delegateStatus = {
	ACTIVE: 'active',
	STANDBY: 'standby',
	BANNED: 'banned',
	PUNISHED: 'punished',
	NON_ELIGIBLE: 'non-eligible',
};

let rawNextForgers = [];
let nextForgers = [];
let delegateList = [];

const delegateComparator = (a, b) => {
	const diff = BigInt(b.delegateWeight) - BigInt(a.delegateWeight);
	if (diff !== 0) return Number(diff);
	return Buffer.from(a.account.address).compare(Buffer.from(b.account.address));
};

const getAllDelegates = () => new Promise((resolve) => {
	resolve(delegateList);
});

const getTotalNumberOfDelegates = async (params = {}) => {
	const allDelegates = await getAllDelegates();
	const relevantDelegates = allDelegates.filter(delegate => (
		(!params.search || delegate.username.includes(params.search))
		&& (!params.username || delegate.username === params.username)
		&& (!params.address || delegate.account.address === params.address)
		&& (!params.publickey || delegate.account.publicKey === params.publickey)
		&& (!params.secpubkey || delegate.account.secondPublicKey === params.secpubkey)
		&& (!params.status || params.status.includes(delegate.status))
	));
	return relevantDelegates.length;
};

const computeDelegateRank = async () => {
	if (sdkVersion >= 4) {
		delegateList.sort(delegateComparator);
		delegateList.map((delegate, index) => {
			delegate.rank = index + 1;
			return delegate;
		});
	}
};

const computeDelegateStatus = async () => {
	// TODO: These feature should be handled by the compatibility layer
	const numActiveForgers = (sdkVersion < 4) ? 101 : 103;

	const lastestBlock = getLastBlock();
	const allNextForgersAddressList = rawNextForgers.map(forger => forger.address);
	const activeNextForgersList = allNextForgersAddressList.slice(0, numActiveForgers);

	const verifyIfPunished = delegate => {
		const isPunished = delegate.pomHeights
			.some(pomHeight => pomHeight.start <= lastestBlock.height
				&& lastestBlock.height <= pomHeight.end);
		return isPunished;
	};

	delegateList.map((delegate) => {
		if (sdkVersion < 4) {
			if (activeNextForgersList.includes(delegate.account.address)) {
				delegate.status = delegateStatus.ACTIVE;
			} else delegate.status = delegateStatus.STANDBY;
		} else {
			logger.debug('Determine delegate status');
			if (!delegate.isDelegate) delegate.status = delegateStatus.NON_ELIGIBLE;
			else if (delegate.isBanned) delegate.status = delegateStatus.BANNED;
			else if (verifyIfPunished(delegate)) delegate.status = delegateStatus.PUNISHED;
			else if (activeNextForgersList.includes(delegate.account.address)) {
				delegate.status = delegateStatus.ACTIVE;
			} else delegate.status = delegateStatus.STANDBY;
		}

		return delegate;
	});
	return delegateList;
};

const getDelegates = async params => {
	const delegates = {
		data: [],
		meta: {},
	};
	const allDelegates = await getAllDelegates();

	const offset = Number(params.offset) || 0;
	const limit = Number(params.limit) || 10;
	if (!params.sort) params.sort = 'rank:asc';

	const sortComparator = (sortParam) => {
		const sortProp = sortParam.split(':')[0];
		const sortOrder = sortParam.split(':')[1];

		const comparator = (a, b) => {
			try {
				if (Number.isNaN(Number(a[sortProp]))) throw new Error('Not a number, try string sorting');
				return (sortOrder === 'asc')
					? a[sortProp] - b[sortProp]
					: b[sortProp] - a[sortProp];
			} catch (_) {
				return (sortOrder === 'asc')
					? a[sortProp].localeCompare(b[sortProp])
					: b[sortProp].localeCompare(a[sortProp]);
			}
		};
		return comparator;
	};

	const filterBy = (list, entity) => list.filter((acc) => params[entity].includes(',')
		? (acc[entity] && params[entity].split(',').includes(acc[entity]))
		: (acc[entity] && acc[entity] === params[entity]),
	);

	delegates.data = allDelegates;

	if (params.address) {
		delegates.data = filterBy(delegates.data, 'address');
	}
	if (params.publicKey) {
		delegates.data = filterBy(delegates.data, 'publicKey');
	}
	if (params.secondPublicKey) {
		delegates.data = filterBy(delegates.data, 'secondPublicKey');
	}
	if (params.username) {
		delegates.data = filterBy(delegates.data, 'username');
	}
	if (params.status) {
		delegates.data = filterBy(delegates.data, 'status');
	}
	if (params.search) {
		delegates.data = delegates.data.filter((acc) => (acc.username
			&& String(acc.username).match(new RegExp(params.search, 'i'))));
	}

	if (delegates.data.every(delegate => !delegate.rank)) await computeDelegateRank();

	delegates.data = delegates.data
		.sort(sortComparator(params.sort))
		.slice(offset, offset + limit);

	delegates.meta.count = delegates.data.length;
	delegates.meta.offset = params.offset;
	delegates.meta.total = await getTotalNumberOfDelegates(params);

	return parseToJSONCompatObj(delegates);
};

const loadAllDelegates = async () => {
	const maxCount = 10000;
	delegateList = await requestAll(coreApi.getDelegates, {}, maxCount);
	await BluebirdPromise.map(
		delegateList,
		async delegate => {
			delegate.address = delegate.account.address;
			delegate.publicKey = delegate.account.publicKey;
			await cacheRedisDelegates.set(delegate.address, parseToJSONCompatObj(delegate));
			await cacheRedisDelegates.set(delegate.username, parseToJSONCompatObj(delegate));
			return delegate;
		},
		{ concurrency: delegateList.length },
	);

	if (delegateList.length) {
		logger.info(`Updated delegate list with ${delegateList.length} delegates.`);
	}
};

const getNextForgers = async params => {
	const forgers = {
		data: [],
		meta: {},
	};

	const { offset, limit } = params;

	forgers.data = nextForgers.slice(offset, offset + limit);

	forgers.meta.count = forgers.data.length;
	forgers.meta.offset = offset;
	forgers.meta.total = nextForgers.length;

	return parseToJSONCompatObj(forgers);
};

const loadAllNextForgers = async () => {
	// TODO: These feature should be handled by the compatibility layer
	const maxCount = (sdkVersion < 4) ? 101 : 103;
	if (sdkVersion <= 4) {
		rawNextForgers = await requestAll(coreApi.getNextForgers, { limit: maxCount }, maxCount);
	} else {
		const { data } = await coreApi.getForgers({ limit: maxCount, offset: nextForgers.length });
		rawNextForgers = data;
	}
	logger.info(`Updated next forgers list with ${rawNextForgers.length} delegates.`);
};

const resolveNextForgers = async () => {
	nextForgers = await BluebirdPromise.map(
		rawNextForgers,
		async forger => sdkVersion <= 4
			? delegateList.find(o => o.address === forger.address)
			: forger,
	);
	logger.debug('Finished collecting delegates');
};

const reloadNextForgersCache = async () => {
	await loadAllNextForgers();
	await resolveNextForgers();
};

const reload = async () => {
	await loadAllDelegates();
	await loadAllNextForgers();
	await computeDelegateRank();
	await computeDelegateStatus();
};

module.exports = {
	reloadDelegateCache: reload,
	getTotalNumberOfDelegates,
	getDelegates,
	reloadNextForgersCache,
	getNextForgers,
};
