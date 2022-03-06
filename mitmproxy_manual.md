# Description

The following will show how to run Digita id broker with a packet analyzer in front of each component. This allows having a clear view of the communication happening between each element ( keycloak, CSS pod, the demo client, and the id broker ). It has been built for educational purposes but can be helpful in debugging or security auditing context. 

# Install
Digita installation
Get a token from github with `repo` and `package:read` scope
run in a termanl `export NPM_TOKEN=<my_gh_token>`
switch to the mitmproxy demo branch
then in the root of the repo:
```
npm run clean
npm run bootstrap
npm run build:all
```
proxy installation
install a proxy. In how case we use mitmproxy but any other tool will do ( like wireshark )

# Usage
In the root directory:
`npm run demo:mitmproxy`
Then edit keycloak config to allow all redirect URI. Go to localhost:8080 then:
realms: Digita -> Clients -> Static-client -> Valid Redirect URIs: `*`

Finally, launch four instances of your favorite packet analyzer. With MITMproxy:
```
# analyse the client's packet
mitmproxy --mode reverse:http://localhost:3001 
-p 9001 --set keep_host_header=true
# analyse the pod 's packet
mitmproxy --mode reverse:http://localhost:3002 -p 9002 --set keep_host_header=true
# analyse Digita proxy's packet
mitmproxy --mode reverse:http://localhost:3003 -p 9003 --set keep_host_header=true
# analyse keycloak's packet
mitmproxy --mode reverse:http://localhost:8080 -p 9080 --set keep_host_header=true
```))
