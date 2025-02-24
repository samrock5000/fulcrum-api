/*
  Electrum API route
*/

'use strict'

const express = require('express')
const router = express.Router()
const axios = require('axios')
const util = require('util')
const bitcore = require('bitcore-lib-cash')
const BCHJS = require('@psf/bch-js')

const ElectrumCash = require('electrum-cash').ElectrumClient
// const ElectrumCash = require('/home/trout/work/personal/electrum-cash/electrum.js').Client // eslint-disable-line

const wlogger = require('../../util/winston-logging')
// const config = require('../../../config')

const RouteUtils = require('../route-utils')

let _this

class Electrum {
  constructor () {
    _this = this

    // _this.config = config
    _this.axios = axios
    _this.routeUtils = new RouteUtils()
    _this.bchjs = new BCHJS()
    _this.bitcore = bitcore

    _this.electrumx = new ElectrumCash(
      'bch-api',
      '1.4.1',
      process.env.FULCRUM_URL,
      process.env.FULCRUM_PORT,
      // '192.168.0.6',
      // '50002'
    )

    _this.isReady = false
    // _this.connectToServers()

    _this.router = router
    _this.router.get('/', _this.root)
    _this.router.get('/utxos/:address', _this.getUtxos)
    _this.router.post('/utxos', _this.utxosBulk)
    _this.router.get('/tx/data/:txid', _this.getTransactionDetails)
    _this.router.post('/tx/data', _this.transactionDetailsBulk)
    _this.router.post('/tx/broadcast', _this.broadcastTransaction)
    _this.router.get('/block/headers/:height', _this.getBlockHeaders)
    _this.router.post('/block/headers', _this.blockHeadersBulk)
    _this.router.get('/balance/:address', _this.getBalance)
    _this.router.post('/balance', _this.balanceBulk)
    _this.router.get('/transactions/:address', _this.getTransactions)
    _this.router.post('/transactions', _this.transactionsBulk)
    _this.router.get('/unconfirmed/:address', _this.getMempool)
    _this.router.post('/unconfirmed', _this.mempoolBulk)
  }

  // Initializes a connection to electrum servers.
  async connect () {
    try {
      console.log('Attempting to connect to ElectrumX server...')

      // console.log('_this.electrumx: ', _this.electrumx)

      // Return immediately if a connection has already been established.
      if (_this.isReady) return true

      // Connect to the server.
      await _this.electrumx.connect()

      // Set the connection flag.
      _this.isReady = true

      // Periodically check the connection. If it's not connected, attempt to
      // reconnect.
      _this.reconnectIntervalHandle = setInterval(async function () {
        const status = _this.electrumx.connection.status
        // console.log(`Electrumx status: ${status}`)

        // 1 = connected. If we're not connected, attemp to reconnect.
        if (status !== 1) {
          wlogger.info(`Electrumx not connectes. Status: ${status}`)
          wlogger.info('Attempting to reconnect...')
          await _this.electrumx.connect()
          wlogger.info('...reconnected.')
        }
      }, 30000)

      console.log('...Successfully connected to ElectrumX server.')

      // console.log(`_this.isReady: ${_this.isReady}`)
      return _this.isReady
    } catch (err) {
      console.log('err: ', err)
      wlogger.error('Error in electrumx.js/connect(): ', err)
      throw err
    }
  }

  // Disconnect from the ElectrumX server.
  async disconnect () {
    try {
      // Return immediately if the isReady flag is false.
      if (!_this.isReady) return true

      // Disable the reconnect timer.
      clearInterval(_this.reconnectIntervalHandle)

      // Disconnect from the server.
      await _this.electrumx.disconnect()

      // Clear the isReady flag.
      _this.isReady = false

      // Return true to signal that the disconnection happened successfully.
      return true
    } catch (err) {
      // console.log(`err: `, err)
      wlogger.error('Error in electrumx.js/disconnect()')
      throw err
    }
  }

  // DRY error handler.
  errorHandler (err, res) {
    // Attempt to decode the error message.
    const { msg, status } = _this.routeUtils.decodeError(err)
    if (msg) {
      res.status(status)
      return res.json({ success: false, error: msg })
    }

    // Handle error patterns specific to this route.
    if (err.message) {
      res.status(400)
      return res.json({ success: false, error: err.message })
    }

    // If error can be handled, return the stack trace
    res.status(500)
    return res.json({ error: util.inspect(err) })
  }

  // Root API endpoint. Simply acknowledges that it exists.
  root (req, res, next) {
    return res.json({ status: 'electrumx' })
  }

  // Returns a promise that resolves to UTXO data for an address. Expects input
  // to be a cash address, and input validation to have already been done by
  // parent, calling function.
  async _utxosFromElectrumx (address) {
    try {
      // Convert the address to a scripthash.
      const scripthash = _this.addressToScripthash(address)

      if (!_this.isReady) {
        throw new Error(
          'ElectrumX server connection is not ready. Call await connectToServer() first.'
        )
      }

      // Query the utxos from the ElectrumX server.
      const electrumResponse = await _this.electrumx.request(
        'blockchain.scripthash.listunspent',
        scripthash
      )
      // console.log(
      //   `electrumResponse: ${JSON.stringify(electrumResponse, null, 2)}`
      // )

      return electrumResponse
    } catch (err) {
      // console.log('err: ', err)

      // Write out error to error log.
      wlogger.error('Error in elecrumx.js/_utxosFromElectrumx(): ', err)
      throw err
    }
  }

