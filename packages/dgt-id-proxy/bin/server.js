#!/usr/bin/env node

const commander = require('commander'); 

const { createVariables, launch } = require('../dist/main.js');

commander
.requiredOption('-u, --proxyUri <uri>', 'URL of the proxy')
.requiredOption('-U, --upstreamUri <uri>', 'URL of the upstream server')
.requiredOption('-o, --openidConfigurationFilePath <path>', 'relative path to the OIDC configuration')
.requiredOption('-j, --jwksFilePath <path>', 'elative path to the JWKs')
.parse(process.argv); 

console.log('Options: ', commander.opts());

const vars = createVariables(process.argv);

launch(vars);
