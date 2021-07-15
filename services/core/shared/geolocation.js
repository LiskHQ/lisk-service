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
const { HTTP, CacheRedis, Logger } = require('lisk-service-framework');

const requestLib = HTTP.request;
const logger = Logger();

const config = require('../config.js');

const GEOIP_TTL = 12 * 60 * 60 * 1000; // ms
const REQUEST_LATENCY = 2000; // ms
const SCHEDULE_INTERVAL = 60 * 1000; // ms
const SCHEDULE_MAX_LENGTH = 1000; // items
const SCHEDULE_CLEANUP_INTERVAL = 1 * 60 * 1000; // ms

const freegeoAddress = config.endpoints.geoip;

const cacheRedis = CacheRedis('geodata', config.endpoints.redis);

const refreshSchedule = [];
const getRandInt = max => Math.ceil(Math.random() * max);

const httpTest = new RegExp('http:*');

const getFromHttp = ip => new Promise((resolve, reject) => {
	if (httpTest.test(freegeoAddress)) {
		requestLib(`${freegeoAddress}/${ip}`).then(body => {
			let jsonContent;
			if (typeof body === 'string') jsonContent = JSON.parse(body);
			else jsonContent = body;
			return resolve(jsonContent);
		}).catch(err => {
			reject(err);
		});
	}
});

const requestData = async requestedIp => {
	const key = `geoip:${requestedIp}`;

	const refreshData = ip => getFromHttp(ip).then(data => {
		cacheRedis.set(key, data.data, GEOIP_TTL);
		logger.debug(`Fetched geolocation data from online service for IP ${ip}`);
		refreshSchedule.push(setTimeout(
			() => refreshData(ip),
			GEOIP_TTL - (getRandInt(SCHEDULE_INTERVAL) + REQUEST_LATENCY)));
	}).catch(err => {
		logger.warn(`Could not retrieve geolocation data: ${err.message}`);
	});

	const geodata = await cacheRedis.get(key);
	if (!geodata) {
		refreshData(requestedIp);
	}
	return geodata;
};

const autoCleanUp = () => setInterval(() => {
	const tooMuch = refreshSchedule.splice(0, refreshSchedule.length - SCHEDULE_MAX_LENGTH);
	tooMuch.forEach(item => clearInterval(item));
	logger.debug(`Cache queue: Removed ${tooMuch.length} items, ${refreshSchedule.length} last elements left`);
}, SCHEDULE_CLEANUP_INTERVAL);

autoCleanUp();

module.exports = {
	requestData,
};
