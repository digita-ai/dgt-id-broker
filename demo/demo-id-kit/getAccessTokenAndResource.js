import { SolidOidcClient, LocalStorageStore } from "@digita-ai/dgt-id-kit"

// Importing the environment variables defined in the .env file.
const env = import.meta.env

const store = new LocalStorageStore();

const solidOidcClient = new SolidOidcClient(store)

const loggedIn = async () => {
    const accessToken = await store.get('accessToken')
    return accessToken !== undefined
}

console.log(localStorage.getItem('localStorageStore'))

loggedIn().then((logged) => {
    console.log(logged)
    if (!logged) {
        solidOidcClient.handleIncomingRedirect(`http://localhost:${env.VITE_OIDC_PORT}`, `http://${env.VITE_IP}:${env.VITE_PORT}/requests.html`).then(() => {
            solidOidcClient.accessResource(`${env.VITE_RESOURCE_URI}`, 'GET').then(async (data) => {
                let text = await data.text();
                if (data.headers.get('content-type') === 'text/turtle'){
                    text = text.replace(/</g, "&lt;")
                    text = text.replace(/>/g, "&gt;")                      
                }
                const div = document.getElementById("app");
                div.textContent = ""
                const p = document.createElement("pre");
                p.innerHTML = text;
                div.appendChild(p);
            });
        })
    } else {
        solidOidcClient.accessResource(`${env.VITE_RESOURCE_URI}`, 'GET').then(async (data) => {
            let text = await data.text();
            if (data.headers.get('content-type') === 'text/turtle'){
                text = text.replace(/</g, "&lt;")
                text = text.replace(/>/g, "&gt;")                      
            }
            const div = document.getElementById("app");
            div.textContent = ""
            const p = document.createElement("pre");
            p.innerHTML = text;
            div.appendChild(p);
        });
    }
} )

