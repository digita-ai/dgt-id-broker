const express = require('express');
const Provider = require('oidc-provider');
const bodyParser = require('body-parser');
const path = require('path');
const assert = require('assert');
require('dotenv').config();
const cors = require('cors');
const { nanoid } = require('nanoid')
const CryptoJS = require("crypto-js");
const koaBody = require('koa-body');
const fetch = require("node-fetch");
const N3 = require('n3');
const parser = new N3.Parser();
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
const store = new N3.Store();

const Account = require('./account');
//const RedisAdapter = require('./redis');
const jwks = require('./jwks.json');
const { write } = require('lowdb/adapters/memory');
const { unwatchFile } = require('fs');
const clients = [{
    client_id: `${process.env.CLIENT_ID}`,
    client_secret: `${process.env.CLIENT_SECRET}`,
    grant_types: ['authorization_code'],
    response_types: ['code'],
    redirect_uris: [`http://${process.env.VITE_IP}:${process.env.VITE_PORT}/requests.html`]
}];

const configuration = {

    clients: clients,
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
        },
        registration: {
            enabled: true,
            idFactory: (ctx) =>  {
                return nanoid();
            },
            initialAccessToken: false,
            issueRegistrationAccessToken: true,
            secretFactory: (ctx) => {
                return generateSecret(process.env.CLIENT_SECRET);
            }
        }
    },
    jwks,
    
}


function generateSecret(secret) {
  return base64URL(CryptoJS.SHA256(secret));
}

function base64URL(string) {
  return string
    .toString(CryptoJS.enc.Base64)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

const oidc = new Provider(`http://localhost:${process.env.OIDC_PORT}`, configuration);
oidc.proxy = true;


const  expressApp = express();

oidc.use(koaBody());

oidc.use(async (ctx, next) => {
    console.log("pre middleware", ctx.method, ctx.path);
    console.log(`Request Body: ${JSON.stringify(ctx.request.body)}`);
    //console.log(`http://localhost:${process.env.OIDC_PORT}`, ctx.req.url)

    let clientID = "";
    let redirectURI = "";
    let client = "";

    if ((ctx.path === "/auth" || ctx.path === "/token") && (ctx.method === "GET" || ctx.method === "POST")) {
        if (ctx.method === "GET") {
            const params = new URLSearchParams(ctx.req.url);
            clientID = params.get("client_id");
            redirectURI = params.get("redirect_uri");

            client = {
                client_id: clientID,
                redirect_uri: redirectURI,
            }

        } else if (ctx.method === "POST") {
            clientID = ctx.request.body["client_id"];
            redirectURI = ctx.request.body["redirect_uri"];

            client = {
                client_id: clientID,
                redirect_uri: redirectURI,
            };
        }
        if (
            clientID !== undefined &&
            redirectURI !== undefined
        ) {
            async function getPod(url) {
                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        Accept: "text/turtle",
                    },
                });
                return response;
            }
            getPod(clientID)
                .then(async (data) => {
                    let known_client = false;
    
                    for (const x of clients) {
                        if (x["client_id"] === clientID) {
                            known_client = true;
                        }
                    }
    
                    if (!known_client) {
                        try {
                            const url = new URL(clientID);
                        } catch (error) {
                            throw new Error(error);
                        }
                        const text = await data.text();
    
                        if (isValidWebID(clientID, redirectURI,data, text)) {
                            clients.push(client)
                            console.log("Client registered successfully!")
                        } else {
                            throw new Error(
                                "This is not a valid WebID, please register dynamically"
                            );
                        }
                    } else {
                        throw new Error(
                            "This client is already registered!"
                        );
                    }
                })
                .catch((error) => {
                    throw new Error(error)
                })
        }        
    }
    await next();
});

function isValidWebID(clientID, redirectURI, data, text) {
    let valid = false;

    let typeFound = false;
    for (let pair of data.headers.entries()) {
        if (pair[0] === "content-type" && pair[1] === "text/turtle") {
            typeFound = true;
        }
    }

    if (typeFound) {
        store.addQuads(parser.parse(text));
        const quads = store.getQuads();

        for (const quad of quads) {
            if (
                quad["_predicate"].id ===
                "http://www.w3.org/ns/solid/terms#oidcRegistration"
            ) {

                const object = quad["_object"]
                const objectSub = object.id.substring(1, object.id.length - 1);
                let JSONObject = JSON.parse(objectSub);

                if (clientID === JSONObject.client_id
                    && JSONObject.redirect_uris.includes(redirectURI)) {
                    valid = true;
                }
                return valid;
            }
        }
    } 
    return valid;
}


let whitelist = [`http://localhost:${process.env.OIDC_PORT}`,
`http://localhost:${process.env.VITE_PORT}`, 
`http://${process.env.VITE_IP}:${process.env.VITE_PORT}`]


expressApp.use(cors({
  origin: function(origin, callback){
    //allow requests with no origin, needed for http.requests file
    if(!origin) return callback(null, true);
    if(!whitelist.includes(origin)){
        console.log(origin)
      var message = "The CORS policy for this origin doesn't allow access from this particular origin.";
      return callback(new Error(message), false);
    }
    return callback(null, true);
  }
}));

 
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