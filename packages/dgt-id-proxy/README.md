# Identity Proxy Server

This package provides a Proxy Server that can be used to upgrade existing OIDC Identity Providers to be compliant with the [Solid-OIDC specification](https://solid.github.io/authentication-panel/solid-oidc/) without have to change those Identity Providers themselves.

This is done through handlers which can be configured to accomplish various different needs and are completely modular. You can configure the handlers to fill in the gaps of an IdP. If your IdP can provide PKCE, do not include handlers that would add PKCE in the proxy. The reason this is possible is due to a dependency injection framework called [componentsjs](https://componentsjs.readthedocs.io/en/latest/). The proxy can be configured through JSON config files.

Take a look at the list of [features](../docs/modules/proxy/pages/features.adoc) that are supported. The documentation for each feature will also explain how the feature can be enabled by configuring handlers.

It might also be a good idea to take a look at the [getting started page](../docs/modules/proxy/pages/getting_started.adoc).