import { generateKeyPair } from 'jose/util/generate_key_pair'
import { fromKeyLike } from 'jose/jwk/from_key_like'
import { SignJWT } from 'jose/jwt/sign'
import { v4 as uuid } from 'uuid'

const env = import.meta.env

const client = `${env.VITE_CLIENT_ID}`
const client_secret = `${env.VITE_CLIENT_SECRET}`
const redirect_uri = `http://${env.VITE_IP}:${env.VITE_PORT}/requests.html`
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

//global variables that are instantiated in instantiateJWTsForDPoP()
let publicKey = ""
let privateKey = ""
let dpopJwtForToken = ""
let dpopJwtForResource = ""


async function postDataToGetAccessToken(url, data, dpopJwtForToken) {
    const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: {
            'DPoP': dpopJwtForToken
        },
        body: data
    });
    return response.json(); // parses JSON response into native JavaScript objects
}

async function getResource(url, access_token, dpopJwtForResource) {
    const response = await fetch(url, {
        method: 'get',
        headers: {
            'Authorization': 'DPoP ' + access_token,
            'DPoP': dpopJwtForResource
        }
    });
    return response.text();
}

const formDataForAccessToken = new FormData();
formDataForAccessToken.append('grant_type', 'authorization_code');
formDataForAccessToken.append('code', code);
formDataForAccessToken.append('client_id', client);
formDataForAccessToken.append('client_secret', client_secret);
formDataForAccessToken.append('redirect_uri', redirect_uri);
const code_verifier = sessionStorage.getItem("pkce_code_verifier")
formDataForAccessToken.append('code_verifier', code_verifier);

const formDataToSendForAccessToken = new URLSearchParams(formDataForAccessToken)

instantiateJWTsForDPoP()
.then(() => {
    postDataToGetAccessToken(`http://localhost:${env.VITE_OIDC_PORT}/token`, formDataToSendForAccessToken, dpopJwtForToken)
    .then(data => {
        getResource("http://localhost:3002/jaspervandenberghen/profile/", data.access_token, dpopJwtForResource)
            .then(data => {
                data = data.replace(/</g, "&lt;")
                data = data.replace(/>/g, "&gt;")
                const div = document.getElementById("app");
                div.textContent = ""
                const h1 = document.createElement("h1")
                h1.innerHTML = "Your profile:";
                const p = document.createElement("pre");
                p.innerHTML = data;
                div.appendChild(h1);
                div.appendChild(p);
                sessionStorage.clear();
            })
    })
});

// The lines in this function used to be on the top-level, however Vite does not allow top-level usage of "await", so this function was created to fix that.
async function instantiateJWTsForDPoP() {
    const keys = await generateKeyPair('ES256');
    publicKey = keys.publicKey
    console.log("test", publicKey)
    privateKey = keys.privateKey
    const publicJwk = await fromKeyLike(publicKey)

    dpopJwtForToken = await new SignJWT({
        'htm': 'POST',
        'htu': 'http://localhost:3000/token',
    })
        .setProtectedHeader({
            alg: 'ES256',
            typ: 'dpop+jwt',
            jwk: publicJwk
        })
        .setJti(uuid())
        .setIssuedAt()
        .sign(privateKey)

    console.log(dpopJwtForToken)
    dpopJwtForResource = await new SignJWT({
        'htm': 'GET',
        'htu': 'http://localhost:3002/jaspervandenberghen/profile/',
    })
        .setProtectedHeader({
            alg: 'ES256',
            typ: 'dpop+jwt',
            jwk: publicJwk
        })
        .setJti(uuid())
        .setIssuedAt()
        .sign(privateKey)
}
