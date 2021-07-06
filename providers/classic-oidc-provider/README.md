# Classic OIDC Provider

This provider was created using [Node OIDC Provider](https://github.com/panva/node-oidc-provider). It was configured to be barebones. It simply supports Dynamic Registration. All the rest is either default or disabled.

Take a look at the [documentation of the provider](../../docs/modules/providers/pages/oidc_provider.adoc) to see how it can be configured further.

## Starting the provider

This provider can be started on its own by executing `npm run start` in the package root. Note that you will need some environment variables, an example of which can be found in `.env.panva`:

- `VITE_PORT=portNumber` (port of the client)
- `OIDC_PORT=portNumber` (port the provider is running on)
- `VITE_IP=localhost` (host of the client)
- `CLIENT_ID=clientID` (ID of the statically configured client)
- `CLIENT_SECRET=secret` (Secret of the statically configured client)

To test the provider with the proxy, you can execute `npm run demo:panva` in the repo root. This will run the provider with environment variables that we have already set.
