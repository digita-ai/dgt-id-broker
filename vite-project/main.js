import './style.css'

document.querySelector('#app').innerHTML = `
  <h1>Hello Vite!</h1>
  <a href="https://vitejs.dev/guide/features.html" target="_blank">Documentation</a>
`
window.location = "http://localhost:3000/auth?response_type=code&nonce=123&scope=openid&client_id=test_app&redirect_uri=http%3A%2F%2F192.168.0.10:3001%2Frequests.html"

