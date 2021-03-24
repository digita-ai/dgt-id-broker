const env = import.meta.env

const client = "test_app"
const client_secret = "super_secret"
const redirect_uri = `http://${env.VITE_IP}:${env.VITE_PORT}/requests.html`
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

console.log(code)

async function postDataToGetAccessToken(url, data) {
    const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        body: data
    });
    return response.json(); // parses JSON response into native JavaScript objects
}

async function postAccessTokenForIntrospection(url, data) {
    const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Accept': 'application/token-introspection+jwt',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + 'dGVzdF9hcHA6c3VwZXJfc2VjcmV0'
        },
        body: data
    });
    return response.text();
}

async function getResource(url, access_token) {
    const response = await fetch(url, {
        method: 'get',
        headers: { 'Authorization': 'Bearer ' + access_token }
    });
    return response.text();
}

const formDataForAccessToken = new FormData();
formDataForAccessToken.append('grant_type', 'authorization_code');
formDataForAccessToken.append('code', code);
formDataForAccessToken.append('client_id', client);
formDataForAccessToken.append('client_secret', client_secret);
formDataForAccessToken.append('redirect_uri', redirect_uri);
// formDataForAccessToken.append('resource', 'http://example.com');
// console.log(localStorage.getItem("pkce_code_verifier"))
// formDataForAccessToken.append('code_verifier', localStorage.getItem("pkce_code_verifier"));

const formDataToSendForAccessToken = new URLSearchParams(formDataForAccessToken)


postDataToGetAccessToken(`http://localhost:${env.VITE_OIDC_PORT}/token`, formDataToSendForAccessToken)
    .then(data => {
        console.log(data)
        console.log("----- access_token:" + data.access_token, "-----------", "id_token:" + data.id_token); // JSON data parsed by `data.json()` call
        getResource("http://localhost:3002/jaspervandenberghen/profile/", data.access_token)
            .then(data => {
                console.log(data)
                data = data.replace(/</g, "&lt;")
                data = data.replace(/>/g, "&gt;")
                const div = document.getElementById("app");
                div.textContent = ""
                const h1 = document.createElement("h1")
                h1.innerHTML = "Your profile:";
                const p = document.createElement("pre");
                p.innerHTML = data;
                div.appendChild(h1);
                div.appendChild(p);
            })
    });