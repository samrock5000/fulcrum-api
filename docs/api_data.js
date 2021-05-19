define({ "api": [
  {
    "type": "get",
    "url": "/electrumx/balance/{addr}",
    "title": "Get balance for a single address.",
    "name": "Balance_for_a_single_address",
    "group": "ElectrumX_/_Fulcrum",
    "description": "<p>Returns an object with confirmed and unconfirmed balance associated with an address.</p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "curl -X GET \"https://fulcrum-api.fullstackbch.nl/v1/electrumx/balance/bitcoincash:qr69kyzha07dcecrsvjwsj4s6slnlq4r8c30lxnur3\" -H \"accept: application/json\"",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "src/routes/v1/electrumx.js",
    "groupTitle": "ElectrumX_/_Fulcrum"
  },
  {
    "type": "post",
    "url": "/electrumx/balance",
    "title": "Get balances for an array of addresses.",
    "name": "Balances_for_an_array_of_addresses",
    "group": "ElectrumX_/_Fulcrum",
    "description": "<p>Returns an array of balanes associated with an array of address. Limited to 20 items per request.</p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "curl -X POST \"https://fulcrum-api.fullstackbch.nl/v1/electrumx/balance\" -H \"accept: application/json\" -H \"Content-Type: application/json\" -d '{\"addresses\":[\"bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf\",\"bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf\"]}'",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "src/routes/v1/electrumx.js",
    "groupTitle": "ElectrumX_/_Fulcrum"
  },
  {
    "type": "get",
    "url": "/electrumx/block/headers/{height}",
    "title": "Get `count` block headers starting at a height",
    "name": "Block_header_data_for_a_`count`_blocks_starting_at_a_block_height",
    "group": "ElectrumX_/_Fulcrum",
    "description": "<p>Returns an array with block headers starting at the block height</p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "curl -X GET \"https://fulcrum-api.fullstackbch.nl/v1/electrumx/block/header/42?count=2\" -H \"accept: application/json\"",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "src/routes/v1/electrumx.js",
    "groupTitle": "ElectrumX_/_Fulcrum"
  },
  {
    "type": "post",
    "url": "/electrumx/block/headers",
    "title": "Get block headers for an array of height + count pairs",
    "name": "Block_headers_for_an_array_of_height_+_count_pairs",
    "group": "ElectrumX_/_Fulcrum",
    "description": "<p>Returns an array of objects with blockheaders of an array of TXIDs. Limited to 20 items per request.</p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "curl -X POST \"https://fulcrum-api.fullstackbch.nl/v1/electrumx/block/headers\" -H \"accept: application/json\" -H \"Content-Type: application/json\" -d '{\"heights\":[{ \"height\": 42, count: 2 }, { \"height\": 100, count: 5 }]}'",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "src/routes/v1/electrumx.js",
    "groupTitle": "ElectrumX_/_Fulcrum"
  },
  {
    "type": "post",
    "url": "/electrumx/tx/broadcast",
    "title": "Broadcast a raw transaction",
    "name": "Broadcast_a_raw_transaction",
    "group": "ElectrumX_/_Fulcrum",
    "description": "<p>Broadcast a raw transaction and return the transaction ID on success or error on failure.</p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "curl -X POST \"https://fulcrum-api.fullstackbch.nl/v1/electrumx/tx/broadcast\" -H \"accept: application/json\" -H \"Content-Type: application/json\" -d '{\"txHex\":\"020000000265d13ef402840c8a51f39779afb7ae4d49e4b0a3c24a3d0e7742038f2c679667010000006441dd1dd72770cadede1a7fd0363574846c48468a398ddfa41a9677c74cac8d2652b682743725a3b08c6c2021a629011e11a264d9036e9d5311e35b5f4937ca7b4e4121020797d8fd4d2fa6fd7cdeabe2526bfea2b90525d6e8ad506ec4ee3c53885aa309ffffffff65d13ef402840c8a51f39779afb7ae4d49e4b0a3c24a3d0e7742038f2c679667000000006441347d7f218c11c04487c1ad8baac28928fb10e5054cd4494b94d078cfa04ccf68e064fb188127ff656c0b98e9ce87f036d183925d0d0860605877d61e90375f774121028a53f95eb631b460854fc836b2e5d31cad16364b4dc3d970babfbdcc3f2e4954ffffffff035ac355000000000017a914189ce02e332548f4804bac65cba68202c9dbf822878dfd0800000000001976a914285bb350881b21ac89724c6fb6dc914d096cd53b88acf9ef3100000000001976a91445f1f1c4a9b9419a5088a3e9c24a293d7a150e6488ac00000000\"}'",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "src/routes/v1/electrumx.js",
    "groupTitle": "ElectrumX_/_Fulcrum"
  },
  {
    "type": "post",
    "url": "/electrumx/tx/data",
    "title": "Get transaction details for an array of TXIDs",
    "name": "Transaction_details_for_an_array_of_TXIDs",
    "group": "ElectrumX_/_Fulcrum",
    "description": "<p>Returns an array of objects with transaction details of an array of TXIDs. Limited to 20 items per request.</p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "curl -X POST \"https://fulcrum-api.fullstackbch.nl/v1/electrumx/tx/data\" -H \"accept: application/json\" -H \"Content-Type: application/json\" -d '{\"txids\":[\"a1075db55d416d3ca199f55b6084e2115b9345e16c5cf302fc80e9d5fbf5d48d\",\"a1075db55d416d3ca199f55b6084e2115b9345e16c5cf302fc80e9d5fbf5d48d\"], \"verbose\":false}'",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "src/routes/v1/electrumx.js",
    "groupTitle": "ElectrumX_/_Fulcrum"
  },
  {
    "type": "get",
    "url": "/electrumx/transactions/{addr}",
    "title": "Get transaction history for a single address.",
    "name": "Transaction_history_for_a_single_address",
    "group": "ElectrumX_/_Fulcrum",
    "description": "<p>Returns an array of historical transactions associated with an address.</p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "curl -X GET \"https://fulcrum-api.fullstackbch.nl/v1/electrumx/transactions/bitcoincash:qr69kyzha07dcecrsvjwsj4s6slnlq4r8c30lxnur3\" -H \"accept: application/json\"",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "src/routes/v1/electrumx.js",
    "groupTitle": "ElectrumX_/_Fulcrum"
  },
  {
    "type": "post",
    "url": "/electrumx/transactions",
    "title": "Get the transaction history for an array of addresses.",
    "name": "Transactions_for_an_array_of_addresses",
    "group": "ElectrumX_/_Fulcrum",
    "description": "<p>Returns an array of transactions associated with an array of address. Limited to 20 items per request.</p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "curl -X POST \"https://fulcrum-api.fullstackbch.nl/v1/electrumx/transactions\" -H \"accept: application/json\" -H \"Content-Type: application/json\" -d '{\"addresses\":[\"bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf\",\"bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf\"]}'",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "src/routes/v1/electrumx.js",
    "groupTitle": "ElectrumX_/_Fulcrum"
  },
  {
    "type": "get",
    "url": "/electrumx/utxos/{addr}",
    "title": "Get utxos for a single address.",
    "name": "UTXOs_for_a_single_address",
    "group": "ElectrumX_/_Fulcrum",
    "description": "<p>Returns an object with UTXOs associated with an address.</p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "curl -X GET \"https://fulcrum-api.fullstackbch.nl/v1/electrumx/utxos/bitcoincash:qr69kyzha07dcecrsvjwsj4s6slnlq4r8c30lxnur3\" -H \"accept: application/json\"",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "src/routes/v1/electrumx.js",
    "groupTitle": "ElectrumX_/_Fulcrum"
  },
  {
    "type": "post",
    "url": "/electrumx/utxo",
    "title": "Get utxos for an array of addresses.",
    "name": "UTXOs_for_an_array_of_addresses",
    "group": "ElectrumX_/_Fulcrum",
    "description": "<p>Returns an array of objects with UTXOs associated with an address. Limited to 20 items per request.</p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "curl -X POST \"https://fulcrum-api.fullstackbch.nl/v1/electrumx/utxos\" -H \"accept: application/json\" -H \"Content-Type: application/json\" -d '{\"addresses\":[\"bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf\",\"bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf\"]}'",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "src/routes/v1/electrumx.js",
    "groupTitle": "ElectrumX_/_Fulcrum"
  },
  {
    "type": "get",
    "url": "/electrumx/unconfirmed/{addr}",
    "title": "Get unconfirmed utxos for a single address.",
    "name": "Unconfirmed_UTXOs_for_a_single_address",
    "group": "ElectrumX_/_Fulcrum",
    "description": "<p>Returns an object with unconfirmed UTXOs associated with an address.</p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "curl -X GET \"https://fulcrum-api.fullstackbch.nl/v1/electrumx/unconfirmed/bitcoincash:qr69kyzha07dcecrsvjwsj4s6slnlq4r8c30lxnur3\" -H \"accept: application/json\"",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "src/routes/v1/electrumx.js",
    "groupTitle": "ElectrumX_/_Fulcrum"
  },
  {
    "type": "post",
    "url": "/electrumx/unconfirmed",
    "title": "Get unconfirmed utxos for an array of addresses.",
    "name": "Unconfirmed_UTXOs_for_an_array_of_addresses",
    "group": "ElectrumX_/_Fulcrum",
    "description": "<p>Returns an array of objects with unconfirmed UTXOs associated with an address. Limited to 20 items per request.</p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "curl -X POST \"https://fulcrum-api.fullstackbch.nl/v1/electrumx/unconfirmed\" -H \"accept: application/json\" -H \"Content-Type: application/json\" -d '{\"addresses\":[\"bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf\",\"bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf\"]}'",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "src/routes/v1/electrumx.js",
    "groupTitle": "ElectrumX_/_Fulcrum"
  },
  {
    "type": "get",
    "url": "/electrumx/tx/data/{txid}",
    "title": "Get transaction details for a TXID",
    "name": "transaction_details_for_a_TXID",
    "group": "ElectrumX_/_Fulcrum",
    "description": "<p>Returns an object with transaction details of the TXID</p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "curl -X GET \"https://fulcrum-api.fullstackbch.nl/v1/electrumx/tx/data/a1075db55d416d3ca199f55b6084e2115b9345e16c5cf302fc80e9d5fbf5d48d\" -H \"accept: application/json\"",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "src/routes/v1/electrumx.js",
    "groupTitle": "ElectrumX_/_Fulcrum"
  }
] });
