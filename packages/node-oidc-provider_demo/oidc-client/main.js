import './style.css'
import CryptoJS from 'crypto-js'

// Importing the environment variables defined in the .env file.
const env = import.meta.env

// Generating a code_verifier for PKCE
const code_verifier = generateRandomString(128);
// Storing the code_verifier in sessionStorage as defined in solid oidc primer: https://solid.github.io/authentication-panel/solid-oidc-primer/#authorization-code-pkce-flow
sessionStorage.setItem("pkce_code_verifier", code_verifier);

// Hash and base64-urlencode the code_verifier to use as the code_challenge. We will send the code_challenge on in the url of our redirect to the /auth endpoint.
const code_challenge = generateCodeChallenge(code_verifier);

// Post request for dynamic client registration
async function postRegisterClient(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

// let requestData = {
//   "client_name": "My Client Application",
//   "client_id": "http://localhost:3002/myclientapplication/profile/card#me",
//   "redirect_uris": [
//     `http://${env.VITE_IP}:${env.VITE_PORT}/requests.html`
//   ],
// };

// // Dynamically register a test client
// postRegisterClient(`http://localhost:${env.VITE_OIDC_PORT}/reg`, requestData)
//   .then((data) => {
//     console.log(data);
//   })
//   .catch((error) => {
//     console.error("Error:", error);
//   }); 

// Redirect the user to the /auth endpoint of the identity provider to get an authentication code which will later be used to get an access token.
// The necessary parameters are set in the url.
// Note that you should change the client_id parameter in this url to fit the one you are using. Make sure it is URL-encoded.
window.location = `http://localhost:${env.VITE_OIDC_PORT}/auth?response_type=code&code_challenge=${code_challenge}&code_challenge_method=S256&scope=openid%20offline_access&client_id=http%3A%2F%2Flocalhost:3002%2Fjaspervandenberghen%2Fprofile%2Fcard%23me&redirect_uri=http%3A%2F%2F${env.VITE_IP}:${env.VITE_PORT}%2Frequests.html`


// PKCE HELPER FUNCTIONS
function generateRandomString(length) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function generateCodeChallenge(code_verifier) {
  return base64URL(CryptoJS.SHA256(code_verifier))
}

function base64URL(string) {
  return string.toString(CryptoJS.enc.Base64).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