  /**
   * @api {get} /electrumx/utxos/{addr} Get utxos for a single address.
   * @apiName UTXOs for a single address
   * @apiGroup Fulcrum
   * @apiDescription Returns an object with UTXOs associated with an address.
   *
   *
   * @apiExample Example usage:
   * curl -X GET "https://fulcrum-api.fullstackbch.nl/v1/electrumx/utxos/bitcoincash:qr69kyzha07dcecrsvjwsj4s6slnlq4r8c30lxnur3" -H "accept: application/json"
   *
   */
  // GET handler for single balance
  async getUtxos (req, res, next) {
    try {
      const address = req.params.address

      // Reject if address is an array.
      if (Array.isArray(address)) {
        res.status(400)
        return res.json({
          success: false,
          error: 'address can not be an array. Use POST for bulk upload.'
        })
      }

      //const cashAddr = _this.bchjs.Address.toCashAddress(address)
      const cashAddr = _this.bchjs.Address.toEcashAddress(address)

      // Prevent a common user error. Ensure they are using the correct network address.
      const networkIsValid = _this.routeUtils.validateNetwork(cashAddr)

      if (!networkIsValid) {
        res.status(400)
        return res.json({
          success: false,
          error:
            'Invalid network. Trying to use a testnet address on mainnet, or vice versa.'
        })
      }

      wlogger.debug(
        'Executing electrumx/getUtxos with this address: ',
        cashAddr
      )

      // Get data from ElectrumX server.
      const electrumResponse = await _this._utxosFromElectrumx(cashAddr)
      // console.log(`_utxosFromElectrumx(): ${JSON.stringify(electrumResponse, null, 2)}`)

      // Pass the error message if ElectrumX reports an error.
      if (Object.prototype.hasOwnProperty.call(electrumResponse, 'code')) {
        res.status(400)
        return res.json({
          success: false,
          message: electrumResponse.message
        })
      }

      res.status(200)
      return res.json({
        success: true,
        utxos: electrumResponse
      })
    } catch (err) {
      // Write out error to error log.
      wlogger.error('Error in elecrumx.js/getUtxos().', err)

      return _this.errorHandler(err, res)
    }
  }

  /**
   * @api {post} /electrumx/utxo Get utxos for an array of addresses.
   * @apiName  UTXOs for an array of addresses
   * @apiGroup Fulcrum
   * @apiDescription Returns an array of objects with UTXOs associated with an address.
   * Limited to 20 items per request.
   *
   * @apiExample Example usage:
   * curl -X POST "https://fulcrum-api.fullstackbch.nl/v1/electrumx/utxos" -H "accept: application/json" -H "Content-Type: application/json" -d '{"addresses":["bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf","bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf"]}'
   *
   *
   */
  // POST handler for bulk queries on address details
  async utxosBulk (req, res, next) {
    try {
      let addresses = req.body.addresses
      // const currentPage = req.body.page ? parseInt(req.body.page, 10) : 0

      // Reject if addresses is not an array.
      if (!Array.isArray(addresses)) {
        res.status(400)
        return res.json({
          error: 'addresses needs to be an array. Use GET for single address.'
        })
      }

      // Enforce array size rate limits
      if (!_this.routeUtils.validateArraySize(req, addresses)) {
        res.status(400) // https://github.com/Bitcoin-com/rest.bitcoin.com/issues/330
        return res.json({
          error: 'Array too large.'
        })
      }

      wlogger.debug(
        'Executing electrumx.js/utxoBulk with these addresses: ',
        addresses
      )

      // Validate each element in the address array.
      for (let i = 0; i < addresses.length; i++) {
        const thisAddress = addresses[i]

        // Ensure the input is a valid BCH address.
        try {
          _this.bchjs.Address.toLegacyAddress(thisAddress)
        } catch (err) {
          res.status(400)
          return res.json({
            error: `Invalid BCH address. Double check your address is valid: ${thisAddress}`
          })
        }

        // Prevent a common user error. Ensure they are using the correct network address.
        const networkIsValid = _this.routeUtils.validateNetwork(thisAddress)
        if (!networkIsValid) {
          res.status(400)
          return res.json({
            error: `Invalid network for address ${thisAddress}. Trying to use a testnet address on mainnet, or vice versa.`
          })
        }
      }

      // Loops through each address and creates an array of Promises, querying
      // Insight API in parallel.
      addresses = addresses.map(async (address, index) => {
        // console.log(`address: ${address}`)
        const utxos = await _this._utxosFromElectrumx(address)

        return {
          utxos,
          address
        }
      })

      // Wait for all parallel Insight requests to return.
      const result = await Promise.all(addresses)

      // Return the array of retrieved address information.
      res.status(200)
      return res.json({
        success: true,
        utxos: result
      })
    } catch (err) {
      wlogger.error('Error in electrumx.js/utxoBulk().', err)

      return _this.errorHandler(err, res)
    }
  }

