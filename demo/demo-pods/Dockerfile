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
COPY data/944e0f16-b053-48df-b7d3-2371b680b2f3/ /tmp/css/944e0f16-b053-48df-b7d3-2371b680b2f3/
COPY data/auth0609be5ed22684f0067d64174/ /tmp/css/auth0609be5ed22684f0067d64174/

# Expose ports.
EXPOSE ${PORT}
CMD ./node_modules/.bin/community-solid-server -b ${BASE_URL} -p ${PORT} -c ${CONFIG} --rootFilePath /tmp/css
