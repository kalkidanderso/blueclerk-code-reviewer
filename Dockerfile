FROM node:14.20-alpine3.15

ENV NODE_ENV development

RUN apk update && apk upgrade && \
    apk --no-cache --virtual build-dependencies add \
    bash git openssh g++ make gcc python2 build-base

WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "tsconfig.json", "./"]
RUN npm install request
RUN npm install
RUN npm rebuild bcrypt --build-from-source
COPY . .
EXPOSE 3006
RUN npm run tsc

CMD ["node", "--heapsnapshot-signal=SIGUSR2", "dist/server.js"]