  // Returns a promise that resolves to transaction details data for a txid.
  // Expects input to be a txid string, and input validation to have already
  // been done by parent, calling function.
  async _transactionDetailsFromElectrum (txid, verbose = true) {
    try {
      if (!_this.isReady) {
        throw new Error(
          'ElectrumX server connection is not ready. Call await connectToServer() first.'
        )
      }

      // Query the utxos from the ElectrumX server.
      const electrumResponse = await _this.electrumx.request(
        'blockchain.transaction.get',
        txid,
        verbose
      )
      // console.log(
      //   `electrumResponse: ${JSON.stringify(electrumResponse, null, 2)}`
      // )

      return electrumResponse
    } catch (err) {
      // console.log('err: ', err)

      // Write out error to error log.
      wlogger.error(
        'Error in elecrumx.js/_transactionDetailsFromElectrum(): ',
        err
      )
      throw err
    }
  }

  /**
   * @api {get} /electrumx/tx/data/{txid} Get transaction details for a TXID
   * @apiName transaction details for a TXID
   * @apiGroup Fulcrum
   * @apiDescription Returns an object with transaction details of the TXID
   *
   *
   * @apiExample Example usage:
   * curl -X GET "https://fulcrum-api.fullstackbch.nl/v1/electrumx/tx/data/a1075db55d416d3ca199f55b6084e2115b9345e16c5cf302fc80e9d5fbf5d48d" -H "accept: application/json"
   *
   */
  // GET handler for single transaction
  async getTransactionDetails (req, res, next) {
    try {
      const txid = req.params.txid
      const verbose = req.query.verbose

      // Reject if txid is anything other than a string
      if (typeof txid !== 'string') {
        res.status(400)
        return res.json({
          success: false,
          error: 'txid must be a string'
        })
      }

      wlogger.debug(
        'Executing electrumx/getTransactionDetails with this txid: ',
        txid
      )

      // Get data from ElectrumX server.
      const electrumResponse = await _this._transactionDetailsFromElectrum(
        txid,
        verbose
      )
      // console.log(`_transactionDetailsFromElectrum(): ${JSON.stringify(electrumResponse, null, 2)}`)

      // Pass the error message if ElectrumX reports an error.
      if (electrumResponse instanceof Error) {
        res.status(400)
        return res.json({
          success: false,
          error: electrumResponse.message
        })
      }

      res.status(200)
      return res.json({
        success: true,
        details: electrumResponse
      })
    } catch (err) {
      // Write out error to error log.
      wlogger.error('Error in elecrumx.js/getTransactionDetails().', err)

      return _this.errorHandler(err, res)
    }
  }

  /**
   * @api {post} /electrumx/tx/data Get transaction details for an array of TXIDs
   * @apiName  Transaction details for an array of TXIDs
   * @apiGroup Fulcrum
   * @apiDescription Returns an array of objects with transaction details of an array of TXIDs.
   * Limited to 20 items per request.
   *
   * @apiExample Example usage:
   * curl -X POST "https://fulcrum-api.fullstackbch.nl/v1/electrumx/tx/data" -H "accept: application/json" -H "Content-Type: application/json" -d '{"txids":["a1075db55d416d3ca199f55b6084e2115b9345e16c5cf302fc80e9d5fbf5d48d","a1075db55d416d3ca199f55b6084e2115b9345e16c5cf302fc80e9d5fbf5d48d"], "verbose":false}'
   *
   *
   */
  // POST handler for bulk queries on transaction details
  async transactionDetailsBulk (req, res, next) {
    try {
      const txids = req.body.txids
      const verbose = req.body.verbose || true

      // Reject if txids is not an array.
      if (!Array.isArray(txids)) {
        res.status(400)
        return res.json({
          success: false,
          error: 'txids needs to be an array. Use GET for single txid.'
        })
      }

      // Enforce array size rate limits
      if (!_this.routeUtils.validateArraySize(req, txids)) {
        res.status(400) // https://github.com/Bitcoin-com/rest.bitcoin.com/issues/330
        return res.json({
          success: false,
          error: 'Array too large.'
        })
      }

      wlogger.debug(
        'Executing electrumx.js/transactionDetailsBulk with these txids: ',
        txids
      )

      // Loops through each address and creates an array of Promises, querying
      // the Electrum server in parallel.
      const transactions = txids.map(async (txid, index) => {
        // console.log(`address: ${address}`)
        const details = await _this._transactionDetailsFromElectrum(
          txid,
          verbose
        )

        return { details, txid }
      })

      // Wait for all parallel Electrum requests to return.
      const result = await Promise.all(transactions)

      // Return the array of retrieved transaction details.
      res.status(200)
      return res.json({
        success: true,
        transactions: result
      })
    } catch (err) {
      wlogger.error('Error in electrumx.js/transactionDetailsBulk().', err)

      return _this.errorHandler(err, res)
    }
  }

  // Returns a promise that resolves to transaction ID of the broadcasted transaction or an error.
  // Expects input to be a txHex string, and input validation to have already
  // been done by parent, calling function.
  async _broadcastTransactionWithElectrum (txHex) {
    try {
      if (!_this.isReady) {
        throw new Error(
          'ElectrumX server connection is not ready. Call await connectToServer() first.'
        )
      }

      // Broadcast the transaction hex to the ElectrumX server.
      const electrumResponse = await _this.electrumx.request(
        'blockchain.transaction.broadcast',
        txHex
      )
      // console.log(
      //   `electrumResponse: ${JSON.stringify(electrumResponse, null, 2)}`
      // )

      return electrumResponse
    } catch (err) {
      // console.log('err: ', err)

      // Write out error to error log.
      wlogger.error(
        'Error in elecrumx.js/_transactionDetailsFromElectrum(): ',
        err
      )
      throw err
    }
  }

