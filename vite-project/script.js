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
        body: data
    });
    return response.json(); // parses JSON response into native JavaScript objects
}

async function getResource(url, access_token) {
    const response = await fetch(url, {
        method: 'get',
        headers: { 'Authorization': 'Bearer ' + access_token }
    });
    return response.text();
}

let formData = new FormData();
formData.append('grant_type', 'authorization_code');
formData.append('code', code);
formData.append('client_id', client);
formData.append('client_secret', client_secret);
formData.append('redirect_uri', redirect_uri);
// console.log(localStorage.getItem("pkce_code_verifier"))
// formData.append('code_verifier', localStorage.getItem("pkce_code_verifier"));

let formDataToSend = new URLSearchParams(formData)


postDataToGetAccessToken(`http://localhost:${env.VITE_OIDC_PORT}/token`, formDataToSend)
    .then(data => {
        console.log(data)
        console.log("----- access_token:" + data.access_token, "-----------", "id_token:" + data.id_token); // JSON data parsed by `data.json()` call
        // getResource("http://localhost:3000/abelvandenbriel/profile/", data.access_token)
        //   .then(data => {
        //     console.log(data)
        //     data = data.replace(/</g, "&lt;")
        //     data = data.replace(/>/g, "&gt;")
        //     const div = document.getElementById("content");
        //     div.textContent = ""
        //     const h1 = document.createElement("h1")
        //     h1.innerHTML = "Your profile:";
        //     const p = document.createElement("pre");
        //     p.innerHTML = data;
        //     div.appendChild(h1);
        //     div.appendChild(p);
        //   })
    });