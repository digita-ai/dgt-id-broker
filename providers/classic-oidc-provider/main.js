const express = require('express');
const Provider = require('oidc-provider');
const bodyParser = require('body-parser');
const path = require('path');
const assert = require('assert');
require('dotenv').config();
const cors = require('cors');
const koaBody = require('koa-body');

const Account = require('./account');
const jwks = require('./jwks.json');

// We hardcode one client. You can add more if needed.
const clients = [{
    client_id: `${process.env.CLIENT_ID}`,
    client_secret: `${process.env.CLIENT_SECRET}`,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope: 'openid offline_access',
    redirect_uris: [`http://${process.env.VITE_IP}:${process.env.VITE_PORT}/requests.html`]
}];

// Defines the initial configuration of the Identity Provider. The most important ones are highlighted with a comment.
const configuration = {

    clients: clients,
    conformIdTokenClaims: false,
    // Require PKCE as it is a must for Solid-OIDC
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
    features: {
        devInteractions: { enabled: false },
        userinfo: { enabled: false },
        // Defines config for the registration endpoint used for Dynamic Registration.
        registration: {
            enabled: true,
            initialAccessToken: false,
            issueRegistrationAccessToken: true,
        },
        dPoP: {
            enabled: false
        }
    },
    jwks,

}


// create the oidc provider on a specific url, and with our configuration.
const oidc = new Provider(`http://localhost:${process.env.OIDC_PORT}`, configuration);
oidc.proxy = true;

// create an express app.
const expressApp = express();

oidc.use(koaBody());

oidc.use(async (ctx, next) => {
    console.log("pre middleware", ctx.method, ctx.path);
    await next();
});


// Set our Cors policy.
let whitelist = [`http://localhost:${process.env.OIDC_PORT}`,
`http://localhost:${process.env.VITE_PORT}`,
`http://localhost:${process.env.PASS_PORT}`,
`http://${process.env.VITE_IP}:${process.env.VITE_PORT}`]


expressApp.use(cors({
    origin: function (origin, callback) {
        //allow requests with no origin, needed for http.requests file
        if (!origin) return callback(null, true);
        if (!whitelist.includes(origin)) {
            var message = "The CORS policy for this origin doesn't allow access from this particular origin.";
            return callback(new Error(message), false);
        }
        return callback(null, true);
    }
}));



// The following functions were created by Panva as part of an example, and used by us to get the demo up and running quickly.
// This includes the 2 files in the "views" folder.
// All credit to Panva
// Link: https://github.com/panva/node-oidc-provider-example/tree/main/03-oidc-views-accounts
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

expressApp.use('/static', express.static('static'));

// Leave the rest of the requests to be handled by oidc-provider, there's a catch all 404 there
expressApp.use(oidc.callback());

// Tell the express app to listen on our specified port.
expressApp.listen(process.env.OIDC_PORT);