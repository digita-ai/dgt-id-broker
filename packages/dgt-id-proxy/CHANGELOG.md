# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.3.0](https://github.com/digita-ai/dgt-id-broker/compare/v0.2.0...v0.3.0) (2021-06-29)


### **Bug Fixes**

* maxListenersExceededWarning in pass-through tests ([#148](https://github.com/digita-ai/dgt-id-broker/issues/148)) ([c46f246](https://github.com/digita-ai/dgt-id-broker/commit/c46f24605218654dacaf918375ab45d9fddc77df))


### **Features**

* dpop pass through request handler + tests ([#159](https://github.com/digita-ai/dgt-id-broker/issues/159)) ([ff9efd3](https://github.com/digita-ai/dgt-id-broker/commit/ff9efd37493aa49006d214b5bc5fb64e366c74e1))
* redirect uri added to static client handlers ([#138](https://github.com/digita-ai/dgt-id-broker/issues/138)) ([a1e93c0](https://github.com/digita-ai/dgt-id-broker/commit/a1e93c0c96a0a3759594b0bedddd99d75ed6df65))
* state handlers ([#145](https://github.com/digita-ai/dgt-id-broker/issues/145)) ([e9b8610](https://github.com/digita-ai/dgt-id-broker/commit/e9b8610de9ddef1c9d5b6d044220b7e24d3fcfb6))
* support ephemeral clients ([#132](https://github.com/digita-ai/dgt-id-broker/issues/132)) ([d606896](https://github.com/digita-ai/dgt-id-broker/commit/d606896cfcc27bf795cb9f7af5041d7caafccd37))



## 0.2.0 (2021-06-08)


### **Bug Fixes**

* add client-id claim in opaque access token handler ([#60](https://github.com/digita-ai/dgt-id-broker/issues/60)) ([3ec6c0e](https://github.com/digita-ai/dgt-id-broker/commit/3ec6c0e510005e3c595bd61a9282ca3a73e410fa))
* fixed missing parameter in panva demo config ([#111](https://github.com/digita-ai/dgt-id-broker/issues/111)) ([1646846](https://github.com/digita-ai/dgt-id-broker/commit/1646846b3270cb6cefcdc57c91b638448a449bb7))
* restricted access policy ([#113](https://github.com/digita-ai/dgt-id-broker/issues/113)) ([510ffbd](https://github.com/digita-ai/dgt-id-broker/commit/510ffbdd38175f707db7bb64b438fe25e21c914b))
* update location only if matches upstream url ([#100](https://github.com/digita-ai/dgt-id-broker/issues/100)) ([703bb85](https://github.com/digita-ai/dgt-id-broker/commit/703bb8531418d5f011f03af45194c4d419a88fc5))


### **Documentation**

* add tsdocs to handlers ([#73](https://github.com/digita-ai/dgt-id-broker/issues/73)) ([8900c78](https://github.com/digita-ai/dgt-id-broker/commit/8900c78d36d17af15a8d485a89b5b06b4aea9411))
* updated webid response docs ([#125](https://github.com/digita-ai/dgt-id-broker/issues/125)) ([5507318](https://github.com/digita-ai/dgt-id-broker/commit/55073185644fc89dfacc1474688a6d9fb64f0d65))


### **Features**

* add default handler to config for keycloak and panva ([#118](https://github.com/digita-ai/dgt-id-broker/issues/118)) ([9de5ed5](https://github.com/digita-ai/dgt-id-broker/commit/9de5ed5cd7a32483ad727d4bc6f8491fffcfa51f))
* add webid to id token ([#143](https://github.com/digita-ai/dgt-id-broker/issues/143)) ([e7e3a3b](https://github.com/digita-ai/dgt-id-broker/commit/e7e3a3b4c1ff21477d1a65dde468d6eb49180c67))
* allow requests without webid as client_id ([#141](https://github.com/digita-ai/dgt-id-broker/issues/141)) ([ebe337b](https://github.com/digita-ai/dgt-id-broker/commit/ebe337becb29aa05eaf8cc11ddfe23268d39116e))
* automatically publish npm package and docker image ([4b0f604](https://github.com/digita-ai/dgt-id-broker/commit/4b0f6047507ae3587ac28e0ff34a115430ed0a60))
* basic identity proxy server ([#18](https://github.com/digita-ai/dgt-id-broker/issues/18)) ([5d3132a](https://github.com/digita-ai/dgt-id-broker/commit/5d3132aecc972fedbd19e754f972c0f37af42679))
* dpop proof for resource server containing ath claim ([#127](https://github.com/digita-ai/dgt-id-broker/issues/127)) ([237aea1](https://github.com/digita-ai/dgt-id-broker/commit/237aea1ebe37d74649b3d36f162aa84bcaa85aa6))
* dynamic client registration ([#63](https://github.com/digita-ai/dgt-id-broker/issues/63)) ([c5bae48](https://github.com/digita-ai/dgt-id-broker/commit/c5bae4809e5d4ffb22c55a4f4eff9d167a419f39))
* easy demo startup flow ([#77](https://github.com/digita-ai/dgt-id-broker/issues/77)) ([6caf69f](https://github.com/digita-ai/dgt-id-broker/commit/6caf69f2e79affdc4feac5547f0b9961811ef4be))
* encode and decode access tokens ([#47](https://github.com/digita-ai/dgt-id-broker/issues/47)) ([61b1bf3](https://github.com/digita-ai/dgt-id-broker/commit/61b1bf3bff1ee8609fad26d0f05f769ae39fead6))
* error handling in passthrough ([#115](https://github.com/digita-ai/dgt-id-broker/issues/115)) ([1cb1472](https://github.com/digita-ai/dgt-id-broker/commit/1cb14723dbe789a03102170379d1e0806e099839))
* fix pass through handler to work with url parameter ([#36](https://github.com/digita-ai/dgt-id-broker/issues/36)) ([7c7a045](https://github.com/digita-ai/dgt-id-broker/commit/7c7a045e222b84c52bebe67e03a725ddaeae7b74))
* generate openid configuration and jwks ([#56](https://github.com/digita-ai/dgt-id-broker/issues/56)) ([c0e1d19](https://github.com/digita-ai/dgt-id-broker/commit/c0e1d19a51f0e18cd84ccb22b74d35fdf82cc244))
* http/https switching in PassThroughRequestHandler ([#93](https://github.com/digita-ai/dgt-id-broker/issues/93)) ([567150e](https://github.com/digita-ai/dgt-id-broker/commit/567150ef85d8934506d6400ba173b07b7bff1e77))
* initial setup of dgt-id-proxy package ([dc72fa2](https://github.com/digita-ai/dgt-id-broker/commit/dc72fa2c3a945376212fabddeae468847db6f6ac))
* passthrough handler ([#30](https://github.com/digita-ai/dgt-id-broker/issues/30)) ([cc39ac4](https://github.com/digita-ai/dgt-id-broker/commit/cc39ac4d4374733d3034c4162629a930fcdf7ed7))
* pkce handler ([#35](https://github.com/digita-ai/dgt-id-broker/issues/35)) ([75902bc](https://github.com/digita-ai/dgt-id-broker/commit/75902bc5a71a8ccf10869a1350f343276686f9b3))
* prevent login form redirect with compression ([#124](https://github.com/digita-ai/dgt-id-broker/issues/124)) ([acfe1cc](https://github.com/digita-ai/dgt-id-broker/commit/acfe1ccf82fcc9259d6a2d7192b490c569bb66ab))
* remove CORS handling ([#67](https://github.com/digita-ai/dgt-id-broker/issues/67)) ([7ac46c3](https://github.com/digita-ai/dgt-id-broker/commit/7ac46c39dce0026674b885a4868cde14435ce6b8))
* slugify sub claim ([#89](https://github.com/digita-ai/dgt-id-broker/issues/89)) ([bc1c7b3](https://github.com/digita-ai/dgt-id-broker/commit/bc1c7b366ef9f9e0a402b140e641d5b3b404c251))
* static client registration ([#82](https://github.com/digita-ai/dgt-id-broker/issues/82)) ([51092e0](https://github.com/digita-ai/dgt-id-broker/commit/51092e0a9113dbac19c36d846200ba220f6c969a))
* storage implementation ([#28](https://github.com/digita-ai/dgt-id-broker/issues/28)) ([3305505](https://github.com/digita-ai/dgt-id-broker/commit/3305505d0852d8fd927f9b3f1d3254004210625e))
* support claim extension ([#45](https://github.com/digita-ai/dgt-id-broker/issues/45)) ([20000d0](https://github.com/digita-ai/dgt-id-broker/commit/20000d0b514a5804cf65e0920d4bbc360a766435))
* support compression by using buffers ([#120](https://github.com/digita-ai/dgt-id-broker/issues/120)) ([6ea3f07](https://github.com/digita-ai/dgt-id-broker/commit/6ea3f07fd801cceac54bfda3d99ce5a43b57c512))
* support custom claim in webid response handler ([#123](https://github.com/digita-ai/dgt-id-broker/issues/123)) ([14e7ac3](https://github.com/digita-ai/dgt-id-broker/commit/14e7ac3d70d12a5cc62c1603b5df0649fc84645f))
* support dpop ([#34](https://github.com/digita-ai/dgt-id-broker/issues/34)) ([5cf78c6](https://github.com/digita-ai/dgt-id-broker/commit/5cf78c652c14a27f3af22ea56681c5932a477aa5))
* support launch variables. fix configs ([#71](https://github.com/digita-ai/dgt-id-broker/issues/71)) ([da12704](https://github.com/digita-ai/dgt-id-broker/commit/da1270463b3d2d6d02a63f6cf479a5e5772d7b67))
* support opaque access tokens ([#46](https://github.com/digita-ai/dgt-id-broker/issues/46)) ([4f5091a](https://github.com/digita-ai/dgt-id-broker/commit/4f5091a3d175aef1cc68a3fb1f89325ae50a5707))
* support use-case specific configs ([#59](https://github.com/digita-ai/dgt-id-broker/issues/59)) ([683e2e1](https://github.com/digita-ai/dgt-id-broker/commit/683e2e13215495c25b182c658cd0ec0ba51b1902))
* take iat and exp claims from upstream tokens in encoder ([#72](https://github.com/digita-ai/dgt-id-broker/issues/72)) ([696db6b](https://github.com/digita-ai/dgt-id-broker/commit/696db6bc0f46554894d66b6648b40a513264064b))
* update location header to point to proxy ([#99](https://github.com/digita-ai/dgt-id-broker/issues/99)) ([86e7a90](https://github.com/digita-ai/dgt-id-broker/commit/86e7a9064f32a83ff3deddac3d67503bcdbca5e6))
* url encode sub claim for webid ([#87](https://github.com/digita-ai/dgt-id-broker/issues/87)) ([ee3a34d](https://github.com/digita-ai/dgt-id-broker/commit/ee3a34dfb1ddc541fefae99bfce5e7f925e6f443))
* use handlersjs instead of own handlers ([#31](https://github.com/digita-ai/dgt-id-broker/issues/31)) ([9a99971](https://github.com/digita-ai/dgt-id-broker/commit/9a99971d23977f97244a6e692c9137c7bd7536f6))
* verify upstream jwks ([#61](https://github.com/digita-ai/dgt-id-broker/issues/61)) ([bad972c](https://github.com/digita-ai/dgt-id-broker/commit/bad972c596a31effde3dc7013c2b49b201cecd3d))