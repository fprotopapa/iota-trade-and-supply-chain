# Trade and supply chain application

## Implementation details

| Participants        | Tasks | Data | Visibility |
| ------------------- | ---- | ----- | ---------- |
| Shipper             | <ul><li>Providing the product</li><li>Deliver to FF</li></ul> | <ul><li>Production status</li><li>Time stamp, Location</li></ul> | <ul><li>Private</li><li>Private</li></ul> |
| Consignee           | <ul><li>Requests product<li>Accepts cargo</li></ul> | <ul><li>Order ID<li>Product condition</li></ul> | <ul><li>Private<li>Private</li></ul> |
| Freight Forwarder   | <ul><li>Receives cargo for delivery</li><li>Export/Import clearance</li><li>Origin handling</li><li>Shipping</li><li>Deliver to consignee</li></ul> | <ul><li>Time stamp, Location</li><li>Document IDs</li><li>Product condition</li><li>Time stamp, Location (Ports, Border)</li><li>Time stamp, Location</li></ul> | <ul><li>Private</li><li>Public</li><li>Private</li><li>Public</li><li>Private</li></ul>
| Cargo               | <ul><li>Informs about conditions</li></ul> | <ul><li>Time stamp, Location, Temperature</li></ul> | <ul><li>Private</li></ul> |