  /**
   * @api {post} /electrumx/tx/broadcast Broadcast a raw transaction
   * @apiName Broadcast a raw transaction
   * @apiGroup Fulcrum
   * @apiDescription Broadcast a raw transaction and return the transaction ID on success or error on failure.
   *
   * @apiExample Example usage:
   * curl -X POST "https://fulcrum-api.fullstackbch.nl/v1/electrumx/tx/broadcast" -H "accept: application/json" -H "Content-Type: application/json" -d '{"txHex":"020000000265d13ef402840c8a51f39779afb7ae4d49e4b0a3c24a3d0e7742038f2c679667010000006441dd1dd72770cadede1a7fd0363574846c48468a398ddfa41a9677c74cac8d2652b682743725a3b08c6c2021a629011e11a264d9036e9d5311e35b5f4937ca7b4e4121020797d8fd4d2fa6fd7cdeabe2526bfea2b90525d6e8ad506ec4ee3c53885aa309ffffffff65d13ef402840c8a51f39779afb7ae4d49e4b0a3c24a3d0e7742038f2c679667000000006441347d7f218c11c04487c1ad8baac28928fb10e5054cd4494b94d078cfa04ccf68e064fb188127ff656c0b98e9ce87f036d183925d0d0860605877d61e90375f774121028a53f95eb631b460854fc836b2e5d31cad16364b4dc3d970babfbdcc3f2e4954ffffffff035ac355000000000017a914189ce02e332548f4804bac65cba68202c9dbf822878dfd0800000000001976a914285bb350881b21ac89724c6fb6dc914d096cd53b88acf9ef3100000000001976a91445f1f1c4a9b9419a5088a3e9c24a293d7a150e6488ac00000000"}'
   *
   */
  // POST handler for broadcasting a single transaction
  async broadcastTransaction (req, res, next) {
    try {
      const txHex = req.body.txHex

      if (typeof txHex !== 'string') {
        res.status(400)
        return res.json({
          success: false,
          error: 'request body must be a string.'
        })
      }

      wlogger.debug(
        'Executing electrumx/broadcastTransaction with this tx hex: ',
        txHex
      )

      // Get data from ElectrumX server.
      const electrumResponse = await _this._broadcastTransactionWithElectrum(
        txHex
      )
      // console.log(`_utxosFromElectrumx(): ${JSON.stringify(electrumResponse, null, 2)}`)

      // Pass the error message if ElectrumX reports an error.
      if (electrumResponse instanceof Error) {
        res.status(400)
        return res.json({
          success: false,
          error: electrumResponse.message
        })
      }

      res.status(200)
      return res.json({
        success: true,
        txid: electrumResponse
      })
    } catch (err) {
      wlogger.error('Error in electrumx.js/broadcastTransaction().', err)

      return _this.errorHandler(err, res)
    }
  }

  // Returns a promise that resolves to block header data for a block height.
  // Expects input to be a height number, and input validation to have already
  // been done by parent, calling function.
  async _blockHeadersFromElectrum (height, count = 1) {
    try {
      if (!_this.isReady) {
        throw new Error(
          'ElectrumX server connection is not ready. Call await connectToServer() first.'
        )
      }

      // Query the block header from the ElectrumX server.
      const electrumResponse = await _this.electrumx.request(
        'blockchain.block.headers',
        height,
        count
      )
      // console.log(
      //   `electrumResponse: ${JSON.stringify(electrumResponse, null, 2)}`
      // )

      const HEADER_SIZE = 80 * 2

      if (!(electrumResponse instanceof Error)) {
        const headers = electrumResponse.hex.match(
          new RegExp(`.{1,${HEADER_SIZE}}`, 'g')
        )
        return headers
      }

      return electrumResponse
    } catch (err) {
      // console.log('err: ', err)

      // Write out error to error log.
      wlogger.error('Error in elecrumx.js/_blockHeaderFromElectrum(): ', err)
      throw err
    }
  }

  /**
   * @api {get} /electrumx/block/headers/{height} Get `count` block headers starting at a height
   * @apiName Block header data for a `count` blocks starting at a block height
   * @apiGroup Fulcrum
   * @apiDescription Returns an array with block headers starting at the block height
   *
   *
   * @apiExample Example usage:
   * curl -X GET "https://fulcrum-api.fullstackbch.nl/v1/electrumx/block/headers/42?count=2" -H "accept: application/json"
   *
   */
  // GET handler for single block headers
  async getBlockHeaders (req, res, next) {
    try {
      const height = Number(req.params.height)
      const count = req.query.count === undefined ? 1 : Number(req.query.count)

      // Reject if height is not a number
      if (Number.isNaN(height) || height < 0) {
        res.status(400)
        return res.json({
          success: false,
          error: 'height must be a positive number'
        })
      }

      // Reject if height is not a number
      if (Number.isNaN(count) || count < 0) {
        res.status(400)
        return res.json({
          success: false,
          error: 'count must be a positive number'
        })
      }

      wlogger.debug(
        'Executing electrumx/getBlockHeaders with this height: ',
        height
      )

      // Get data from ElectrumX server.
      const electrumResponse = await _this._blockHeadersFromElectrum(
        height,
        count
      )
      // console.log(`_transactionDetailsFromElectrum(): ${JSON.stringify(electrumResponse, null, 2)}`)

      // Pass the error message if ElectrumX reports an error.
      if (electrumResponse instanceof Error) {
        res.status(400)
        return res.json({
          success: false,
          error: electrumResponse.message
        })
      }

      res.status(200)
      return res.json({
        success: true,
        headers: electrumResponse
      })
    } catch (err) {
      // Write out error to error log.
      wlogger.error('Error in elecrumx.js/getBlockHeader().', err)

      return _this.errorHandler(err, res)
    }
  }

