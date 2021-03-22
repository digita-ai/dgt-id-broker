const express = require('express');
const Provider = require('oidc-provider');
require('dotenv').config();

const app = new express();

const configuration = {
    clients: [{
        client_id: 'test_app',
        client_secret: 'super_secret',
        grant_types: ['authorization_code'],
        response_types: ['code'],
        redirect_uris: [`http://192.168.0.10:${VITE_PORT}/requests.html`]
    }],
    claims: {
        email: ['email', 'email_verified'],
        phone: ['phone_number', 'phone_number_verified'],
        profile: ['birthdate', 'family_name', 'gender', 'given_name', 'locale', 'middle_name', 'name', 'nickname', 'picture', 'preferred_username', 'profile', 'updated_at', 'website', 'zoneinfo']
    },
    scopes: ['api1'],
    features: {
        clientCredentials: {enabled: true},
        introspection: {enabled: true}
    },
    pkce: {
        required: () => false
    }

    
}

const oidc = new Provider(`http://localhost:${PORT}`, configuration);

app.use('/', oidc.callback());

oidc.listen(PORT, () => {
    console.log(`oidc-provider listening on port ${PORT}, check http://localhost:${PORT}/.well-known/openid-configuration`);
  });

