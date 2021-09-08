import './style.css'
import { SolidOidcClient, LocalStorageStore } from "@digita-ai/dgt-id-kit"

const env = import.meta.env

localStorage.removeItem('localStorageStore')

const store = new LocalStorageStore();

const solidOidcClient = new SolidOidcClient(store, false, `${env.VITE_CLIENT_ID}`)

solidOidcClient.loginWithIssuer(`http://localhost:${env.VITE_OIDC_PORT}`, 'openid', `http://${env.VITE_IP}:${env.VITE_PORT}/requests.html`)
