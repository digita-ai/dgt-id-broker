FROM node:14-alpine

ENV BASE_URL=http://localhost
ENV PORT=3002

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
ARG NPM_TOKEN
COPY package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY . /usr/src/app

# Copy initial data
COPY data/tonypaillard/ /tmp/css/tonypaillard/

# Expose ports.
EXPOSE ${PORT}
CMD ./node_modules/.bin/community-solid-server -b ${BASE_URL} -p ${PORT} -c ${CONFIG} --rootFilePath /tmp/css