  /**
   * @api {post} /electrumx/block/headers Get block headers for an array of height + count pairs
   * @apiName  Block headers for an array of height + count pairs
   * @apiGroup Fulcrum
   * @apiDescription Returns an array of objects with blockheaders of an array of TXIDs.
   * Limited to 20 items per request.
   *
   * @apiExample Example usage:
   * curl -X POST "https://fulcrum-api.fullstackbch.nl/v1/electrumx/block/headers" -H "accept: application/json" -H "Content-Type: application/json" -d '{"heights":[{ "height": 42, "count": 2 }, { "height": 100, "count": 5 }]}'
   *
   */
  // POST handler for bulk queries on block headers
  async blockHeadersBulk (req, res, next) {
    try {
      const heights = req.body.heights

      // Reject if heights is not an array.
      if (!Array.isArray(heights)) {
        res.status(400)
        return res.json({
          success: false,
          error: 'heights needs to be an array. Use GET for single height.'
        })
      }

      // Enforce array size rate limits
      if (!_this.routeUtils.validateArraySize(req, heights)) {
        res.status(400) // https://github.com/Bitcoin-com/rest.bitcoin.com/issues/330
        return res.json({
          success: false,
          error: 'Array too large.'
        })
      }

      wlogger.debug(
        'Executing electrumx.js/blockHeadersBulk with these txids: ',
        heights
      )

      // Loops through each address and creates an array of Promises, querying
      // the Electrum server in parallel.
      const transactions = heights.map(async (obj) => {
        const headers = await _this._blockHeadersFromElectrum(
          obj.height,
          obj.count
        )

        return { headers }
      })

      // Wait for all parallel Electrum requests to return.
      const result = await Promise.all(transactions)

      // Return the array of retrieved transaction details.
      res.status(200)
      return res.json({
        success: true,
        headers: result
      })
    } catch (err) {
      wlogger.error('Error in electrumx.js/blockHeadersBulk().', err)

      return _this.errorHandler(err, res)
    }
  }

  // Returns a promise that resolves to a balance for an address. Expects input
  // to be a cash address, and input validation to have already been done by
  // parent, calling function.
  async _balanceFromElectrumx (address) {
    try {
      // Convert the address to a scripthash.
      const scripthash = _this.addressToScripthash(address)

      if (!_this.isReady) {
        throw new Error(
          'ElectrumX server connection is not ready. Call await connectToServer() first.'
        )
      }

      // Query the address balance from the ElectrumX server.
      const electrumResponse = await _this.electrumx.request(
        'blockchain.scripthash.get_balance',
        scripthash
      )
      // console.log(
      //   `electrumResponse: ${JSON.stringify(electrumResponse, null, 2)}`
      // )

      return electrumResponse
    } catch (err) {
      // console.log('err1: ', err)

      // Write out error to error log.
      wlogger.error('Error in elecrumx.js/_utxosFromElectrumx(): ', err)
      throw err
    }
  }

  /**
   * @api {get} /electrumx/balance/{addr} Get balance for a single address.
   * @apiName Balance for a single address
   * @apiGroup Fulcrum
   * @apiDescription Returns an object with confirmed and unconfirmed balance associated with an address.
   *
   *
   * @apiExample Example usage:
   * curl -X GET "https://fulcrum-api.fullstackbch.nl/v1/electrumx/balance/bitcoincash:qr69kyzha07dcecrsvjwsj4s6slnlq4r8c30lxnur3" -H "accept: application/json"
   *
   */
  // GET handler for single balance
  async getBalance (req, res, next) {
    try {
      const address = req.params.address

      // Reject if address is an array.
      if (Array.isArray(address)) {
        res.status(400)
        return res.json({
          success: false,
          error: 'address can not be an array. Use POST for bulk upload.'
        })
      }

      // Ensure the address is in cash address format.
      const cashAddr = _this.bchjs.Address.toCashAddress(address)

      // Prevent a common user error. Ensure they are using the correct network address.
      const networkIsValid = _this.routeUtils.validateNetwork(cashAddr)
      if (!networkIsValid) {
        res.status(400)
        return res.json({
          success: false,
          error:
            'Invalid network. Trying to use a testnet address on mainnet, or vice versa.'
        })
      }

      wlogger.debug(
        'Executing electrumx/getBalance with this address: ',
        cashAddr
      )

      // Get data from ElectrumX server.
      const electrumResponse = await _this._balanceFromElectrumx(cashAddr)
      // console.log(`_utxosFromElectrumx(): ${JSON.stringify(electrumResponse, null, 2)}`)

      // Pass the error message if ElectrumX reports an error.
      if (Object.prototype.hasOwnProperty.call(electrumResponse, 'code')) {
        res.status(400)
        return res.json({
          success: false,
          message: electrumResponse.message
        })
      }

      res.status(200)
      return res.json({
        success: true,
        balance: electrumResponse
      })
    } catch (err) {
      // Write out error to error log.
      wlogger.error('Error in elecrumx.js/getBalance().', err)

      return _this.errorHandler(err, res)
    }
  }

