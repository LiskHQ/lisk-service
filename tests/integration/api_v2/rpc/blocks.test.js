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

const util = require('util');

const config = require('../../../config');

const {
	request,
} = require('../../../helpers/socketIoRpcRequest');

const {
	invalidParamsSchema,
	emptyResultEnvelopeSchema,
	emptyResponseSchema,
	jsonRpcEnvelopeSchema,
	metaSchema,
} = require('../../../schemas/rpcGenerics.schema');

const {
	blockSchemaVersion5,
} = require('../../../schemas/block.schema');

const wsRpcUrl = `${config.SERVICE_ENDPOINT}/rpc-v2`;
const getBlocks = async params => request(wsRpcUrl, 'get.blocks', params);
const getDelegates = async params => request(wsRpcUrl, 'get.accounts', { ...params, isDelegate: true });

describe('Method get.blocks', () => {
	let refBlock;
	let refDelegate;
	beforeAll(async () => {
		[refBlock] = (await getBlocks({ limit: 1, offset: 2 })).result.data;
		[refDelegate] = (await getDelegates({
			search: refBlock.generatorUsername, limit: 1,
		})).result.data;
	});

	describe('is able to retireve block lists', () => {
		it('no params -> ok', async () => {
			const response = await getBlocks({});
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeLessThanOrEqual(10);
			result.data.forEach(block => expect(block).toMap(blockSchemaVersion5));
			expect(result.meta).toMap(metaSchema);
		});

		it('limit=100 -> ok', async () => {
			const response = await getBlocks({ limit: 100 });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeLessThanOrEqual(100);
			result.data.forEach(block => expect(block).toMap(blockSchemaVersion5));
			expect(result.meta).toMap(metaSchema);
		});

		it('offset -> ok', async () => {
			const [...topTenBlocks] = (await getBlocks({})).result.data;
			const [...topTenOffsetBlocks] = (await getBlocks({ offset: 1 })).result.data;

			[...Array(topTenBlocks.length)].forEach((_, i) => {
				if (i) expect(util.isDeepStrictEqual(topTenBlocks[i], topTenOffsetBlocks[i - 1]))
					.toBeTruthy();
			});
		});

		it('limit & offset -> ok', async () => {
			const [...topTenBlocks] = (await getBlocks({})).result.data;
			const [...topTenOffsetBlocks] = (await getBlocks({ offset: 1, limit: 12 })).result.data;

			[...Array(topTenBlocks.length)].forEach((_, i) => {
				if (i) expect(util.isDeepStrictEqual(topTenBlocks[i], topTenOffsetBlocks[i - 1]))
					.toBeTruthy();
			});
		});
	});

	describe('is able to retireve block details by block ID', () => {
		it('known block by block ID -> ok', async () => {
			const response = await getBlocks({ blockId: refBlock.id });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data.length).toEqual(1);
			result.data.forEach(block => expect(block).toMap(blockSchemaVersion5, { id: refBlock.id }));
			expect(result.meta).toMap(metaSchema);
		});

		it('too long block id -> empty response', async () => {
			const response = await getBlocks({ id: 'fkfkfkkkffkfkfk1010101010101010101' }).catch(e => e);
			expect(response).toMap(invalidParamsSchema);
		});

		it('invalid block id -> empty response', async () => {
			const response = await getBlocks({ blockId: '12602944501676077162' }).catch(e => e);
			expect(response).toMap(emptyResponseSchema);
			const { result } = response;
			expect(result).toMap(emptyResultEnvelopeSchema);
		});

		it('invalid query parameter -> -32602', async () => {
			const response = await getBlocks({ block: '12602944501676077162' }).catch(e => e);
			expect(response).toMap(invalidParamsSchema);
		});
	});

	describe('is able to retireve block details by height', () => {
		it('known block by height -> ok', async () => {
			const response = await getBlocks({ height: `${refBlock.height}` });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data.length).toEqual(1);
			expect(result.data[0]).toMap(blockSchemaVersion5, { height: refBlock.height });
		});

		it('height = 0 -> -32602', async () => {
			const response = await getBlocks({ height: 0 }).catch(e => e);
			expect(response).toMap(invalidParamsSchema);
		});
	});

	describe('is able to retireve block lists by account address', () => {
		it('block list by known account ID', async () => {
			const response = await getBlocks({ generatorAddress: refDelegate.summary.address });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			result.data.forEach((block) => {
				expect(block).toMap(blockSchemaVersion5);
				// expect(block.generatorAddress).toEqual(refDelegate.summary.address);
			});
		});
	});

	describe('is able to retireve block lists by account public key', () => {
		it('known block by publickey -> ok', async () => {
			const response = await getBlocks({ generatorPublicKey: refDelegate.summary.publicKey });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			result.data.forEach((blockData) => {
				expect(blockData)
					.toMap(blockSchemaVersion5, { generatorPublicKey: refDelegate.summary.publicKey });
			});
		});
	});

	describe('is able to retireve block lists by account username', () => {
		it('known block by username -> ok', async () => {
			const response = await getBlocks({ generatorUsername: refDelegate.summary.username });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			result.data.forEach((blockData) => {
				expect(blockData).toMap(blockSchemaVersion5);
				// expect(block.generatorUsername).toEqual(refDelegate.summary.username);
			});
		});
	});

	describe('is able to retireve block lists by timestamp', () => {
		it('Blocks with from...to timestamp -> ok', async () => {
			const from = moment(refBlock.timestamp * 10 ** 3).subtract(1, 'day').unix();
			const to = refBlock.timestamp;
			const response = await getBlocks({ timestamp: `${from}:${to}` });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeLessThanOrEqual(10);
			result.data.forEach((blockItem) => {
				expect(blockItem).toMap(blockSchemaVersion5);
				expect(blockItem.timestamp).toBeGreaterThanOrEqual(from);
				expect(blockItem.timestamp).toBeLessThanOrEqual(to);
			});
		});

		it('Blocks with from... timestamp -> ok', async () => {
			const from = moment(refBlock.timestamp * 10 ** 3).subtract(1, 'day').unix();
			const response = await getBlocks({ timestamp: `${from}:` });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeLessThanOrEqual(10);
			result.data.forEach((blockItem) => {
				expect(blockItem).toMap(blockSchemaVersion5);
				expect(blockItem.timestamp).toBeGreaterThanOrEqual(from);
			});
		});

		it('Blocks with ...to timestamp -> ok', async () => {
			const to = refBlock.timestamp;
			const response = await getBlocks({ timestamp: `:${to}` });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeLessThanOrEqual(10);
			result.data.forEach((blockItem) => {
				expect(blockItem).toMap(blockSchemaVersion5);
				expect(blockItem.timestamp).toBeLessThanOrEqual(to);
			});
		});
	});

	describe('is able to retireve block lists within height range', () => {
		it('Blocks with min...max height -> ok', async () => {
			const minHeight = refBlock.height - 10;
			const maxHeight = refBlock.height;
			const response = await getBlocks({ height: `${minHeight}:${maxHeight}` });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeLessThanOrEqual(10);
			result.data.forEach((blockItem) => {
				expect(blockItem).toMap(blockSchemaVersion5);
				expect(blockItem.height).toBeGreaterThanOrEqual(minHeight);
				expect(blockItem.height).toBeLessThanOrEqual(maxHeight);
			});
		});

		it('Blocks with min... height -> ok', async () => {
			const minHeight = refBlock.height - 10;
			const response = await getBlocks({ height: `${minHeight}:` });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeLessThanOrEqual(10);
			result.data.forEach((blockItem) => {
				expect(blockItem).toMap(blockSchemaVersion5);
				expect(blockItem.height).toBeGreaterThanOrEqual(minHeight);
			});
		});

		it('Blocks with ...max height -> ok', async () => {
			const maxHeight = refBlock.height;
			const response = await getBlocks({ height: `:${maxHeight}` });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeLessThanOrEqual(10);
			result.data.forEach((blockItem) => {
				expect(blockItem).toMap(blockSchemaVersion5);
				expect(blockItem.height).toBeLessThanOrEqual(maxHeight);
			});
		});
	});

	describe('Blocks sorted by height', () => {
		it('returns 10 blocks sorted by height descending', async () => {
			const response = await getBlocks({ sort: 'height:desc' });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeLessThanOrEqual(10);
			result.data.forEach((blockItem) => expect(blockItem).toMap(blockSchemaVersion5));
			if (result.data.length > 1) {
				for (let i = 1; i < result.data.length; i++) {
					const prevBlock = result.data[i - 1];
					const currBlock = result.data[i];
					expect(prevBlock.height).toBeGreaterThan(currBlock.height);
				}
			}
			expect(result.meta).toMap(metaSchema);
		});

		it('returns 10 blocks sorted by height ascending', async () => {
			// Ignore the genesis block with offset=1
			const response = await getBlocks({ sort: 'height:asc', offset: 1 });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeLessThanOrEqual(10);
			result.data.forEach((blockItem) => expect(blockItem).toMap(blockSchemaVersion5));
			if (result.data.length > 1) {
				for (let i = 1; i < result.data.length; i++) {
					const prevBlock = result.data[i - 1];
					const currBlock = result.data[i];
					expect(prevBlock.height).toBeLessThan(currBlock.height);
				}
			}
			expect(result.meta).toMap(metaSchema);
		});
	});

	describe('Blocks sorted by timestamp', () => {
		it('returns 10 blocks sorted by timestamp descending', async () => {
			const response = await getBlocks({ sort: 'timestamp:desc' });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeLessThanOrEqual(10);
			result.data.forEach((blockItem) => expect(blockItem).toMap(blockSchemaVersion5));
			if (result.data.length > 1) {
				for (let i = 1; i < result.data.length; i++) {
					const prevBlock = result.data[i - 1];
					const currBlock = result.data[i];
					expect(prevBlock.timestamp).toBeGreaterThan(currBlock.timestamp);
				}
			}
			expect(result.meta).toMap(metaSchema);
		});

		it('returns 10 blocks sorted by timestamp ascending', async () => {
			// Ignore the genesis block with offset=1
			const response = await getBlocks({ sort: 'timestamp:asc', offset: 1 });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeLessThanOrEqual(10);
			result.data.forEach((blockItem) => expect(blockItem).toMap(blockSchemaVersion5));
			if (result.data.length > 1) {
				for (let i = 1; i < result.data.length; i++) {
					const prevBlock = result.data[i - 1];
					const currBlock = result.data[i];
					expect(prevBlock.timestamp).toBeLessThan(currBlock.timestamp);
				}
			}
			expect(result.meta).toMap(metaSchema);
		});
	});

	describe('Fetch blocks based on multiple request params', () => {
		it('returns blocks by generatorUsername sorted by timestamp descending, limit & offset', async () => {
			const response = await getBlocks({ generatorUsername: refDelegate.summary.username, sort: 'timestamp:desc', limit: 5, offset: 1 });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeLessThanOrEqual(5);
			result.data.forEach((blockItem) => {
				expect(blockItem).toMap(blockSchemaVersion5);
				expect(blockItem.generatorUsername).toEqual(refDelegate.summary.username);
			});
			if (result.data.length > 1) {
				for (let i = 1; i < result.data.length; i++) {
					const prevBlock = result.data[i - 1];
					const currBlock = result.data[i];
					expect(prevBlock.timestamp).toBeGreaterThan(currBlock.timestamp);
				}
			}
			expect(result.meta).toMap(metaSchema);
		});

		it('returns blocks by generatorAddress sorted by timestamp descending, limit & offset', async () => {
			const response = await getBlocks({ generatorAddress: refDelegate.summary.address, sort: 'timestamp:desc', limit: 5, offset: 1 });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeLessThanOrEqual(5);
			result.data.forEach((blockItem) => {
				expect(blockItem).toMap(blockSchemaVersion5);
				expect(blockItem.generatorAddress).toEqual(refDelegate.summary.address);
			});
			if (result.data.length > 1) {
				for (let i = 1; i < result.data.length; i++) {
					const prevBlock = result.data[i - 1];
					const currBlock = result.data[i];
					expect(prevBlock.timestamp).toBeGreaterThan(currBlock.timestamp);
				}
			}
			expect(result.meta).toMap(metaSchema);
		});

		it('returns blocks by generatorPublicKey sorted by timestamp descending, limit & offset', async () => {
			const response = await getBlocks({ generatorPublicKey: refDelegate.summary.publicKey, sort: 'timestamp:desc', limit: 5, offset: 1 });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeLessThanOrEqual(5);
			result.data.forEach((blockItem) => {
				expect(blockItem).toMap(blockSchemaVersion5);
				expect(blockItem.generatorPublicKey).toEqual(refDelegate.summary.publicKey);
			});
			if (result.data.length > 1) {
				for (let i = 1; i < result.data.length; i++) {
					const prevBlock = result.data[i - 1];
					const currBlock = result.data[i];
					expect(prevBlock.timestamp).toBeGreaterThan(currBlock.timestamp);
				}
			}
			expect(result.meta).toMap(metaSchema);
		});

		it('returns blocks by generatorUsername sorted by height ascending, limit & offset', async () => {
			const response = await getBlocks({ generatorUsername: refDelegate.summary.username, sort: 'height:asc', limit: 5, offset: 1 });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeLessThanOrEqual(5);
			result.data.forEach((blockItem) => {
				expect(blockItem).toMap(blockSchemaVersion5);
				expect(blockItem.generatorUsername).toEqual(refDelegate.summary.username);
			});
			if (result.data.length > 1) {
				for (let i = 1; i < result.data.length; i++) {
					const prevBlock = result.data[i - 1];
					const currBlock = result.data[i];
					expect(prevBlock.height).toBeLessThan(currBlock.height);
				}
			}
			expect(result.meta).toMap(metaSchema);
		});

		it('returns blocks by generatorAddress sorted by height ascending, limit & offset', async () => {
			const response = await getBlocks({ generatorAddress: refDelegate.summary.address, sort: 'height:asc', limit: 5, offset: 1 });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeLessThanOrEqual(5);
			result.data.forEach((blockItem) => {
				expect(blockItem).toMap(blockSchemaVersion5);
				expect(blockItem.generatorAddress).toEqual(refDelegate.summary.address);
			});
			if (result.data.length > 1) {
				for (let i = 1; i < result.data.length; i++) {
					const prevBlock = result.data[i - 1];
					const currBlock = result.data[i];
					expect(prevBlock.height).toBeLessThan(currBlock.height);
				}
			}
			expect(result.meta).toMap(metaSchema);
		});

		it('returns blocks by generatorPublicKey sorted by height ascending, limit & offset', async () => {
			const response = await getBlocks({ generatorPublicKey: refDelegate.summary.publicKey, sort: 'height:asc', limit: 5, offset: 1 });
			expect(response).toMap(jsonRpcEnvelopeSchema);
			const { result } = response;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThanOrEqual(1);
			expect(result.data.length).toBeLessThanOrEqual(5);
			result.data.forEach((blockItem) => {
				expect(blockItem).toMap(blockSchemaVersion5);
				expect(blockItem.generatorPublicKey).toEqual(refDelegate.summary.publicKey);
			});
			if (result.data.length > 1) {
				for (let i = 1; i < result.data.length; i++) {
					const prevBlock = result.data[i - 1];
					const currBlock = result.data[i];
					expect(prevBlock.height).toBeLessThan(currBlock.height);
				}
			}
			expect(result.meta).toMap(metaSchema);
		});

		it('returns empty response when queried with blockId and wrong height', async () => {
			const height = String(refBlock.height - 10);
			const response = await getBlocks({ blockId: refBlock.id, height }).catch(e => e);
			expect(response).toMap(emptyResponseSchema);
			const { result } = response;
			expect(result).toMap(emptyResultEnvelopeSchema);
		});

		it('returns empty response when queried with blockId and wrong timestamp', async () => {
			const timestamp = String(moment(refBlock.timestamp * (10 ** 3)).subtract(1, 'day').unix());
			const response = await getBlocks({ blockId: refBlock.id, timestamp }).catch(e => e);
			expect(response).toMap(emptyResponseSchema);
			const { result } = response;
			expect(result).toMap(emptyResultEnvelopeSchema);
		});

		it('returns empty response when queried with blockId and wrong generatorUsername', async () => {
			const generatorUsername = 'genesis_test';
			const response = await getBlocks({ blockId: refBlock.id, generatorUsername }).catch(e => e);
			expect(response).toMap(emptyResponseSchema);
			const { result } = response;
			expect(result).toMap(emptyResultEnvelopeSchema);
		});

		it('returns empty response when queried with blockId and non-zero offset', async () => {
			const response = await getBlocks({ blockId: refBlock.id, offset: 1 }).catch(e => e);
			expect(response).toMap(emptyResponseSchema);
			const { result } = response;
			expect(result).toMap(emptyResultEnvelopeSchema);
		});

		it('returns empty response when queried with block height and non-zero offset', async () => {
			const response = await getBlocks({
				height: String(refBlock.height),
				offset: 1,
			}).catch(e => e);
			expect(response).toMap(emptyResponseSchema);
			const { result } = response;
			expect(result).toMap(emptyResultEnvelopeSchema);
		});

		it('returns empty response when queried with block timestamp and non-zero offset', async () => {
			const response = await getBlocks({ timestamp: String(refBlock.timestamp), offset: 1 })
				.catch(e => e);
			expect(response).toMap(emptyResponseSchema);
			const { result } = response;
			expect(result).toMap(emptyResultEnvelopeSchema);
		});
	});
});
