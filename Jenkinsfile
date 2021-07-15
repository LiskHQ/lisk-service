@Library('lisk-jenkins') _

LISK_CORE_HTTP_PORT = 4000
LISK_CORE_WS_PORT = 5001
MYSQL_PORT = 3306
REDIS_PORT = 6381

def checkOpenPort(nPort) {
	def result = sh script: "nc -z localhost ${nPort}", returnStatus: true
	return (result == 0)
}

def runServiceIfMissing(svcName, path, nPort) {
	if (checkOpenPort(nPort) == false) {
		echo "${svcName} is not running, starting a new instance on port ${nPort}"
		dir(path) { sh "make up" }
		if (checkOpenPort(nPort) == false) {
			dir(path) { sh "make logs" }
			currentBuild.result = "FAILURE"
			throw new Exception("Failed to run ${svcName} instance")
		}
	}
}

def echoBanner(msg) {
	echo '----------------------------------------------------------------------'
	echo msg
	echo '----------------------------------------------------------------------'
}

def checkHttp(url) {
	def result = sh script: "curl -s -f -o /dev/null ${url}", returnStatus: true
	return (result == 0)
}

def waitForHttp(url) {
	waitUntil { script { return (checkHttp(url) == true) } }
}

pipeline {
	agent { node { label 'lisk-service' } }
	options {
		timeout(time: 8, unit: 'MINUTES')
	}
	environment {
		ENABLE_HTTP_API='http-status,http-test,http-version2'
		ENABLE_WS_API='blockchain,rpc-test,rpc-v2'
	}
	stages {
		stage ('Run required services') {
			steps {
				script {
					echoBanner(STAGE_NAME)

					runServiceIfMissing('Lisk Core', './jenkins/lisk-core', LISK_CORE_WS_PORT)
					runServiceIfMissing('MySQL', './jenkins/mysql', MYSQL_PORT)
					runServiceIfMissing('Redis', './jenkins/redis', REDIS_PORT)

					// Install PM2
					nvm(getNodejsVersion()) {
						sh 'npm i -g pm2'
					}
				}
			}
		}
		stage ('Build deps') {
			steps {
				script { echoBanner(STAGE_NAME) }
				nvm(getNodejsVersion()) {
					dir('./') { sh 'npm ci' }
					dir('./framework') { sh 'npm ci' }
					dir('./services/core') { sh 'npm ci' }
					dir('./services/market') { sh 'npm ci' }
					dir('./services/newsfeed') { sh 'npm ci' }
					dir('./services/gateway') { sh 'npm ci' }
					dir('./services/template') { sh 'npm ci' }
					dir('./tests') { sh "npm ci" }
				}
			}
		}
		stage ('Check linting') {
			steps {
				script { echoBanner(STAGE_NAME) }
				nvm(getNodejsVersion()) {
					sh 'npm run eslint'
				}
			}
		}
		stage('Perform unit tests') {
			steps {
				script { echoBanner(STAGE_NAME) }
				nvm(getNodejsVersion()) {
					dir('./framework') { sh "npm run test:unit" }
					dir('./services/core') { sh "npm run test:unit" }
					dir('./services/market') { sh "npm run test:unit" }
					dir('./services/newsfeed') { sh "npm run test:unit" }
				}
			}
		}
		stage('Run microservices') {
			steps {
				script { echoBanner(STAGE_NAME) }
				nvm(getNodejsVersion()) {
					sh 'pm2 start --silent ecosystem.jenkins.config.js'
				}
				waitForHttp('http://localhost:9901/api/ready')
				sleep(60)
				// waitForHttp('http://localhost:9901/api/v2/blocks?timestamp=1615917187')
			}
		}
		stage('Perform functional tests') {
			steps {
				script { echoBanner(STAGE_NAME) }
				nvm(getNodejsVersion()) {
					dir('./services/market') { sh "npm run test:functional" }
					dir('./services/newsfeed') { sh "npm run test:functional" }
					dir('./framework') { sh "npm run test:functional" }
				}
			}
		}
		stage('Perform integration tests') {
			steps {
				script { echoBanner(STAGE_NAME) }
				ansiColor('xterm') {
					nvm(getNodejsVersion()) {
						dir('./tests') { sh 'npm run test:integration:APIv2:SDKv5' }
					}
				}
			}
		}
	}
	post {
		failure {
			script { echoBanner('Failed to run the pipeline') }

			nvm(getNodejsVersion()) {
				sh 'pm2 logs lisk-service-gateway --lines=100  --nostream'
				sh 'pm2 logs lisk-service-core --lines=100  --nostream'
				sh 'pm2 logs lisk-service-market --lines=100  --nostream'
				sh 'pm2 logs lisk-service-newsfeed --lines=100  --nostream'
			}
		}
		cleanup {
			script { echoBanner('Cleaning up...') }

			nvm(getNodejsVersion()) {
				sh 'pm2 stop --silent ecosystem.jenkins.config.js'
			}

			dir('./jenkins/lisk-core') { sh "make down" }
			dir('./jenkins/mysql') { sh "make down" }
			dir('./jenkins/redis') { sh "make down" }
			
			dir('./') { sh 'make clean' }
		}
	}
}
// vim: filetype=groovy
