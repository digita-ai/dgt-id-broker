import './style.css'
import CryptoJS from 'crypto-js'

const env = import.meta.env

const code_verifier = generateRandomString(128);
sessionStorage.setItem("pkce_code_verifier", code_verifier);

// Hash and base64-urlencode the secret to use as the challenge
const code_challenge = generateCodeChallenge(code_verifier);

//register client dynamically
async function postRegisterClient(url, data) {
  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

let requestData = {
  "client_name": "My Panva Application",
  "client_id": "bla",
  "redirect_uris": [
    `http://${env.VITE_IP}:${env.VITE_PORT}/requests.html`,
  ],
  "client_secret_expires_at": 0,
};


postRegisterClient(`http://localhost:${env.VITE_OIDC_PORT}/reg`, requestData)
  .then((data) => {
    console.log(data);
  })
  .catch((error) => {
    console.error("Error:", error);
  });

//render login
//window.location = `http://localhost:${env.VITE_OIDC_PORT}/auth?response_type=code&code_challenge=${code_challenge}&code_challenge_method=S256&scope=openid&client_id=test_app&redirect_uri=http%3A%2F%2F${env.VITE_IP}:${env.VITE_PORT}%2Frequests.html`

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
