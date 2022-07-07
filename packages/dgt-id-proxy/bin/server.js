#!/usr/bin/env node

const { createVariables, launch } = require('../dist/main.js');

require('yargs/yargs')(process.argv.slice(2))
  .options({
    'proxyUri': {
      alias: 'u',
      describe: 'URL of the proxy',
      demandOption: true
    },
    'upstreamUri': {
      alias: 'U',
      describe: 'URL of the upstream server',
      demandOption: true
    },
    'openidConfigurationFilePath': {
        alias: 'o',
        describe: 'relative path to the OIDC configuration',
        demandOption: true
    },
    'jwksFilePath': {
        alias: 'j',
        describe: 'relative path to the JWKs',
        demandOption: true
    }
  })
  .help()
  .argv

const vars = createVariables(process.argv);

launch(vars);