  /**
   * @api {post} /electrumx/balance Get balances for an array of addresses.
   * @apiName  Balances for an array of addresses
   * @apiGroup Fulcrum
   * @apiDescription Returns an array of balanes associated with an array of address.
   * Limited to 20 items per request.
   *
   * @apiExample Example usage:
   * curl -X POST "https://fulcrum-api.fullstackbch.nl/v1/electrumx/balance" -H "accept: application/json" -H "Content-Type: application/json" -d '{"addresses":["bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf","bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf"]}'
   *
   *
   */
  // POST handler for bulk queries on address balance
  async balanceBulk (req, res, next) {
    try {
      let addresses = req.body.addresses

      // Reject if addresses is not an array.
      if (!Array.isArray(addresses)) {
        res.status(400)
        return res.json({
          error: 'addresses needs to be an array. Use GET for single address.'
        })
      }

      // Enforce array size rate limits
      if (!_this.routeUtils.validateArraySize(req, addresses)) {
        res.status(400) // https://github.com/Bitcoin-com/rest.bitcoin.com/issues/330
        return res.json({
          error: 'Array too large.'
        })
      }

      wlogger.debug(
        'Executing electrumx.js/balanceBulk with these addresses: ',
        addresses
      )

      // Validate each element in the address array.
      for (let i = 0; i < addresses.length; i++) {
        const thisAddress = addresses[i]

        // Ensure the input is a valid BCH address.
        try {
          _this.bchjs.Address.toLegacyAddress(thisAddress)
        } catch (err) {
          res.status(400)
          return res.json({
            error: `Invalid BCH address. Double check your address is valid: ${thisAddress}`
          })
        }

        // Prevent a common user error. Ensure they are using the correct network address.
        const networkIsValid = _this.routeUtils.validateNetwork(thisAddress)
        if (!networkIsValid) {
          res.status(400)
          return res.json({
            error: `Invalid network for address ${thisAddress}. Trying to use a testnet address on mainnet, or vice versa.`
          })
        }
      }

      // Loops through each address and creates an array of Promises, querying
      // ElectrumX API in parallel.
      addresses = addresses.map(async (address, index) => {
        // console.log(`address: ${address}`)
        const balance = await _this._balanceFromElectrumx(address)

        return {
          balance,
          address
        }
      })

      // Wait for all parallel Insight requests to return.
      const result = await Promise.all(addresses)

      // Return the array of retrieved address information.
      res.status(200)
      return res.json({
        success: true,
        balances: result
      })
    } catch (err) {
      wlogger.error('Error in electrumx.js/balanceBulk().', err)

      return _this.errorHandler(err, res)
    }
  }

  // Returns a promise that resolves an array of transaction history for an
  // address. Expects input to be a cash address, and input validation to have
  // already been done by parent, calling function.
  async _transactionsFromElectrumx (address) {
    try {
      // Convert the address to a scripthash.
      const scripthash = _this.addressToScripthash(address)

      if (!_this.isReady) {
        throw new Error(
          'ElectrumX server connection is not ready. Call await connectToServer() first.'
        )
      }

      // Query the address transaction history from the ElectrumX server.
      const electrumResponse = await _this.electrumx.request(
        'blockchain.scripthash.get_history',
        scripthash
      )
      // console.log(
      //   `electrumResponse: ${JSON.stringify(electrumResponse, null, 2)}`
      // )

      return electrumResponse
    } catch (err) {
      // console.log('err1: ', err)

      // Write out error to error log.
      wlogger.error('Error in elecrumx.js/_transactionsFromElectrumx(): ', err)
      throw err
    }
  }

