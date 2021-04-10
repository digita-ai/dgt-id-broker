// NOTE: this can also be in 'commitlint' object of package.json, e.g. extending from private package

const {utils: {getPackages}} = require('@commitlint/config-lerna-scopes');

module.exports = {
    extends: [
        '@commitlint/config-conventional',
        '@commitlint/config-lerna-scopes'
    ],
    rules: {
        'scope-enum': async ctx => [2, 'always', [...(await getPackages(ctx)), 'all', 'multi']]
    }
}