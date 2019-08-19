FROM node:12.2-alpine

ENV NODE_ENV development

RUN apk update && apk upgrade && \
    apk --no-cache --virtual build-dependencies add \
    bash git openssh python g++ make


WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install
COPY . .
EXPOSE 3006
CMD npm start
