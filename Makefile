.PHONY: clean coldstart mrproper up build logs
all: build up

compose := docker-compose

up:
	$(compose) up -d

down:
	$(compose) down --volumes --remove-orphans

restart: 
	$(compose) restart

backup-db:
	$(compose) exec -T mysql mysqldump --no-create-db lisk -u root -ppassword > mysql_core_index.sql

restore-db:
	$(compose) exec -T mysql mysql lisk -u root -ppassword < mysql_core_index.sql

flush-db:
	 echo "DROP DATABASE lisk; CREATE DATABASE lisk;" | $(compose) exec -T mysql mysql -u root -ppassword

stop-%:
	$(compose) stop $*

start-%:
	$(compose) start $*

ready:
	$(compose) exec -T tests curl --silent --fail 'http://gateway:9901/api/ready' >/dev/null

test: test-functional

test-functional:
	$(compose) exec -T tests npm run test:functional

test-integration:
	$(compose) exec -T tests npm run test:integration:APIv2:SDKv5

cli: cli-gateway

cli-%:
	$(compose) exec $* /bin/sh

mysql-%:
	$(compose) exec mysql_$* mysql -u root -ppassword lisk

redis-%:
	$(compose) exec redis_$* redis-cli

logs:
	$(compose) logs

logs-live:
	$(compose) logs --follow

logs-%:
	$(compose) logs $*

logs-live-%:
	$(compose) logs $* --follow

print-config:
	$(compose) config

build: build-core build-market build-newsfeed build-gateway build-export

build-all: build build-template build-tests

build-core:
	cd ./services/core && docker build --tag=lisk/service_core ./

build-market:
	cd ./services/market && docker build --tag=lisk/service_market ./
	
build-newsfeed:
	cd ./services/newsfeed && docker build --tag=lisk/service_newsfeed ./

build-export:
	cd ./services/export && docker build --tag=lisk/service_export ./

build-gateway:
	cd ./services/gateway && docker build --tag=lisk/service_gateway ./

build-template:
	cd ./services/template && docker build --tag=lisk/service_template ./

build-tests:
	cd ./tests && docker build --tag=lisk/service_tests ./

build-local:
	npm ci
	cd ./framework && npm ci
	cd ./services/blockchain-connector && npm ci
	cd ./services/blockchain-indexer && npm ci
	cd ./services/fee-estimator && npm ci
	cd ./services/core && npm ci
	cd ./services/market && npm ci
	cd ./services/newsfeed && npm ci
	cd ./services/gateway && npm ci
	cd ./services/export && npm ci
	cd ./services/template && npm ci
	cd ./tests && npm ci

clean: clean-local clean-images

clean-local:
	rm -rf node_modules
	cd ./framework && rm -rf node_modules
	cd ./services/blockchain-connector && rm -rf node_modules
	cd ./services/blockchain-indexer && rm -rf node_modules
	cd ./services/fee-estimator && rm -rf node_modules
	cd ./services/core && rm -rf node_modules
	cd ./services/market && rm -rf node_modules
	cd ./services/newsfeed && rm -rf node_modules
	cd ./services/gateway && rm -rf node_modules
	cd ./services/export && rm -rf node_modules
	cd ./services/template && rm -rf node_modules
	cd ./tests && rm -rf node_modules

clean-images:
	docker rmi lisk/service_gateway lisk/service_core lisk/service_template lisk/service_tests; :

audit:
	cd ./framework && npm audit; :
	cd ./services/blockchain-connector && npm audit; :
	cd ./services/blockchain-indexer && npm audit; :
	cd ./services/fee-estimator && npm audit; :
	cd ./services/core && npm audit; :
	cd ./services/market && npm audit; :
	cd ./services/newsfeed && npm audit; :
	cd ./services/gateway && npm audit; :
	cd ./services/export && npm audit; :

audit-fix:
	cd ./framework && npm audit fix; :
	cd ./services/blockchain-connector && npm audit fix; :
	cd ./services/blockchain-indexer && npm audit fix; :
	cd ./services/fee-estimator && npm audit fix; :
	cd ./services/core && npm audit fix; :
	cd ./services/market && npm audit fix; :
	cd ./services/newsfeed && npm audit fix; :
	cd ./services/gateway && npm audit fix; :
	cd ./services/export && npm audit fix; :

tag-%:
	npm version --no-git-tag-version --allow-same-version $*
	cd services/gateway && npm version --no-git-tag-version --allow-same-version $*
	cd services/blockchain-connector && npm version --no-git-tag-version --allow-same-version $*
	cd services/blockchain-indexer && npm version --no-git-tag-version --allow-same-version $*
	cd services/fee-estimator && npm version --no-git-tag-version --allow-same-version $*
	cd services/core && npm version --no-git-tag-version --allow-same-version $*
	cd services/market && npm version --no-git-tag-version --allow-same-version $*
	cd services/newsfeed && npm version --no-git-tag-version --allow-same-version $*
	cd services/export && npm version --no-git-tag-version --allow-same-version $*
	cd services/template && npm version --no-git-tag-version --allow-same-version $*
	git add ./services/gateway/package*.json
	git add ./services/blockchain-connector/package*.json
	git add ./services/blockchain-indexer/package*.json
	git add ./services/fee-estimator/package*.json
	git add ./services/core/package*.json
	git add ./services/market/package*.json
	git add ./services/newsfeed/package*.json
	git add ./services/export/package*.json
	git add ./services/template/package*.json
	git add ./package*.json
	git commit -m "Version bump to $*"
	git tag v$*

mrproper: down clean
