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
import moment from 'moment';

const config = require('../../../config');
const { api } = require('../../../helpers/api');

const baseUrl = config.SERVICE_ENDPOINT;
const baseUrlV2 = `${baseUrl}/api/v2`;
const endpoint = `${baseUrlV2}/blocks`;

const {
	goodRequestSchema,
	badRequestSchema,
	notFoundSchema,
	wrongInputParamSchema,
	metaSchema,
} = require('../../../schemas/httpGenerics.schema');

const {
	blockSchemaVersion5,
} = require('../../../schemas/block.schema');

describe('Blocks API', () => {
	let refBlock;
	let refDelegate;
	beforeAll(async () => {
		let response;
		[refBlock] = (await api.get(`${endpoint}?limit=1&offset=2`)).data;
		do {
			// eslint-disable-next-line no-await-in-loop
			response = await api.get(`${baseUrlV2}/accounts?isDelegate=true&limit=1&search=${refBlock.generatorUsername}`);
		} while (!response.data);
		[refDelegate] = response.data;
	});

	describe('GET /blocks', () => {
		it('returns list of blocks when called with no params', async () => {
			const response = await api.get(`${endpoint}?limit=1`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data.length).toEqual(1);
			response.data.forEach(block => expect(block).toMap(blockSchemaVersion5));
			expect(response.meta).toMap(metaSchema);
		});

		it('known block by block ID -> ok', async () => {
			const response = await api.get(`${endpoint}?blockId=${refBlock.id}`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data.length).toEqual(1);
			response.data.forEach(block => expect(block).toMap(blockSchemaVersion5, { id: refBlock.id }));
			expect(response.meta).toMap(metaSchema);
		});

		it('known block by height -> ok', async () => {
			const response = await api.get(`${endpoint}?height=${refBlock.height}`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data.length).toEqual(1);
			expect(response.data[0].height).toEqual(refBlock.height);
			expect(response.data[0]).toEqual(refBlock);
			response.data.forEach(block => {
				expect(block).toMap(blockSchemaVersion5, { height: refBlock.height });
			});
			expect(response.meta).toMap(metaSchema);
		});

		it('known block by account -> ok', async () => {
			const response = await api.get(`${endpoint}?generatorAddress=${refDelegate.summary.address}`);
			expect(response).toMap(goodRequestSchema);
			response.data.forEach(block => {
				expect(block).toMap(blockSchemaVersion5);
				expect(block.generatorAddress).toEqual(refDelegate.summary.address);
			});
			expect(response.meta).toMap(metaSchema);
		});

		it('known block by publickey -> ok', async () => {
			const response = await api.get(`${endpoint}?generatorPublicKey=${refDelegate.summary.publicKey}`);
			expect(response).toMap(goodRequestSchema);
			response.data.forEach(block => {
				expect(block).toMap(blockSchemaVersion5);
				expect(block.generatorPublicKey).toEqual(refDelegate.summary.publicKey);
			});
			expect(response.meta).toMap(metaSchema);
		});

		it('known block by username -> ok', async () => {
			const response = await api.get(`${endpoint}?generatorUsername=${refDelegate.summary.username}`);
			expect(response).toMap(goodRequestSchema);
			response.data.forEach(block => {
				expect(block).toMap(blockSchemaVersion5);
				expect(block.generatorUsername).toEqual(refDelegate.summary.username);
			});
			expect(response.meta).toMap(metaSchema);
		});

		it('known block by timestamp -> ok', async () => {
			const timestamp = 1615917187;
			const response = await api.get(`${endpoint}?timestamp=${timestamp}`);
			expect(response).toMap(goodRequestSchema);
			response.data.forEach(block => {
				expect(block).toMap(blockSchemaVersion5, { timestamp });
			});
			expect(response.meta).toMap(metaSchema);
		});

		it('limit=0 -> 400', async () => {
			const response = await api.get(`${endpoint}?limit=0`, 400);
			expect(response).toMap(badRequestSchema);
		});

		it('non-existent height -> 404', async () => {
			const response = await api.get(`${endpoint}?height=2000000000`, 404);
			expect(response).toMap(notFoundSchema);
		});

		it('invalid query parameter -> 400', async () => {
			const response = await api.get(`${endpoint}?block=12602944501676077162`, 400);
			expect(response).toMap(wrongInputParamSchema);
		});
	});

	describe('Retrieve blocks list within timestamps', () => {
		it('blocks within set timestamps are returned', async () => {
			const from = moment(refBlock.timestamp * (10 ** 3)).subtract(1, 'day').unix();
			const toTimestamp = refBlock.timestamp;
			const response = await api.get(`${endpoint}?timestamp=${from}:${toTimestamp}&limit=100`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data).toBeInstanceOf(Array);
			expect(response.data.length).toBeGreaterThanOrEqual(1);
			expect(response.data.length).toBeLessThanOrEqual(100);
			response.data.forEach(block => {
				expect(block).toMap(blockSchemaVersion5);
				expect(block.timestamp).toBeGreaterThanOrEqual(from);
				expect(block.timestamp).toBeLessThanOrEqual(toTimestamp);
			});
			expect(response.meta).toMap(metaSchema);
		});

		it('blocks with half bounded range: fromTimestamp', async () => {
			const from = moment(refBlock.timestamp * (10 ** 3)).subtract(1, 'day').unix();
			const response = await api.get(`${endpoint}?timestamp=${from}:&limit=100`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data).toBeInstanceOf(Array);
			expect(response.data.length).toBeGreaterThanOrEqual(1);
			expect(response.data.length).toBeLessThanOrEqual(100);
			response.data.forEach(block => {
				expect(block).toMap(blockSchemaVersion5);
				expect(block.timestamp).toBeGreaterThanOrEqual(from);
			});
			expect(response.meta).toMap(metaSchema);
		});

		it('blocks with half bounded range: toTimestamp', async () => {
			const toTimestamp = refBlock.timestamp;
			const response = await api.get(`${endpoint}?timestamp=:${toTimestamp}&limit=100`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data).toBeInstanceOf(Array);
			expect(response.data.length).toBeGreaterThanOrEqual(1);
			expect(response.data.length).toBeLessThanOrEqual(100);
			response.data.forEach(block => {
				expect(block).toMap(blockSchemaVersion5);
				expect(block.timestamp).toBeLessThanOrEqual(toTimestamp);
			});
			expect(response.meta).toMap(metaSchema);
		});
	});

	describe('Retrieve blocks list within height range', () => {
		it('blocks within set height are returned', async () => {
			const minHeight = refBlock.height - 10;
			const maxHeight = refBlock.height;
			const response = await api.get(`${endpoint}?height=${minHeight}:${maxHeight}&limit=100`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data).toBeInstanceOf(Array);
			expect(response.data.length).toBeGreaterThanOrEqual(1);
			expect(response.data.length).toBeLessThanOrEqual(100);
			response.data.forEach(block => {
				expect(block).toMap(blockSchemaVersion5);
				expect(block.height).toBeGreaterThanOrEqual(minHeight);
				expect(block.height).toBeLessThanOrEqual(maxHeight);
			});
			expect(response.meta).toMap(metaSchema);
		});

		it('blocks with half bounded range: minHeight', async () => {
			const minHeight = refBlock.height - 10;
			const response = await api.get(`${endpoint}?height=${minHeight}:&limit=100`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data).toBeInstanceOf(Array);
			expect(response.data.length).toBeGreaterThanOrEqual(1);
			expect(response.data.length).toBeLessThanOrEqual(100);
			response.data.forEach(block => {
				expect(block).toMap(blockSchemaVersion5);
				expect(block.height).toBeGreaterThanOrEqual(minHeight);
			});
			expect(response.meta).toMap(metaSchema);
		});

		it('blocks with half bounded range: maxHeight', async () => {
			const maxHeight = refBlock.height;
			const response = await api.get(`${endpoint}?height=:${maxHeight}&limit=100`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data).toBeInstanceOf(Array);
			expect(response.data.length).toBeGreaterThanOrEqual(1);
			expect(response.data.length).toBeLessThanOrEqual(100);
			response.data.forEach(block => {
				expect(block).toMap(blockSchemaVersion5);
				expect(block.height).toBeLessThanOrEqual(maxHeight);
			});
			expect(response.meta).toMap(metaSchema);
		});
	});

	describe('Blocks sorted by height', () => {
		it('returns 10 blocks sorted by height descending', async () => {
			const response = await api.get(`${endpoint}?sort=height:desc`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data).toBeInstanceOf(Array);
			expect(response.data.length).toBeGreaterThanOrEqual(1);
			expect(response.data.length).toBeLessThanOrEqual(10);
			response.data.forEach(block => expect(block).toMap(blockSchemaVersion5));
			if (response.data.length > 1) {
				for (let i = 1; i < response.data.length; i++) {
					const prevBlock = response.data[i - 1];
					const currBlock = response.data[i];
					expect(prevBlock.height).toBeGreaterThan(currBlock.height);
				}
			}
			expect(response.meta).toMap(metaSchema);
		});

		it('returns 10 blocks sorted by height ascending', async () => {
			// Ignore the genesis block with offset=1
			const response = await api.get(`${endpoint}?sort=height:asc&offset=1`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data).toBeInstanceOf(Array);
			expect(response.data.length).toBeGreaterThanOrEqual(1);
			expect(response.data.length).toBeLessThanOrEqual(10);
			response.data.forEach(block => expect(block).toMap(blockSchemaVersion5));
			if (response.data.length > 1) {
				for (let i = 1; i < response.data.length; i++) {
					const prevBlock = response.data[i - 1];
					const currBlock = response.data[i];
					expect(prevBlock.height).toBeLessThan(currBlock.height);
				}
			}
			expect(response.meta).toMap(metaSchema);
		});
	});

	describe('Blocks sorted by timestamp', () => {
		it('returns 10 blocks sorted by timestamp descending', async () => {
			const response = await api.get(`${endpoint}?sort=timestamp:desc`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data).toBeInstanceOf(Array);
			expect(response.data.length).toBeGreaterThanOrEqual(1);
			expect(response.data.length).toBeLessThanOrEqual(10);
			response.data.forEach(block => expect(block).toMap(blockSchemaVersion5));
			if (response.data.length > 1) {
				for (let i = 1; i < response.data.length; i++) {
					const prevBlock = response.data[i - 1];
					const currBlock = response.data[i];
					expect(prevBlock.timestamp).toBeGreaterThan(currBlock.timestamp);
				}
			}
			expect(response.meta).toMap(metaSchema);
		});

		it('returns 10 blocks sorted by timestamp ascending', async () => {
			// Ignore the genesis block with offset=1
			const response = await api.get(`${endpoint}?sort=timestamp:asc&offset=1`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data).toBeInstanceOf(Array);
			expect(response.data.length).toBeGreaterThanOrEqual(1);
			expect(response.data.length).toBeLessThanOrEqual(10);
			response.data.forEach(block => expect(block).toMap(blockSchemaVersion5));
			if (response.data.length > 1) {
				for (let i = 1; i < response.data.length; i++) {
					const prevBlock = response.data[i - 1];
					const currBlock = response.data[i];
					expect(prevBlock.timestamp).toBeLessThan(currBlock.timestamp);
				}
			}
			expect(response.meta).toMap(metaSchema);
		});
	});

	describe('Fetch blocks based on multiple request params', () => {
		it('returns blocks by generatorUsername sorted by timestamp descending, limit & offset', async () => {
			const response = await api.get(`${endpoint}?generatorUsername=${refDelegate.summary.username}&sort=timestamp:desc&limit=5&offset=1`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data).toBeInstanceOf(Array);
			expect(response.data.length).toBeGreaterThanOrEqual(1);
			expect(response.data.length).toBeLessThanOrEqual(5);
			response.data.forEach(block => {
				expect(block).toMap(blockSchemaVersion5);
				expect(block.generatorUsername).toEqual(refDelegate.summary.username);
			});
			if (response.data.length > 1) {
				for (let i = 1; i < response.data.length; i++) {
					const prevBlock = response.data[i - 1];
					const currBlock = response.data[i];
					expect(prevBlock.timestamp).toBeGreaterThan(currBlock.timestamp);
				}
			}
			expect(response.meta).toMap(metaSchema);
		});

		it('returns blocks by generatorAddress sorted by timestamp descending, limit & offset', async () => {
			const response = await api.get(`${endpoint}?generatorAddress=${refDelegate.summary.address}&sort=timestamp:desc&limit=5&offset=1`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data).toBeInstanceOf(Array);
			expect(response.data.length).toBeGreaterThanOrEqual(1);
			expect(response.data.length).toBeLessThanOrEqual(5);
			response.data.forEach(block => {
				expect(block).toMap(blockSchemaVersion5);
				expect(block.generatorAddress).toEqual(refDelegate.summary.address);
			});
			if (response.data.length > 1) {
				for (let i = 1; i < response.data.length; i++) {
					const prevBlock = response.data[i - 1];
					const currBlock = response.data[i];
					expect(prevBlock.timestamp).toBeGreaterThan(currBlock.timestamp);
				}
			}
			expect(response.meta).toMap(metaSchema);
		});

		it('returns blocks by generatorPublicKey sorted by timestamp descending, limit & offset', async () => {
			const response = await api.get(`${endpoint}?generatorPublicKey=${refDelegate.summary.publicKey}&sort=timestamp:desc&limit=5&offset=1`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data).toBeInstanceOf(Array);
			expect(response.data.length).toBeGreaterThanOrEqual(1);
			expect(response.data.length).toBeLessThanOrEqual(5);
			response.data.forEach(block => {
				expect(block).toMap(blockSchemaVersion5);
				expect(block.generatorPublicKey).toEqual(refDelegate.summary.publicKey);
			});
			if (response.data.length > 1) {
				for (let i = 1; i < response.data.length; i++) {
					const prevBlock = response.data[i - 1];
					const currBlock = response.data[i];
					expect(prevBlock.timestamp).toBeGreaterThan(currBlock.timestamp);
				}
			}
			expect(response.meta).toMap(metaSchema);
		});

		it('returns blocks by generatorUsername sorted by height ascending, limit & offset', async () => {
			const response = await api.get(`${endpoint}?generatorUsername=${refDelegate.summary.username}&sort=height:asc&limit=5&offset=1`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data).toBeInstanceOf(Array);
			expect(response.data.length).toBeGreaterThanOrEqual(1);
			expect(response.data.length).toBeLessThanOrEqual(5);
			response.data.forEach(block => {
				expect(block).toMap(blockSchemaVersion5);
				expect(block.generatorUsername).toEqual(refDelegate.summary.username);
			});
			if (response.data.length > 1) {
				for (let i = 1; i < response.data.length; i++) {
					const prevBlock = response.data[i - 1];
					const currBlock = response.data[i];
					expect(prevBlock.height).toBeLessThan(currBlock.height);
				}
			}
			expect(response.meta).toMap(metaSchema);
		});

		it('returns blocks by generatorAddress sorted by height ascending, limit & offset', async () => {
			const response = await api.get(`${endpoint}?generatorAddress=${refDelegate.summary.address}&sort=height:asc&limit=5&offset=1`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data).toBeInstanceOf(Array);
			expect(response.data.length).toBeGreaterThanOrEqual(1);
			expect(response.data.length).toBeLessThanOrEqual(5);
			response.data.forEach(block => {
				expect(block).toMap(blockSchemaVersion5);
				expect(block.generatorAddress).toEqual(refDelegate.summary.address);
			});
			if (response.data.length > 1) {
				for (let i = 1; i < response.data.length; i++) {
					const prevBlock = response.data[i - 1];
					const currBlock = response.data[i];
					expect(prevBlock.height).toBeLessThan(currBlock.height);
				}
			}
			expect(response.meta).toMap(metaSchema);
		});

		it('returns blocks by generatorPublicKey sorted by height ascending, limit & offset', async () => {
			const response = await api.get(`${endpoint}?generatorPublicKey=${refDelegate.summary.publicKey}&sort=height:asc&limit=5&offset=1`);
			expect(response).toMap(goodRequestSchema);
			expect(response.data).toBeInstanceOf(Array);
			expect(response.data.length).toBeGreaterThanOrEqual(1);
			expect(response.data.length).toBeLessThanOrEqual(5);
			response.data.forEach(block => {
				expect(block).toMap(blockSchemaVersion5);
				expect(block.generatorPublicKey).toEqual(refDelegate.summary.publicKey);
			});
			if (response.data.length > 1) {
				for (let i = 1; i < response.data.length; i++) {
					const prevBlock = response.data[i - 1];
					const currBlock = response.data[i];
					expect(prevBlock.height).toBeLessThan(currBlock.height);
				}
			}
			expect(response.meta).toMap(metaSchema);
		});

		it('returns 404 NOT FOUND when queried with invalid combination: blockId and wrong height', async () => {
			const expectedStatus = 404;
			const height = refBlock.height - 10;
			const response = await api.get(`${endpoint}?blockId=${refBlock.id}&height=${height}`, expectedStatus);
			expect(response).toMap(notFoundSchema);
		});

		it('returns 404 NOT FOUND when queried with invalid combination: blockId and wrong timestamp', async () => {
			const expectedStatus = 404;
			const timestamp = moment(refBlock.timestamp * (10 ** 3)).subtract(1, 'day').unix();
			const response = await api.get(`${endpoint}?blockId=${refBlock.id}&timestamp=${timestamp}`, expectedStatus);
			expect(response).toMap(notFoundSchema);
		});

		it('returns 404 NOT FOUND when queried with invalid combination: blockId and wrong generatorUsername', async () => {
			const expectedStatus = 404;
			const generatorUsername = 'genesis_test';
			const response = await api.get(`${endpoint}?blockId=${refBlock.id}&generatorUsername=${generatorUsername}`, expectedStatus);
			expect(response).toMap(notFoundSchema);
		});

		it('returns 404 NOT FOUND when queried with blockId and non-zero offset', async () => {
			const expectedStatus = 404;
			const response = await api.get(`${endpoint}?blockId=${refBlock.id}&offset=1`, expectedStatus);
			expect(response).toMap(notFoundSchema);
		});

		it('returns 404 NOT FOUND when queried with block height and non-zero offset', async () => {
			const expectedStatus = 404;
			const response = await api.get(`${endpoint}?height=${refBlock.height}&offset=1`, expectedStatus);
			expect(response).toMap(notFoundSchema);
		});

		it('returns 404 NOT FOUND when queried with block timestamp and non-zero offset', async () => {
			const expectedStatus = 404;
			const response = await api.get(`${endpoint}?timestamp=${refBlock.timestamp}&offset=1`, expectedStatus);
			expect(response).toMap(notFoundSchema);
		});
	});
});
