# fulcrum-api

This is a node.js JavaScript app using the Express.js framework to create a REST API server. The purpose of this app is wrap the [electrum-cash](https://www.npmjs.com/package/electrum-cash) JS library in a REST API. This REST API is intended to be run in a Docker container, in this [docker-fulcrum](https://github.com/Permissionless-Software-Foundation/docker-fulcrum) repository.

From a web-developer's perspective, [Fulcrum](https://github.com/cculianu/Fulcrum) operates on a strange port and has strange API requirements. electrum-cash npm library has strange SSL requirements, and connects to the Electrumx network strangely. Both of these conspire to make it difficult to set up the Fulcrum indexer, load balance it, and interact with it like a normal REST API.

The application wraps Fulcrum and the electrum-cash library in a normal REST API, and is optimized to be operated as a Docker container, for easy dev-ops and load balancing.

# License

[MIT](./LICENSE.md)
