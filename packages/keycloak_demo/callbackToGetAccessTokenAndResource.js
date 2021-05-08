const env = import.meta.env

//change this to what your keycloak server is running on, and what is the base url for your instance.
const base_url_to_idp = "http://localhost:8080/auth/realms/master/protocol/openid-connect"
//change this to your solid profile url.
const solid_profile_url = `http://localhost:3002/abelvandenbriel/profile/`
//change this to the port your vite app runs on.
const vite_port = "3000"

const client = "account"
const client_secret = "939aba89-3911-4cc3-b94b-0af2690079f6"
const redirect_uri =  `http://localhost:${vite_port}/callback.html`


const params = (new URL(document.location)).searchParams;
const code = params.get("code")

async function postDataToGetAccessToken(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    body: data
  });
  return response.json(); // parses JSON response into native JavaScript objects
}

async function getResource(url, access_token) {
  const response = await fetch(url, {
    method: 'get',
    headers: { 'Authorization': 'Bearer ' + access_token}
  });
  return response.text();
}

let formData = new FormData();
formData.append('grant_type', 'authorization_code');
formData.append('code', code);
formData.append('client_id', client);
formData.append('client_secret', client_secret);
formData.append('redirect_uri', redirect_uri);
formData.append('code_verifier', localStorage.getItem("pkce_code_verifier"));

let formDataToSend = new URLSearchParams(formData)



postDataToGetAccessToken( base_url_to_idp + '/token', formDataToSend)
  .then(data => {
    getResource(solid_profile_url, data.access_token)
      .then(data => {
        data = data.replace(/</g, "&lt;")
        data = data.replace(/>/g, "&gt;")
        const div = document.getElementById("content");
        div.textContent = ""
        const h1 = document.createElement("h1")
        h1.innerHTML = "Your profile:";
        const p = document.createElement("pre");
        p.innerHTML = data;
        div.appendChild(h1);
        div.appendChild(p);
      })
  });