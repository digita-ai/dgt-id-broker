# Classic OIDC Provider

This provider was created using [Node OIDC Provider](https://github.com/panva/node-oidc-provider). It was configured to be barebones. It simply supports Dynamic Registration. All the rest is either default or disabled.

Take a look at the [documentation of the provider](../../docs/modules/providers/pages/oidc_provider.adoc) to see how it can be configured further.

## Starting the provider

Starting the provider can be done in two ways:

Open the folder in a terminal, then:
- execute `npm run start`. Note that you will need some environment variables:
    - `VITE_PORT=portNumber` (port of the client)
    - `OIDC_PORT=portNumber` (port the provider is running on)
    - `VITE_IP=localhost` (host of the client)
    - `CLIENT_ID=clientID` (ID of the statically configured client)
    - `CLIENT_SECRET=secret` (Secret of the statically configured client)
- execute `npm run demo:panva`. This will run the provider with environment variables that we have already set.