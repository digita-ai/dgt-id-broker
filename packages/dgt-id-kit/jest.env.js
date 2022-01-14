const Environment = require("jest-environment-jsdom");

// Taken from https://github.com/inrupt/solid-client-authn-js/issues/1676#issuecomment-917030930
// This is to add TextEncoder to jest's jsdom environment. It is not added to globals, and it is required by jose.

module.exports = class CustomTestEnvironment extends Environment {
  constructor (config) {
    super(Object.assign({}, config, {
      globals: Object.assign({}, config.globals, {
        Uint8Array: Uint8Array
      })
    }))
  }
  async setup() {
    await super.setup();
    if (typeof this.global.TextEncoder === "undefined") {
      const { TextEncoder, TextDecoder } = require("util");
      this.global.TextEncoder = TextEncoder;
      this.global.TextDecoder = TextDecoder;
    }
  }
};