FROM node:14-alpine

LABEL org.opencontainers.image.source https://github.com/digita-ai/dgt-id-broker

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
ARG NPM_TOKEN
COPY package.json /usr/src/app/
COPY package-lock.json /usr/src/app/
COPY .npmrc /usr/src/app/
RUN npm set //npm.pkg.github.com/:_authToken $NPM_TOKEN
RUN npm install

# Bundle app source
COPY . /usr/src/app

RUN rm -f /usr/src/app/.npmrc
RUN npm run build
RUN chmod +x ./bin/server.js

# Expose ports.
EXPOSE 3003
ENTRYPOINT [ "./bin/server.js" ]
CMD [ "-u", "http://0.0.0.0:3003" ]
