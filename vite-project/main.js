import './style.css'

const env = import.meta.env

//register client dynamically
async function postRegisterClient(url, data) {
  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": `http://localhost:${env.VITE_PORT}`,
    },
    body: JSON.stringify(data),
  });
  return response.json(); 
}
let requestData = {
  "client_name": "My Panva Application",
  "client_id": `${env.VITE_CLIENT_ID}`,
  "client_secret": `${env.VITE_CLIENT_SECRET}`,
  "redirect_uris": [
    `http://${env.VITE_IP}:${env.VITE_PORT}/requests.html`,
  ],
  "client_secret_expires_at": 0,
};



console.log("Data: " + requestData)

postRegisterClient(`http://localhost:${env.VITE_OIDC_PORT}/reg`, requestData)
  .then((data) => {
    console.log(data);
  })
  .catch((error) => {
    console.error("Error:", error);
  });

//render login
window.location = `http://localhost:${env.VITE_OIDC_PORT}/auth?response_type=code&scope=openid&client_id=test_app&redirect_uri=http%3A%2F%2F${env.VITE_IP}:${env.VITE_PORT}%2Frequests.html`