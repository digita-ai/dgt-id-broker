// This script uses the openid-configuration of the specified upstream server and replaces it's urls with that of the specified proxy url

// usage: npm run generate-config -- [upstream server issuer url] [proxy issuer url] [relative path to file (optional)]
import { writeFileSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';

// get the arguments
const args = process.argv.slice(2);
const upstreamUrl = args[0];
const proxyUrl = args[1];
let filePath = args[2];
if (!filePath) {
  // use this path by default if no filePath was provided
  filePath = 'assets/openid-configuration.json';
}

const fetchOpenidConfig = async (url: string) => {
  const response = await fetch(url);
  return response.json();
};

if (upstreamUrl.endsWith('/') || proxyUrl.endsWith('/')) {
  // We don't want trailing slashes, otherwise the "issuer" claim will not be matched
  // eslint-disable-next-line no-console
  console.log('Urls should not contain a trailing \'/\'');
} else if (args.length < 2) {
  // We need an upstream url and a proxy url at least
  // eslint-disable-next-line no-console
  console.log('Please provide both an upstream url and proxy url');
} else {
  // Fetch the config of the upstream server
  fetchOpenidConfig(upstreamUrl + '/.well-known/openid-configuration')
    .then((data) => {
      for (const key of Object.keys(data)) {
        if (typeof data[key] === 'string'){
          // replace all instances of the upstream url with the proxy url
          data[key] = data[key].replace(upstreamUrl, proxyUrl);
        }
      }
      data.solid_oidc_supported = 'https://solidproject.org/TR/solid-oidc';
      // write the data to the specified path
      writeFileSync(join(process.cwd(), filePath), JSON.stringify(data));
      // eslint-disable-next-line no-console
      console.log(`Successfully wrote the config "${join(process.cwd(), filePath)}"`);
    });
}
