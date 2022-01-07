# Trade and supply chain application

## Application details

Simulation of a supply chain. The participants send encrypted information and identify themselves via the IOTA tangle. 
IOTA Streams are used to control access to the respective messages and IOTA Identity is used to authenticate the individual participants. 

## Requirements

Hardware and OS tested:
```
* Debian Buster/ Ubuntu 20.04 LTS (WSL)
* x64 Architecture
```

Versions tested:
```
* iota streams 0.1.2
* iota identity-wasm 0.3.4
* iota client 0.6.1
* node 16.13.0
* npm 8.1.0
```

## Installation

Node on Debian:
```
curl -fsSL https :// deb. nodesource . com / setup_16 .x | sudo bash -
apt - get install -y nodejs
```

Application:
```
git clone https://github.com/fprotopapa/iota-trade-and-supply-chain.git
cd iota-trade-and-supply-chain

npm install
npm install ./identity
```

Add environment variables:
```
> nano ∼/. bashrc
∼ export HORNET_NODE_ADDRESS ="<https :// hornetNodeUrl >:< Port >"
∼ export REST_SERVER ="< restServerUrl .com >"
∼ export AUTHOR_PASSWD ="<password for exported binaries >"
> source ∼/. bashrc
```

## Participants

| Participants        | Tasks | Data | Visibility |
| ------------------- | ---- | ----- | ---------- |
| Shipper             | <ul><li>Providing the product</li><li>Deliver to FF</li><li>Accept order</li></ul> | <ul><li>Production status</li><li>Time stamp, Location</li></ul> | <ul><li>Private</li><li>Private</li></ul> |
| Consignee           | <ul><li>Requests product<li>Accepts cargo</li></ul> | <ul><li>Order ID<li>Product condition</li></ul> | <ul><li>Private<li>Private</li></ul> |
| Freight Forwarder   | <ul><li>Receives cargo for delivery</li><li>Export/Import clearance</li><li>Origin handling</li><li>Shipping</li><li>Deliver to consignee</li></ul> | <ul><li>Time stamp, Location</li><li>Document IDs</li><li>Product condition</li><li>Time stamp, Location (Ports, Border)</li><li>Delivery Status</li></ul> | <ul><li>Private</li><li>Public</li><li>Private</li><li>Public</li><li>Private</li></ul>
| Cargo               | <ul><li>Informs about conditions</li></ul> | <ul><li>Time stamp, Location, Temperature</li></ul> | <ul><li>Private</li></ul> |


## Run application

Generate digital identities:
```
cd identity
node generateDids .js
node generateVerifCredentials .js
node generateVerifPresentation .js
cd ..
```

Run application:
```
node main.js
```

To divide the participants among several processes, change global variables accordingly:

* AUTHOR // Enable author
* SUBSCRIBER // True when subscribers active
* CARGO // Enable Cargo
* SIMSUBS // Enable FF, Shipper and Consignee

### Implementation details

* IOTA DLT for data integrity
* IOTA Streams for sharing and securing information
* IOTA Identity for authentication

#### Streams

Channel author is trusted third party:
* Creates channel
* Off-tangle communication over REST-API
* Adds subscribers 
* Authorizes user access 
* Publishes public information on public branch

Subscriber:
* Receiving announcement link
* Subscribing to channel
* Publishing messages on private branch

### Identity

* Fictional Authority proofs participants
* Participants sign their own digital document
* Document saved as JSON
* Enables authentication between participants
