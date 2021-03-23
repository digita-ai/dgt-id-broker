import { sha256 } from 'js-sha256';
const base_uri = "http://localhost:8080/auth/realms/master/protocol/openid-connect"

//Set this to true to continue testing with pkce.
const pkce = false;

// Create and store a new PKCE code_verifier (the plaintext random secret)
const code_verifier = generateRandomString(128);
console.log(code_verifier)
localStorage.setItem("pkce_code_verifier", code_verifier);

// Hash and base64-urlencode the secret to use as the challenge
const code_challenge = pkceChallengeFromVerifier(code_verifier);
console.log(code_challenge)

console.log(base_uri + `/auth?response_type=code&code_challenge=${code_challenge}&code_challenge_method=S256&scope=openid&client_id=account&redirect_uri=http%3A%2F%2F<YOUR_IP_HERE>:3001%2Fcallback.html`)

//redirects with either pkce parameters or not (code_challenge and code_challenge_method)
if (pkce){
  window.location = base_uri + `/auth?response_type=code&code_challenge=${code_challenge}&code_challenge_method=S256&scope=openid&client_id=account&redirect_uri=http%3A%2F%2F<YOUR_IP_HERE>:3001%2Fcallback.html`
}
else (
  window.location = base_uri + `/auth?response_type=code&scope=openid&client_id=account&redirect_uri=http%3A%2F%2F<YOUR_IP_HERE>:3001%2Fcallback.html`
)



// PKCE HELPER FUNCTIONS

// Generate a secure random string using the browser crypto functions
function generateRandomString() {
  var array = new Uint32Array(28);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
}

// Base64-urlencodes the input string
function base64urlencode(str) {
  return btoa(str).replace(/=/g, '');
}

// Return the base64-urlencoded sha256 hash for the PKCE challenge
function pkceChallengeFromVerifier(v) {
  // const array = Array.from(v);
  // const string = array.map(c => c.charCodeAt(0)).join('')
  const hashed = sha256(v);
  return base64urlencode(hashed);
}