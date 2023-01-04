/*
 * LiskHQ/lisk-service
 * Copyright © 2019 Lisk Foundation
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
const { Logger } = require('lisk-service-framework');
const moment = require('moment');
const BigNumber = require('big-number');

const coreApi = require('./compat');
const Signals = require('../signals');

const { getTransactions } = require('./transactions');

const {
	getTableInstance,
	getDbConnection,
	startDbTransaction,
	commitDbTransaction,
	rollbackDbTransaction,
} = require('../indexdb/mysql');

const Queue = require('./queue');
const requestAll = require('../requestAll');
const txStatisticsIndexSchema = require('./schemas/transactionStatistics');

const logger = Logger();

const getDbInstance = () => getTableInstance('transaction_statistics', txStatisticsIndexSchema);

const getSelector = async (params) => {
	const result = { property: 'date' };
	if (params.dateFrom) result.from = params.dateFrom.unix();
	if (params.dateTo) result.to = params.dateTo.unix();

	const networkStatus = await coreApi.getNetworkStatus();
	const numTrxTypes = networkStatus.data.moduleAssets.length;

	return {
		propBetweens: [result],
		sort: 'date:desc',
		// max supported limit of days * #transaction types + 1 (for the default type: 'any')
		limit: params.limit || 366 * (numTrxTypes + 1),
	};
};

const getWithFallback = (acc, type, range) => {
	const defaultValue = {
		count: 0,
		volume: 0,
	};
	return acc[type]
		? acc[type][range] || defaultValue
		: defaultValue;
};

const getTxValue = tx => BigNumber(tx.amount).plus(tx.fee);

const getRange = tx => {
	const value = getTxValue(tx);
	const lowerBound = Math.pow(10, Math.floor(Math.log10(value / 1e8)));
	const upperBound = Math.pow(10, Math.floor(Math.log10(value / 1e8)) + 1);
	return `${lowerBound}_${upperBound}`;
};

const getInitialValueToEnsureEachDayHasAtLeastOneEntry = () => {
	const transaction = {
		type: 'any',
		amount: String(1e8),
		fee: String(1e7),
	};
	return {
		[transaction.type]: {
			[getRange(transaction)]: getWithFallback({}),
		},
	};
};

const computeTransactionStats = transactions => transactions.reduce((acc, tx) => ({
	...acc,
	[tx.type]: {
		...acc[tx.type],
		[getRange(tx)]: {
			count: getWithFallback(acc, tx.type, getRange(tx)).count + 1,
			volume: BigNumber(getWithFallback(acc, tx.type, getRange(tx)).volume)
				.add(getTxValue(tx)),
		},
	},
}), getInitialValueToEnsureEachDayHasAtLeastOneEntry());

const transformStatsObjectToList = statsObject => (
	Object.entries(statsObject).reduce((acc, [type, rangeObject]) => ([
		...acc,
		...Object.entries(rangeObject).map(([range, { count, volume }]) => ({
			type,
			volume: Math.ceil(volume),
			count,
			range,
		})),
	]), [])
);

const insertToDb = async (statsList, date) => {
	const db = await getDbInstance();
	const connection = await getDbConnection();
	const trx = await startDbTransaction(connection);
	try {
		try {
			const [{ id }] = db.find({ date, limit: 1 }, ['id']);
			await db.deleteIds([id]);
			logger.debug(`Removed the following date from the database: ${date}`);
		} catch (err) {
			logger.debug(`The database does not contain the entry with the following date: ${date}`);
		}

		statsList.map(statistic => {
			Object.assign(statistic, { date, amount_range: statistic.range });
			statistic.id = String(statistic.date)
				.concat('-', statistic.type)
				.concat('-', statistic.amount_range);
			delete statistic.range;
			return statistic;
		});
		await db.upsert(statsList, trx);
		await commitDbTransaction(trx);
		const count = statsList.reduce((acc, row) => acc + row.count, 0);
		return `${statsList.length} rows with total tx count ${count} for ${date} inserted to db`;
	} catch (error) {
		await rollbackDbTransaction(trx);
		throw error;
	}
};

const fetchTransactions = async (date) => {
	const params = {
		timestamp: `${moment.unix(date).unix()}:${moment.unix(date).add(1, 'day').unix()}`,
	};
	const maxCount = (await getTransactions({ ...params, limit: 1 })).meta.total;
	const transactions = await requestAll(getTransactions, params, maxCount);
	return transactions;
};

const queueJob = async (job) => {
	const { date } = job.data;
	if (!date) {
		return Promise.reject(new Error('Missing date'));
	}
	try {
		const transactions = await fetchTransactions(date);
		const statsObject = computeTransactionStats(transactions);
		const statsList = transformStatsObjectToList(statsObject);
		return insertToDb(statsList, date);
	} catch (err) {
		return Promise.reject(err);
	}
};

const queueName = 'transactionStats';
const transactionStatisticsQueue = Queue(queueName, queueJob, 1);

const getStatsTimeline = async params => {
	const db = await getDbInstance();

	const result = await db.find(await getSelector(params), ['date', 'count', 'volume']);

	const unorderedfinalResult = {};
	result.forEach(entry => {
		const currFormattedDate = moment.unix(entry.date).format(params.dateFormat);
		if (!unorderedfinalResult[currFormattedDate]) {
			unorderedfinalResult[currFormattedDate] = {
				date: currFormattedDate,
				transactionCount: 0,
				volume: 0,
			};
		}

		const statForDate = unorderedfinalResult[currFormattedDate];
		statForDate.transactionCount += entry.count;
		statForDate.volume += entry.volume;
	});

	const orderedFinalResult = Object.values(unorderedfinalResult)
		.sort((a, b) => a.date.localeCompare(b.date)).reverse();

	return orderedFinalResult;
};

const getDistributionByAmount = async params => {
	const db = await getDbInstance();

	const result = (await db.find(await getSelector(params), ['amount_range', 'count'])).filter(o => o.count > 0);

	const unorderedfinalResult = {};
	result.forEach(entry => {
		if (!unorderedfinalResult[entry.amount_range]) unorderedfinalResult[entry.amount_range] = 0;
		unorderedfinalResult[entry.amount_range] += entry.count;
	});

	const orderedFinalResult = {};
	Object.keys(unorderedfinalResult).sort().reverse()
		.forEach(amountRange => orderedFinalResult[amountRange] = unorderedfinalResult[amountRange]);

	return orderedFinalResult;
};

const getDistributionByType = async params => {
	const db = await getDbInstance();

	const result = (await db.find(await getSelector(params), ['type', 'count'])).filter(o => o.count > 0);

	const unorderedfinalResult = {};
	result.forEach(entry => {
		if (!unorderedfinalResult[entry.type]) unorderedfinalResult[entry.type] = 0;
		unorderedfinalResult[entry.type] += entry.count;
	});

	const orderedFinalResult = {};
	Object.keys(unorderedfinalResult).sort((a, b) => Number(a) - Number(b))
		.forEach(type => orderedFinalResult[type] = unorderedfinalResult[type]);

	return orderedFinalResult;
};

const fetchTransactionsForPastNDays = async (n, forceReload = false) => {
	const db = await getDbInstance();
	const scheduledDays = [];
	[...Array(n)].forEach(async (_, i) => {
		const date = moment().subtract(i, 'day').utc().startOf('day')
			.unix();

		const shouldUpdate = i === 0 || !((await db.find({ date, limit: 1 }, ['id'])).length);

		if (shouldUpdate || forceReload) {
			let attempt = 0;
			const options = {
				delay: (attempt ** 2) * 60 * 60 * 1000,
				attempt: attempt += 1,
			};
			await transactionStatisticsQueue.add({ date, options });
			const formattedDate = moment.unix(date).format('YYYY-MM-DD');
			logger.debug(`Added day ${i + 1}, ${formattedDate} to the queue.`);
			scheduledDays.push(formattedDate.toString());
		}
		if (scheduledDays.length === n) logger.info(`Scheduled statistics calculation for ${scheduledDays.length} days (${scheduledDays[scheduledDays.length - 1]} - ${scheduledDays[0]})`);
	});
};

const init = async historyLengthDays => {
	const transactionStatsListener = async () => {
		await fetchTransactionsForPastNDays(historyLengthDays, true);
		logger.debug(`============== 'transactionStatsReady' signal: ${Signals.get('transactionStatsReady')} ==============`);
		Signals.get('transactionStatsReady').dispatch(historyLengthDays);
	};
	Signals.get('blockIndexReady').add(transactionStatsListener);
};

const updateTodayStats = async () => fetchTransactionsForPastNDays(1, true);

const validateTransactionStatistics = async historyLengthDays => {
	const dateTo = moment().utc().endOf('day').subtract(0, 'day');
	const dateFrom = moment(dateTo).startOf('day').subtract(historyLengthDays, 'day');
	const params = {
		dateFormat: 'YYYY-MM-DD',
		dateTo,
		dateFrom,
	};

	const distributionByType = await getDistributionByType(params);

	const verifyStatistics = await BluebirdPromise.map(
		Object.keys(distributionByType),
		async type => {
			const fromTimestamp = Math.floor((moment.unix(dateFrom).unix()) / 1000);
			const toTimestamp = Math.floor((moment.unix(dateTo).unix()) / 1000);

			const { meta: { total } } = await getTransactions({
				moduleAssetId: type,
				timestamp: `${fromTimestamp}:${toTimestamp}`,
				limit: 1,
			});
			return total === distributionByType[type];
		},
		{ concurrency: Object.keys(distributionByType).length },
	);

	const isStatsProperlyBuilt = verifyStatistics.every(isVerified => isVerified);
	if (!isStatsProperlyBuilt) await fetchTransactionsForPastNDays(historyLengthDays, true);
};

module.exports = {
	getStatsTimeline,
	getDistributionByType,
	getDistributionByAmount,
	init,
	updateTodayStats,
	validateTransactionStatistics,
};