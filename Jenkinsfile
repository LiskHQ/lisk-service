@Library('lisk-jenkins') _

Makefile = 'Makefile.jenkins'

def waitForHttp() {
    waitUntil {
        script {
            dir('./docker') {
                def api_available = sh script: "make -f ${Makefile} ready", returnStatus: true
                return (api_available == 0)
            }
        }
    }
}

pipeline {
    agent { node { label 'lisk-service' } }
    options {
        timeout(time: 6, unit: 'MINUTES')
    }
    environment {
        ENABLE_HTTP_API='http-version1,http-version1-compat,http-status,http-test'
        ENABLE_WS_API='rpc,rpc-v1,blockchain,rpc-test'
    }
    stages {
        stage ('Build deps') {
            steps {
                nvm(getNodejsVersion()) {
                    dir('./') { sh 'npm ci' }
                    dir('./framework') { sh 'npm ci' }
                    dir('./services/core') { sh 'npm ci' }
                    dir('./services/gateway') { sh 'npm ci' }
                    dir('./services/template') { sh 'npm ci' }
                    dir('./tests') { sh "npm ci" }
                }
            }
        }

        stage ('Check linting') {
            steps {
                nvm(getNodejsVersion()) {
                    sh 'npm run eslint'
                }
            }
        }

        stage('Run services unit tests') {
            steps {
                nvm(getNodejsVersion()) {
                    dir('./services/core') {
                        sh "npm run test:unit"
                    }
                }
            }
        }

        stage('Run framework unit tests') {
            steps {
                nvm(getNodejsVersion()) {
                    dir('./framework') {
                        sh "npm run test:unit"
                    }
                }
            }
        }

        stage('Build docker images') {
            steps {
                sh 'make build-core'
                sh 'make build-gateway'
                sh 'make build-template'
                sh 'make build-tests'
            }
        }

        stage('Run microservices') {
            steps {
                ansiColor('xterm') {
                    dir('./docker') { sh "ENABLE_HTTP_API=${ENABLE_HTTP_API} ENABLE_WS_API=${ENABLE_WS_API} make -f ${Makefile} up" }
                }
            }
        }

        stage('Check API gateway status') {
            steps {
                timeout(time: 3, unit: 'MINUTES') {
                    waitForHttp()
                }
            }
        }

        stage('Run functional tests') {
            steps {
                ansiColor('xterm') {
                    dir('./docker') { sh "make -f ${Makefile} test-functional" }
                }
            }
        }

		stage('Run integration tests') {
			steps {
                dir('./') { sh 'make build' }
				dir('./docker') { 
                    sh ''' 
                    make -f Makefile.core.jenkins lisk-core
                    make -f Makefile.deployment.devnet up
                    ''' }
                timeout(time: 3, unit: 'MINUTES') {
                    waitUntil {
                        script {
                            dir('./docker') {
                            def api_available = sh script: "make -f Makefile.core.jenkins ready", returnStatus: true
                            return (api_available == 0)
                            }
                        }
                    }   
                }
                dir('./docker') { sh "make -f ${Makefile} test-integration" }    
			}
		}
    }
    post {
        failure {
            // dir('./docker') { sh "make -f ${Makefile} logs" }
            dir('./docker') { sh "make -f ${Makefile} logs-template" }
            dir('./docker') { sh "make -f ${Makefile} logs-gateway" }
            dir('./docker') { sh "make -f ${Makefile} logs-core" }
        }
        cleanup {
            dir('./docker') { sh "make -f ${Makefile} mrproper" }
        }
    }
}
// vim: filetype=groovy
