# Keycloak

This provider was created using [Keycloak](https://www.keycloak.org/). It imports a keycloak instance configured with a realm of `Digita`, a static client, and a user.

Take a look at the [documentation of the provider](../../docs/modules/providers/pages/keycloak.adoc) to see how it can be configured further.

## Starting the provider

Starting the provider can be done by executing `npm run start` in the package root. This will build a docker image based on the docker-compose file. To test the provider with the proxy, you can execute `npm run keycloak` in the repo root.
