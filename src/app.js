/*
  The first file that gets executed, starts the REST API app.

  This is a test of the CI.
*/

'use strict'

const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const logger = require('morgan')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const path = require('path')
const http = require('http')
const wlogger = require('./util/winston-logging')

// Instantiate the Fulcrum Electrumx route library.
const ElectrumxV1 = require('./routes/v1/electrumx')
const electrumxv1 = new ElectrumxV1()

let server

async function startApp () {
  try {
    console.log('Starting Fulcrum REST API...')

    // Wait 10 seconds to connect to Fulcrum if this is not a test.
    // The gives the Docker container time to start.
    await sleep(10000)

    // Connect to the Fulcrum server.
    await electrumxv1.connect()

    const app = express()

    app.locals.env = process.env

    app.use(helmet())

    app.use(cors())
    app.enable('trust proxy')

    // Log each request to the console with IP addresses.
    // app.use(logger("dev"))
    const morganFormat =
      ':remote-addr :remote-user :method :url :status :response-time ms - :res[content-length] :user-agent'
    app.use(logger(morganFormat))

    // Log the same data to the winston logs.
    const logStream = {
      write: function (message, encoding) {
        wlogger.info(`request: ${message}`)
      }
    }
    app.use(logger(morganFormat, { stream: logStream }))

    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: false }))
    app.use(cookieParser())
    // app.use(express.static(path.join(__dirname, 'public')))
    app.use(express.static(`${__dirname.toString()}/../public`))

    // Mount the docs
    app.use('/docs', express.static(`${__dirname.toString()}/../docs`))

    // Log requests for later analysis.
    // app.use("/", logReqInfo);

    const v1prefix = 'v1'

    app.use(`/${v1prefix}/` + 'electrumx', electrumxv1.router)

    // catch 404 and forward to error handler
    app.use((req, res, next) => {
      const err = {
        message: 'Not Found',
        status: 404
      }

      next(err)
    })

    // error handler
    app.use((err, req, res, next) => {
      const status = err.status || 500

      // set locals, only providing error in development
      res.locals.message = err.message
      res.locals.error = req.app.get('env') === 'development' ? err : {}

      // render the error page
      res.status(status)
      res.json({
        status: status,
        message: err.message
      })
    })

    /**
     * Get port from environment and store in Express.
     */
    const port = normalizePort(process.env.PORT || '3000')
    app.set('port', port)
    wlogger.info(`fulcrum-api started on port ${port}`)

    /**
     * Create HTTP server.
     */
    server = http.createServer(app)

    /**
     * Listen on provided port, on all network interfaces.
     */

    server.listen(port)
    server.on('error', onError)
    server.on('listening', onListening)

    // Set the time before a timeout error is generated.
    // If this server does not return before this time, the connection will be severed.
    // 10 seconds is way too agressive. 30 Seconds was used for a while, but with
    // being able to set a timeout between UTXOs for tokenUtxoDetails, the timeout
    // needed to be extended.
    server.setTimeout(1000 * 60 * 5) // 5 minutes
  } catch (err) {
    console.error('Unhandled exception in startApp(): ', err)
    process.exit(1)
  }
}
startApp()

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort (val) {
  const port = parseInt(val, 10)

  if (isNaN(port)) {
    // named pipe
    return val
  }

  if (port >= 0) {
    // port number
    return port
  }

  return false
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError (error) {
  if (error.syscall !== 'listen') throw error

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`)
      process.exit(1)
    // break
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`)
      process.exit(1)
    // break
    default:
      throw error
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening () {
  const addr = server.address()
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`
  console.log(`Listening on ${bind}`)
}

// Promise based sleep function:
function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
