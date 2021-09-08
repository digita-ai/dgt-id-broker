import './style.css'
import { SolidOidcClient, LocalStorageStore } from "@digita-ai/dgt-id-kit"

const env = import.meta.env

const store = new LocalStorageStore();

const solidOidcClient = new SolidOidcClient(store)

const init = async () => { 
  await solidOidcClient.initialize(`${env.VITE_CLIENT_ID}`);
  console.log(localStorage.getItem('localStorageStore'))
}

init().then(() => {
  console.log(solidOidcClient)
  solidOidcClient.loginWithIssuer(`http://localhost:${env.VITE_OIDC_PORT}`, 'openid', `http://${env.VITE_IP}:${env.VITE_PORT}/requests.html`)
})