  /**
   * @api {get} /electrumx/transactions/{addr} Get transaction history for a single address.
   * @apiName Transaction history for a single address
   * @apiGroup Fulcrum
   * @apiDescription Returns an array of historical transactions associated with an address.
   *
   *
   * @apiExample Example usage:
   * curl -X GET "https://fulcrum-api.fullstackbch.nl/v1/electrumx/transactions/bitcoincash:qr69kyzha07dcecrsvjwsj4s6slnlq4r8c30lxnur3" -H "accept: application/json"
   *
   */
  // GET handler for single balance
  async getTransactions (req, res, next) {
    try {
      const address = req.params.address

      // Reject if address is an array.
      if (Array.isArray(address)) {
        res.status(400)
        return res.json({
          success: false,
          error: 'address can not be an array. Use POST for bulk upload.'
        })
      }

      // Ensure the address is in cash address format.
      const cashAddr = _this.bchjs.Address.toCashAddress(address)

      // Prevent a common user error. Ensure they are using the correct network address.
      const networkIsValid = _this.routeUtils.validateNetwork(cashAddr)
      if (!networkIsValid) {
        res.status(400)
        return res.json({
          success: false,
          error:
            'Invalid network. Trying to use a testnet address on mainnet, or vice versa.'
        })
      }

      wlogger.debug(
        'Executing electrumx/getTransactions with this address: ',
        cashAddr
      )

      // Get data from ElectrumX server.
      const electrumResponse = await _this._transactionsFromElectrumx(cashAddr)
      // console.log(`_utxosFromElectrumx(): ${JSON.stringify(electrumResponse, null, 2)}`)

      // Pass the error message if ElectrumX reports an error.
      if (Object.prototype.hasOwnProperty.call(electrumResponse, 'code')) {
        res.status(400)
        return res.json({
          success: false,
          message: electrumResponse.message
        })
      }

      res.status(200)
      return res.json({
        success: true,
        transactions: electrumResponse
      })
    } catch (err) {
      // Write out error to error log.
      wlogger.error('Error in elecrumx.js/getTransactions().', err)

      return _this.errorHandler(err, res)
    }
  }

  /**
   * @api {post} /electrumx/transactions Get the transaction history for an array of addresses.
   * @apiName  Transactions for an array of addresses
   * @apiGroup Fulcrum
   * @apiDescription Returns an array of transactions associated with an array of address.
   * Limited to 20 items per request.
   *
   * @apiExample Example usage:
   * curl -X POST "https://fulcrum-api.fullstackbch.nl/v1/electrumx/transactions" -H "accept: application/json" -H "Content-Type: application/json" -d '{"addresses":["bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf","bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf"]}'
   *
   *
   */
  // POST handler for bulk queries on transaction histories for addresses.
  async transactionsBulk (req, res, next) {
    try {
      let addresses = req.body.addresses

      // Reject if addresses is not an array.
      if (!Array.isArray(addresses)) {
        res.status(400)
        return res.json({
          error: 'addresses needs to be an array. Use GET for single address.'
        })
      }

      // Enforce array size rate limits
      if (!_this.routeUtils.validateArraySize(req, addresses)) {
        res.status(400) // https://github.com/Bitcoin-com/rest.bitcoin.com/issues/330
        return res.json({
          error: 'Array too large.'
        })
      }

      wlogger.debug(
        'Executing electrumx.js/transactionsBulk with these addresses: ',
        addresses
      )

      // Validate each element in the address array.
      for (let i = 0; i < addresses.length; i++) {
        const thisAddress = addresses[i]

        // Ensure the input is a valid BCH address.
        try {
          _this.bchjs.Address.toLegacyAddress(thisAddress)
        } catch (err) {
          res.status(400)
          return res.json({
            error: `Invalid BCH address. Double check your address is valid: ${thisAddress}`
          })
        }

        // Prevent a common user error. Ensure they are using the correct network address.
        const networkIsValid = _this.routeUtils.validateNetwork(thisAddress)
        if (!networkIsValid) {
          res.status(400)
          return res.json({
            error: `Invalid network for address ${thisAddress}. Trying to use a testnet address on mainnet, or vice versa.`
          })
        }
      }

      // Loops through each address and creates an array of Promises, querying
      // ElectrumX API in parallel.
      addresses = addresses.map(async (address, index) => {
        // console.log(`address: ${address}`)
        const transactions = await _this._transactionsFromElectrumx(address)

        return {
          transactions,
          address
        }
      })

      // Wait for all parallel Insight requests to return.
      const result = await Promise.all(addresses)

      // Return the array of retrieved address information.
      res.status(200)
      return res.json({
        success: true,
        transactions: result
      })
    } catch (err) {
      wlogger.error('Error in electrumx.js/transactionsBulk().', err)

      return _this.errorHandler(err, res)
    }
  }

  // Returns a promise that resolves to unconfirmed UTXO data (mempool) for an address.
  // Expects input to be a cash address, and input validation to have
  // already been done by parent, calling function.
  async _mempoolFromElectrumx (address) {
    try {
      // Convert the address to a scripthash.
      const scripthash = _this.addressToScripthash(address)

      if (!_this.isReady) {
        throw new Error(
          'ElectrumX server connection is not ready. Call await connectToServer() first.'
        )
      }

      // Query the unconfirmed utxos from the ElectrumX server.
      const electrumResponse = await _this.electrumx.request(
        'blockchain.scripthash.get_mempool',
        scripthash
      )
      // console.log(
      //   `electrumResponse: ${JSON.stringify(electrumResponse, null, 2)}`
      // )

      return electrumResponse
    } catch (err) {
      // console.log('err: ', err)

      // Write out error to error log.
      wlogger.error('Error in elecrumx.js/_mempoolFromElectrumx(): ', err)
      throw err
    }
  }

