FROM node:12.6-alpine

ENV NODE_ENV development

RUN apk update && apk upgrade && \
    apk --no-cache --virtual build-dependencies add \
    bash git openssh g++ make gcc python build-base

WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install
RUN npm rebuild bcrypt --build-from-source
COPY . .
EXPOSE 3006
CMD npm start
