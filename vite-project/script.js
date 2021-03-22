const params = new URLSearchParams(window.location.search);
const id_token = params.get("code");

console.log(id_token)

