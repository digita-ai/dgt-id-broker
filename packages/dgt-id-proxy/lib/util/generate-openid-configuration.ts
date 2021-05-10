/* eslint-disable no-console -- is cli script */
/**
 * This script uses the openid-configuration of the specified upstream server and replaces it's urls with that of the specified proxy url.
 * Usage: npm run generate:oidc -- [upstream server issuer url] [proxy issuer url] [relative path to file (optional)]
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';

const args = process.argv.slice(2);
const upstreamUrl = args[0];
const proxyUrl = args[1];
const filePath = args[2] ?? 'assets/openid-configuration.json';

const fetchOpenidConfig = async (url: string) => {

  const response = await fetch(url);

  return response.json();

};

if (args.length < 2) {

  console.log('Please provide both an upstream url and proxy url');

} else {

  fetchOpenidConfig(upstreamUrl + '/.well-known/openid-configuration').then((data) => {

    for (const key of Object.keys(data)) {

      if (typeof data[key] === 'string'){

        // replace all instances of the upstream url with the proxy url
        data[key] = data[key].replace(upstreamUrl, proxyUrl);

      }

    }

    data.solid_oidc_supported = 'https://solidproject.org/TR/solid-oidc';

    writeFileSync(join(process.cwd(), filePath), JSON.stringify(data));

    console.log(`Successfully wrote the config "${join(process.cwd(), filePath)}"`);

  });

}
