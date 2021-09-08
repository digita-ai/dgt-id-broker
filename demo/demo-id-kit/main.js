import './style.css'
import { SolidOidcClient, LocalStorageStore } from "@digita-ai/dgt-id-kit"

const env = import.meta.env

// clearing localStorage because we are reinitializing the store here anyway
localStorage.removeItem('localStorageStore')

// create the store
const store = new LocalStorageStore();

// create the client and initialize it
const solidOidcClient = new SolidOidcClient(store, false, `${env.VITE_CLIENT_ID}`)

// login to the issuer and redirect to our redirectUri
solidOidcClient.loginWithIssuer(`http://localhost:${env.VITE_OIDC_PORT}`, 'openid', `http://${env.VITE_IP}:${env.VITE_PORT}/requests.html`)
