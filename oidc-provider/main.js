const express = require('express');
const Provider = require('oidc-provider');
const bodyParser = require('body-parser');
const path = require('path');
const assert = require('assert');
require('dotenv').config();

const Account = require('./account');
//const RedisAdapter = require('./redis');
const jwks = require('./jwks.json');

const configuration = {

    clients: [{
        client_id: 'test_app',
        client_secret: 'super_secret',
        grant_types: ['authorization_code'],
        response_types: ['code'],
        redirect_uris: [`http://${process.env.VITE_IP}:${process.env.VITE_PORT}/requests.html`]
    }],
    conformIdTokenClaims: false,
    pkce: {
        required: () => false
    },
    interactions: {
        url(ctx, interaction) {
            return `/interaction/${interaction.uid}`;
        },
    },
    clientBasedCORS: function (ctx, origin, client) {
        return origin === `http://${process.env.VITE_IP}:${process.env.VITE_PORT}`
    },
    findAccount: Account.findAccount,
    extraTokenClaims: async function(ctx, token){
        const account = await Account.findAccount(ctx, token.accountId)
        const claims = await account.claims()
        return ({
            'webid': claims.webid
        })
        
    },
    features: {
        // disable the packaged interactions
        devInteractions: { enabled: false },
        userinfo: {enabled:false},
        resourceIndicators: {
            defaultResource: (ctx, client, oneOf) => {
                return 'http://example.com'
            },
            enabled: true,
            getResourceServerInfo: (ctx, resourceIndicator, client) => {
                console.log("resource indicator: ", resourceIndicator, client)
                return ({
                    audience: 'solid',
                    accessTokenTTL: 2 * 60 * 60, // 2 hours
                    accessTokenFormat: 'jwt',
                    jwt: {
                        sign: { alg: 'ES256' },
                    },
                });
            }
        }
    },
    jwks,
}



const oidc = new Provider(`http://localhost:${process.env.OIDC_PORT}`, configuration);
oidc.proxy = true;

const expressApp = express();
expressApp.set('trust proxy', true);
expressApp.set('view engine', 'ejs');
expressApp.set('views', path.resolve(__dirname, 'views'));

const parse = bodyParser.urlencoded({ extended: false });

function setNoCache(req, res, next) {
    res.set('Pragma', 'no-cache');
    res.set('Cache-Control', 'no-cache, no-store');
    next();
}

expressApp.get('/interaction/:uid', setNoCache, async (req, res, next) => {
    try {
        const details = await oidc.interactionDetails(req, res);
        console.log('see what else is available to you for interaction views', details);
        const {
            uid, prompt, params,
        } = details;

        const client = await oidc.Client.find(params.client_id);

        if (prompt.name === 'login') {
            return res.render('login', {
                client,
                uid,
                details: prompt.details,
                params,
                title: 'Sign-in',
                flash: undefined,
            });
        }

        return res.render('interaction', {
            client,
            uid,
            details: prompt.details,
            params,
            title: 'Authorize',
        });
    } catch (err) {
        return next(err);
    }
});

expressApp.post('/interaction/:uid/login', setNoCache, parse, async (req, res, next) => {
    try {
        const { uid, prompt, params } = await oidc.interactionDetails(req, res);
        assert.strictEqual(prompt.name, 'login');
        const client = await oidc.Client.find(params.client_id);

        const accountId = await Account.authenticate(req.body.email, req.body.password);

        if (!accountId) {
            res.render('login', {
                client,
                uid,
                details: prompt.details,
                params: {
                    ...params,
                    login_hint: req.body.email,
                },
                title: 'Sign-in',
                flash: 'Invalid email or password.',
            });
            return;
        }

        const result = {
            login: { accountId },
        };

        await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
    } catch (err) {
        next(err);
    }
});

expressApp.post('/interaction/:uid/confirm', setNoCache, parse, async (req, res, next) => {
    try {
        const interactionDetails = await oidc.interactionDetails(req, res);
        const { prompt: { name, details }, params, session: { accountId } } = interactionDetails;
        assert.strictEqual(name, 'consent');

        let { grantId } = interactionDetails;
        let grant;

        if (grantId) {
            // we'll be modifying existing grant in existing session
            grant = await oidc.Grant.find(grantId);
        } else {
            // we're establishing a new grant
            grant = new oidc.Grant({
                accountId,
                clientId: params.client_id,
            });
        }

        if (details.missingOIDCScope) {
            grant.addOIDCScope(details.missingOIDCScope.join(' '));
            // use grant.rejectOIDCScope to reject a subset or the whole thing
        }
        if (details.missingOIDCClaims) {
            grant.addOIDCClaims(details.missingOIDCClaims);
            // use grant.rejectOIDCClaims to reject a subset or the whole thing
        }
        if (details.missingResourceScopes) {
            // eslint-disable-next-line no-restricted-syntax
            for (const [indicator, scopes] of Object.entries(details.missingResourceScopes)) {
                grant.addResourceScope(indicator, scopes.join(' '));
                // use grant.rejectResourceScope to reject a subset or the whole thing
            }
        }

        grantId = await grant.save();

        const consent = {};
        if (!interactionDetails.grantId) {
            // we don't have to pass grantId to consent, we're just modifying existing one
            consent.grantId = grantId;
        }

        const result = { consent };
        await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: true });
    } catch (err) {
        next(err);
    }
});

expressApp.get('/interaction/:uid/abort', setNoCache, async (req, res, next) => {
    try {
        const result = {
            error: 'access_denied',
            error_description: 'End-User aborted interaction',
        };
        await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
    } catch (err) {
        next(err);
    }
});

// leave the rest of the requests to be handled by oidc-provider, there's a catch all 404 there
expressApp.use(oidc.callback());

// express listen
expressApp.listen(process.env.OIDC_PORT);