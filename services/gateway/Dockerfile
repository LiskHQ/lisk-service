ARG NODEJS_VERSION=18

##### Stage 1

FROM node:$NODEJS_VERSION-alpine AS builder

RUN adduser -D builder && \
    mkdir /home/builder/build && \
    chown -R builder:builder /home/builder/

USER builder
WORKDIR /home/builder/build

COPY ./yarn.lock ./package.json ./
RUN yarn install --frozen-lockfile && \
    # generate build timestamp as described in https://github.com/LiskHQ/lisk-service/issues/385
    node -e 'console.log(JSON.stringify({ timestamp: new Date().toISOString() }));' > ./build.json


##### Stage 2

FROM node:$NODEJS_VERSION-alpine

RUN apk add --no-cache curl=~8 && \
    adduser -D lisk

USER lisk
WORKDIR /home/lisk/lisk-service/gateway

COPY --chown=lisk:lisk ./ .
COPY --chown=lisk:lisk --from=builder /home/builder/build/ .

EXPOSE 9901
HEALTHCHECK CMD curl --fail http://localhost:9901/api/status || exit 1

CMD ["node", "app.js"]
