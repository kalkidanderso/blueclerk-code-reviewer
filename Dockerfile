FROM node:14.20-alpine3.15

ARG node_environment
ARG database_url

ENV NODE_ENV $node_environment
ENV DATABASE_URL $database_url

RUN apk update && apk upgrade && \
    apk --no-cache --virtual build-dependencies add \
    bash git openssh g++ make gcc python2 build-base

WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "tsconfig.json", "./"]
RUN npm install -g mongodb@5.8
RUN npm install request
RUN npm install
RUN npm rebuild bcrypt --build-from-source
RUN npm install pm2 -g
ENV PM2_PUBLIC_KEY orlibi61uru1kzv
ENV PM2_SECRET_KEY 88riceao9xegxk2
COPY . .
EXPOSE 3006
RUN npm run schema
RUN npm run tsc
RUN npm link mongodb
CMD ["pm2-runtime", "dist/server.js"]