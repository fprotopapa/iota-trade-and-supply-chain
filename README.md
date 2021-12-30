# Trade and supply chain application

## Application details

### Participants

| Participants        | Tasks | Data | Visibility |
| ------------------- | ---- | ----- | ---------- |
| Shipper             | <ul><li>Providing the product</li><li>Deliver to FF</li></ul> | <ul><li>Production status</li><li>Time stamp, Location</li></ul> | <ul><li>Private</li><li>Private</li></ul> |
| Consignee           | <ul><li>Requests product<li>Accepts cargo</li></ul> | <ul><li>Order ID<li>Product condition</li></ul> | <ul><li>Private<li>Private</li></ul> |
| Freight Forwarder   | <ul><li>Receives cargo for delivery</li><li>Export/Import clearance</li><li>Origin handling</li><li>Shipping</li><li>Deliver to consignee</li></ul> | <ul><li>Time stamp, Location</li><li>Document IDs</li><li>Product condition</li><li>Time stamp, Location (Ports, Border)</li><li>Time stamp, Location</li></ul> | <ul><li>Private</li><li>Public</li><li>Private</li><li>Public</li><li>Private</li></ul>
| Cargo               | <ul><li>Informs about conditions</li></ul> | <ul><li>Time stamp, Location, Temperature</li></ul> | <ul><li>Private</li></ul> |

### Implementation details

* IOTA DLT for data integrity
* IOTA Streams for sharing and securing information
* IOTA Identity for authentication

#### Streams

Channel author is trusted third party:
* Creates channel
* Sends announcement link to participants (Rest API with order ID)
* Adds subscribers (Needs subs Public Key (Rest API, after authentication)) 
* Encrypts communication (Pub/Prv Keys)
* Authorizes user access (Sends Keyload)
* Publishes public information on public branch (Signed messages)

Subscriber:
* Receiving announcement link
* Subscribing to channel
* Sending Public Key to author
* Publishing messages on private branch

### Identity

```
npm install ./identity
```


