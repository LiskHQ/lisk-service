/*
 * Lisk Cloud 2020 Lisk Foundation, Zug, Switzerland * All Rights Reserved. *
 *
 * NOTICE:
 * All information contained herein is, and remains the property of Lisk Foundation.
 * The intellectual and technical concepts contained herein are proprietary to Lisk Foundation
 * and may be covered by patents, by the right to obtain a patent, and are protected by trade
 * secret or copyright law.
 *
 * Dissemination of this information or reproduction of this material is strictly forbidden
 * unless prior written permission is obtained from Lisk Foundation.
 */
const Twitter = require('twitter');

const client = new Twitter({
	consumer_key: process.env.TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
	access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
	access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const safeRef = (obj, path) => {
	try {
		// eslint-disable-next-line
		return path.split('.').reduce((xs, x) => (xs && xs[x]) ? xs[x] : null, obj);
	} catch (e) {
		return null;
	}
};

const tweetUrl = (o) => {
	let url;
	if (o.retweeted_status) {
		url = safeRef(o, 'retweeted_status.entities.urls.0.url');
	} else if (o.extended_entities) {
		url = safeRef(o, 'extended_entities.media.0.url');
	} else if (o.entities) {
		url = safeRef(o, 'entities.urls.0.url');
	}
	if (!url && o.id_str) {
		url = `https://twitter.com/i/web/status/${o.id_str}`;
	}
	return url;
};

const getImageUrl = ({ entities }) => (
	entities.media && entities.media[0] && entities.media[0].media_url_https
);

const tweetMapper = o => ({
	...o,
	url: tweetUrl(o),
	image_url: getImageUrl(o),
	author: safeRef(o, 'user.screen_name'),
});

const getData = (request, data) => new Promise((resolve, reject) => {
	client.get(request, data, (error, tweets) => {
		if (error) {
			return reject(error);
		}

		return resolve(tweets.map(tweetMapper));
	});
});


module.exports = getData;

