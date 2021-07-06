# Solid Compliant OIDC Provider

This provider was created using [Node OIDC Provider](https://github.com/panva/node-oidc-provider). It was configured to be fully Solid-OIDC compliant.

Take a look at the [documentation of the provider](../../docs/modules/providers/pages/oidc_provider.adoc) to see how we configured it, and how it can be configured further.

## Starting the provider


This provider can be started on its own by executing `npm run start` in the package root. Note that you will need some environment variables:

- `VITE_PORT=portNumber` (port of the client)
- `OIDC_PORT=portNumber` (port the provider is running on)
- `VITE_IP=localhost` (host of the client)
- `CLIENT_ID=clientID` (ID of the statically configured client)
- `CLIENT_SECRET=secret` (Secret of the statically configured client)

Since this provider is fully Solid-OIDC compliant, there is no demo script to run it behind a proxy.
