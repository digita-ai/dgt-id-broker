import { generateKeyPair } from 'jose/util/generate_key_pair'
import { fromKeyLike } from 'jose/jwk/from_key_like'
import { SignJWT } from 'jose/jwt/sign'
import { v4 as uuid } from 'uuid'
import { Buffer } from 'buffer'
import { encode as base64UrlEncode } from "jose/util/base64url";

// Importing the environment variables defined in the .env file.
const env = import.meta.env

// Instantiating variables we will need later on.
const client = `${env.VITE_CLIENT_ID}`
// Note that the WebID flow of Solid-OIDC does not require a client secret. However, if you wish to use a different flow that uses a client secret,
// this will need to be defined and sent along.
const client_secret = `${env.VITE_CLIENT_SECRET}`
const redirect_uri = `http://${env.VITE_IP}:${env.VITE_PORT}/requests.html`

// When our request in main.js to the /auth endpoint of the identity provider succeeds we get redirected to the page on which this script runs, because we specified it as
// our redirect URI.
// The redirect adds the authentication code we requested to the url parameters, which we read here.
const params = new URLSearchParams(window.location.search);
// Get the authentication code to request an access token from the URL parameters.
const code = params.get("code");

// Global variables that are instantiated in instantiateJWTsForDPoP()
let publicJwk;
let privateKey;

// Post request to get an access token
async function postDataToGetAccessToken(url, data) {
    // Create the DPoP-proof for the token request.
    const dpopJwtForToken = await new SignJWT({
        // Each DPoP-proof needs to say what type of request it is making and to where to be valid.
        'htm': 'POST',
        'htu': `http://localhost:3003/${env.VITE_TOKEN_ENDPOINT}`,
    })
        // set the necessary headers and body of our JWT with the necessary components as prescribed by the spec.
        .setProtectedHeader({
            alg: 'ES256',
            typ: 'dpop+jwt',
            jwk: publicJwk
        })
        .setJti(uuid())
        .setIssuedAt()
        // Sign the JWT with our private key. Since we add our public key as a jwk in the headers, this can be used to verify we are making the request.
        .sign(privateKey)

    const response = await fetch(url, {
        method: 'POST',
        // We add our DPoP proof to the headers.
        headers: {
            'DPoP': dpopJwtForToken
        },
        body: data
    });
    return response.json();
}

// Get request to the resource we are attempting to view.
async function getResource(url, access_token) {

    console.log(access_token)
    // Use web crypto, because normal crypto is not available in the browser
    const digest = await window.crypto.subtle.digest("SHA-256", Buffer.from(access_token, "ascii"))
    // digest() returns an ArrayBuffer, but we need a Uint8Array, so we transform it, then base64 URL encode it
    const ath = base64UrlEncode(new Uint8Array(digest));
    console.log(ath)

    // Create the DPoP-proof for the resource server request.
    const dpopJwtForResource = await new SignJWT({
        'htm': 'GET',
        'htu': `${env.VITE_RESOURCE_URI}`,
        'ath': ath
    })
        .setProtectedHeader({
            alg: 'ES256',
            typ: 'dpop+jwt',
            jwk: publicJwk
        })
        .setJti(uuid())
        .setIssuedAt()
        .sign(privateKey)


    const response = await fetch(url, {
        method: 'get',
        headers: {
            // Add the DPoP-bound Access Token we received from the /token endpoint to the Authorization header
            'Authorization': 'DPoP ' + access_token,
            // Add our DPoP proof to the headers.
            'DPoP': dpopJwtForResource
        }
    });
    return response;
} 

// Build our form data with all the necessary parameters, which we will send in our post request.
const formDataForAccessToken = new FormData();
formDataForAccessToken.append('grant_type', 'authorization_code');
formDataForAccessToken.append('code', code);
formDataForAccessToken.append('client_id', client);
// Client secret is not set for the WebID flow. Uncomment this if you need it.
// formDataForAccessToken.append('client_secret', client_secret);
formDataForAccessToken.append('redirect_uri', redirect_uri);
// Get our code verifier from session storage, because we need to send it again for PKCE validation.
const code_verifier = sessionStorage.getItem("pkce_code_verifier")
formDataForAccessToken.append('code_verifier', code_verifier);

// Adding a FormData object to the body of a post request does not work, so we convert it here.
const formDataToSendForAccessToken = new URLSearchParams(formDataForAccessToken)

// Call to instantiate our key pair which will be used to sign our DPoP proofs. Needs to be in a function because vite does not allow top level
// await calls.
createKeyPair()
    .then(() => {
        // Create our dpop proof and send the post request to get a token, along with our data encoded as formdata
        postDataToGetAccessToken(`http://localhost:${env.VITE_OIDC_PORT}/${env.VITE_TOKEN_ENDPOINT}`, formDataToSendForAccessToken)
            .then(data => {
                // The "data" object now contains our access_token if the request was successful. We can send it on to the resource server to get the requested resource,
                // along with a new DPoP-proof.
                getResource(`${env.VITE_RESOURCE_URI}`, data.access_token)
                    .then(async data => {
                        // In this case we simply get the profile of our solid pod. The rest of this function simply preserves the formatting of the html we receive.
                        let text = await data.text();
                        if (data.headers.get('content-type') === 'text/turtle'){
                            text = text.replace(/</g, "&lt;")
                            text = text.replace(/>/g, "&gt;")                      
                        }
                        const div = document.getElementById("app");
                        div.textContent = ""
                        const p = document.createElement("pre");
                        p.innerHTML = text;
                        div.appendChild(p);
                        
                        // Clear our sessionStorage when we are done as prescribed by the solid oidc primer.
                        sessionStorage.clear();
                    })
            })
    });


async function createKeyPair() {
    // Generate a public and private key, which we will use to sign our JWTs.
    const keyPair = await generateKeyPair('ES256');
    privateKey = keyPair.privateKey
    // Create a JWK of our public key, which we will need for our JWT DPoP-proof.
    publicJwk = await fromKeyLike(keyPair.publicKey)
}
