import { SolidOidcClient, LocalStorageStore } from "@digita-ai/dgt-id-kit"

// Importing the environment variables defined in the .env file.
const env = import.meta.env

const store = new LocalStorageStore();

const solidOidcClient = new SolidOidcClient(store, true);

const loggedIn = async () => {
    const accessToken = await store.get('accessToken')
    return accessToken !== undefined
}

loggedIn().then((logged) => {
    if (!logged) {
        if (new URLSearchParams(window.location.search).has('code')) {
            solidOidcClient.handleIncomingRedirect(`http://localhost:${env.VITE_OIDC_PORT}`, `http://${env.VITE_IP}:${env.VITE_PORT}/requests.html`).then(() => {
                logoutButtonAndAccessResource()
            })
        }
        else {
            const div = document.getElementById("buttonDiv");
            div.textContent = '';
            const button = document.createElement("button");
            button.textContent = 'Login'
            button.addEventListener('click', () => window.location.href = `http://localhost:${env.VITE_PORT}`);
            div.appendChild(button);
        }
        
    } else {
        logoutButtonAndAccessResource()
    }
})

const logoutButtonAndAccessResource = async () => {
    const div = document.getElementById("buttonDiv");
    div.textContent = '';
    const button = document.createElement("button");
    button.textContent = 'Logout'
    button.addEventListener('click', async () => {
        await solidOidcClient.logout()
        window.location.href = `http://localhost:${env.VITE_PORT}/requests.html`;
    });
    div.appendChild(button);

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

