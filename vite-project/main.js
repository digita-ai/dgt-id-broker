import './style.css'

const env = import.meta.env
console.log(env)

document.querySelector('#app').innerHTML = `
  <h1>Hello Vite!</h1>
  <a href="https://vitejs.dev/guide/features.html" target="_blank">Documentation</a>
`
window.location = `http://localhost:${env.VITE_OIDC_PORT}/auth?response_type=code&scope=openid profile&client_id=test_app&redirect_uri=http%3A%2F%2F${env.VITE_IP}:${env.VITE_PORT}%2Frequests.html`

