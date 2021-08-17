import './style.css'
import { encode as base64UrlEncode } from "jose/util/base64url";

// Importing the environment variables defined in the .env file.
const env = import.meta.env

console.log('mode: ', env.MODE, ' - token endpoint: ', env.VITE_TOKEN_ENDPOINT)

// Generating a code_verifier for PKCE
const code_verifier = generateRandomString(128);
// Storing the code_verifier in sessionStorage as defined in solid oidc primer: https://solid.github.io/authentication-panel/solid-oidc-primer/#authorization-code-pkce-flow
sessionStorage.setItem("pkce_code_verifier", code_verifier);

// Hash and base64-urlencode the code_verifier to use as the code_challenge. We will send the code_challenge on in the url of our redirect to the /auth endpoint.
// Vite does not allow top level await, so working with '.then()' instead.
generateCodeChallenge(code_verifier).then((code_challenge) => {
  // Redirect the user to the /auth endpoint of the identity provider to get an authentication code which will later be used to get an access token.
  // The necessary parameters are set in the url.
  // Note that you should change the client_id parameter in this url to fit the one you are using. Make sure it is URL-encoded.
  window.location = `http://localhost:${env.VITE_OIDC_PORT}/${env.VITE_AUTH_ENDPOINT}?response_type=code&code_challenge=${code_challenge}&code_challenge_method=S256&scope=openid&client_id=http%3A%2F%2Flocalhost%3A3002%2Fclientapp%2Fprofile&redirect_uri=http%3A%2F%2F${env.VITE_IP}:${env.VITE_PORT}%2Frequests.html`
})

// PKCE HELPER FUNCTIONS
function generateRandomString(length) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(code_verifier) {
  const hash = await window.crypto.subtle.digest("SHA-256", new TextEncoder("utf-8").encode(code_verifier))
  return base64UrlEncode(new Uint8Array(hash))
}