  /**
   * @api {get} /electrumx/unconfirmed/{addr} Get unconfirmed utxos for a single address.
   * @apiName Unconfirmed UTXOs for a single address
   * @apiGroup Fulcrum
   * @apiDescription Returns an object with unconfirmed UTXOs associated with an address.
   *
   *
   * @apiExample Example usage:
   * curl -X GET "https://fulcrum-api.fullstackbch.nl/v1/electrumx/unconfirmed/bitcoincash:qr69kyzha07dcecrsvjwsj4s6slnlq4r8c30lxnur3" -H "accept: application/json"
   *
   */
  // GET handler for single balance
  async getMempool (req, res, next) {
    try {
      const address = req.params.address

      // Reject if address is an array.
      if (Array.isArray(address)) {
        res.status(400)
        return res.json({
          success: false,
          error: 'address can not be an array. Use POST for bulk upload.'
        })
      }

      // Ensure the address is in cash address format.
      const cashAddr = _this.bchjs.Address.toCashAddress(address)

      // Prevent a common user error. Ensure they are using the correct network address.
      const networkIsValid = _this.routeUtils.validateNetwork(cashAddr)
      if (!networkIsValid) {
        res.status(400)
        return res.json({
          success: false,
          error:
            'Invalid network. Trying to use a testnet address on mainnet, or vice versa.'
        })
      }

      wlogger.debug(
        'Executing electrumx/getMempool with this address: ',
        cashAddr
      )

      // Get data from ElectrumX server.
      const electrumResponse = await _this._mempoolFromElectrumx(cashAddr)
      // console.log(`_mempoolFromElectrumx(): ${JSON.stringify(electrumResponse, null, 2)}`)

      // Pass the error message if ElectrumX reports an error.
      if (Object.prototype.hasOwnProperty.call(electrumResponse, 'code')) {
        res.status(400)
        return res.json({
          success: false,
          message: electrumResponse.message
        })
      }

      res.status(200)
      return res.json({
        success: true,
        utxos: electrumResponse
      })
    } catch (err) {
      // Write out error to error log.
      wlogger.error('Error in elecrumx.js/getMempool().', err)

      return _this.errorHandler(err, res)
    }
  }

  /**
   * @api {post} /electrumx/unconfirmed Get unconfirmed utxos for an array of addresses.
   * @apiName  Unconfirmed UTXOs for an array of addresses
   * @apiGroup Fulcrum
   * @apiDescription Returns an array of objects with unconfirmed UTXOs associated with an address.
   * Limited to 20 items per request.
   *
   * @apiExample Example usage:
   * curl -X POST "https://fulcrum-api.fullstackbch.nl/v1/electrumx/unconfirmed" -H "accept: application/json" -H "Content-Type: application/json" -d '{"addresses":["bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf","bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf"]}'
   *
   *
   */
  // POST handler for bulk queries on address details
  async mempoolBulk (req, res, next) {
    try {
      let addresses = req.body.addresses

      // Reject if addresses is not an array.
      if (!Array.isArray(addresses)) {
        res.status(400)
        return res.json({
          error: 'addresses needs to be an array. Use GET for single address.'
        })
      }

      // Enforce array size rate limits
      if (!_this.routeUtils.validateArraySize(req, addresses)) {
        res.status(400) // https://github.com/Bitcoin-com/rest.bitcoin.com/issues/330
        return res.json({
          error: 'Array too large.'
        })
      }

      wlogger.debug(
        'Executing electrumx.js/mempoolBulk with these addresses: ',
        addresses
      )

      // Validate each element in the address array.
      for (let i = 0; i < addresses.length; i++) {
        const thisAddress = addresses[i]

        // Ensure the input is a valid BCH address.
        try {
          _this.bchjs.Address.toLegacyAddress(thisAddress)
        } catch (err) {
          res.status(400)
          return res.json({
            error: `Invalid BCH address. Double check your address is valid: ${thisAddress}`
          })
        }

        // Prevent a common user error. Ensure they are using the correct network address.
        const networkIsValid = _this.routeUtils.validateNetwork(thisAddress)
        if (!networkIsValid) {
          res.status(400)
          return res.json({
            error: `Invalid network for address ${thisAddress}. Trying to use a testnet address on mainnet, or vice versa.`
          })
        }
      }

      // Loops through each address and creates an array of Promises, querying
      // Insight API in parallel.
      addresses = addresses.map(async (address, index) => {
        // console.log(`address: ${address}`)
        const utxos = await _this._mempoolFromElectrumx(address)

        return {
          utxos,
          address
        }
      })

      // Wait for all parallel Insight requests to return.
      const result = await Promise.all(addresses)

      // Return the array of retrieved address information.
      res.status(200)
      return res.json({
        success: true,
        utxos: result
      })
    } catch (err) {
      wlogger.error('Error in electrumx.js/mempoolBulk().', err)

      return _this.errorHandler(err, res)
    }
  }

  // Convert a 'bitcoincash:...' address to a script hash used by ElectrumX.
  addressToScripthash (addrStr) {
    try {
      // console.log(`addrStr: ${addrStr}`)

      const address = _this.bitcore.Address.fromString(addrStr)
      // console.log(`address: ${address}`)

      const script = address.isPayToPublicKeyHash()
        ? _this.bitcore.Script.buildPublicKeyHashOut(address)
        : _this.bitcore.Script.buildScriptHashOut(address)
      // console.log(`script: ${script}`)

      const scripthash = _this.bitcore.crypto.Hash.sha256(script.toBuffer())
        .reverse()
        .toString('hex')
      // console.log(`scripthash: ${scripthash}`)

      return scripthash
    } catch (err) {
      wlogger.error('Error in electrumx.js/addressToScripthash()')
      throw err
    }
  }
}

module.exports = Electrum
