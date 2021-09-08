import { SolidOidcClient, LocalStorageStore } from "@digita-ai/dgt-id-kit"

// Importing the environment variables defined in the .env file.
const env = import.meta.env

// create the store
const store = new LocalStorageStore();

// create the client, but don't initialize it
const solidOidcClient = new SolidOidcClient(store, true);

// tells us if the store contains an access token and the user is "logged in"
const loggedIn = async () => {
    const accessToken = await store.get('accessToken')
    return accessToken !== undefined
}

// check if the user is logged in
loggedIn().then((logged) => {
    // if they are not...
    if (!logged) {
        // check if the url contains a code and if it does, handle the redirect, get an access token, and send a resource access request.
        if (new URLSearchParams(window.location.search).has('code')) {
            solidOidcClient.handleIncomingRedirect(`http://localhost:${env.VITE_OIDC_PORT}`, `http://${env.VITE_IP}:${env.VITE_PORT}/requests.html`).then(() => {
                logoutButtonAndAccessResource()
            })
        }
        // if the url doesn't contain a code show the login button.
        else {
            const div = document.getElementById("buttonDiv");
            div.textContent = '';
            const button = document.createElement("button");
            button.textContent = 'Login'
            // clicking the login button redirects the user to main.js where we send a login request.
            button.addEventListener('click', () => window.location.href = `http://localhost:${env.VITE_PORT}`);
            div.appendChild(button);
        }
    
    // if they are logged in...
    } else {
        // show the logout button and send a resource access request.
        logoutButtonAndAccessResource()
    }
})

// We use this twice, so put it in a seperate function to minimize redundant code.
const logoutButtonAndAccessResource = async () => {
    // create a logout button that, when clicked, tells the client to log out (removes all tokens) and redirects the user to the this page to make sure they don't see the resource anymore.
    const div = document.getElementById("buttonDiv");
    div.textContent = '';
    const button = document.createElement("button");
    button.textContent = 'Logout'
    button.addEventListener('click', async () => {
        await solidOidcClient.logout()
        window.location.href = `http://localhost:${env.VITE_PORT}/requests.html`;
    });
    div.appendChild(button);

    // send a request to access a resource and show the html of that page.
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

