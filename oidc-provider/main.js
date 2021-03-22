const express = require('express');
const Provider = require('oidc-provider');

const app = new express();

const configuration = {
    clients: [{
        client_id: 'test_app',
        client_secret: 'super_secret',
        grant_types: ['authorization_code'],
        response_types: ['code'],
        redirect_uris: ['http://192.168.0.10:3001/requests.html']
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

const oidc = new Provider('http://localhost:3000', configuration);

app.use('/', oidc.callback());

oidc.listen(3000, () => {
    console.log('oidc-provider listening on port 3000, check http://localhost:3000/.well-known/openid-configuration');
  });

