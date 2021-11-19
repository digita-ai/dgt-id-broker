// eslint-disable-next-line import/order, @typescript-eslint/no-var-requires
const c = require('crypto');

// Polyfill for crypto which isn't present globally in jsdom

Object.defineProperty(window.self, 'crypto', {
  value: {
    getRandomValues: (arr: any) => c.randomBytes(arr.length),
  },
});
