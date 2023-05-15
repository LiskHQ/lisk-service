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
const {
	address: {
		getLisk32AddressFromPublicKey: getLisk32AddressFromPublicKeyHelper,
		getLisk32AddressFromAddress,
		getAddressFromLisk32Address,
	},
	legacyAddress: {
		getLegacyAddressFromPublicKey,

	},
} = require('@liskhq/lisk-cryptography');

const {
	MySQL: { getTableInstance },
} = require('lisk-service-framework');

const accountsTableSchema = require('../../database/schema/accounts');
const config = require('../../../config');

const MYSQL_ENDPOINT_PRIMARY = config.endpoints.mysqlPrimary;
const MYSQL_ENDPOINT_REPLICA = config.endpoints.mysqlReplica;

const getAccountsTable = () => getTableInstance(
	accountsTableSchema.tableName,
	accountsTableSchema,
	MYSQL_ENDPOINT_PRIMARY,
);

const getAccountsTableReplica = () => getTableInstance(
	accountsTableSchema.tableName,
	accountsTableSchema,
	MYSQL_ENDPOINT_REPLICA,
);

const getIndexedAccountInfo = async (params, columns) => {
	if (!('publicKey' in params) || params.publicKey) {
		const accountsTableReplica = await getAccountsTableReplica();
		const [account = {}] = await accountsTableReplica.find({ limit: 1, ...params }, columns);
		return account;
	}
	return {};
};

const getLegacyFormatAddressFromPublicKey = publicKey => {
	const legacyAddress = getLegacyAddressFromPublicKey(Buffer.from(publicKey, 'hex'));
	return legacyAddress;
};

const getLisk32AddressFromPublicKey = publicKey => getLisk32AddressFromPublicKeyHelper(Buffer.from(publicKey, 'hex'));

const getLisk32AddressFromHexAddress = address => getLisk32AddressFromAddress(Buffer.from(address, 'hex'));

// TODO: Remove once SDK returns address in Lisk32 format
const getLisk32Address = address => address.startsWith('lsk') ? address : getLisk32AddressFromHexAddress(address);

const getHexAddress = address => address.startsWith('lsk')
	? getAddressFromLisk32Address(address).toString('hex')
	: address;

const updateAccountPublicKey = async (publicKey) => {
	const accountsTable = await getAccountsTable();
	await accountsTable.upsert({
		address: getLisk32AddressFromPublicKey(publicKey),
		publicKey,
	});
};

const updateAccountInfo = async (params) => {
	const accountInfo = {};

	accountsTableSchema.schema.forEach(columnName => {
		if (columnName in params) {
			accountInfo[columnName] = params[columnName];
		}
	});

	const accountsTable = await getAccountsTable();
	await accountsTable.upsert(accountInfo);
};

module.exports = {
	getIndexedAccountInfo,
	getLegacyAddressFromPublicKey: getLegacyFormatAddressFromPublicKey,
	getLisk32AddressFromPublicKey,
	getLisk32AddressFromHexAddress,
	getLisk32Address,
	updateAccountPublicKey,
	getHexAddress,
	getAccountsTableReplica,
	updateAccountInfo,
};