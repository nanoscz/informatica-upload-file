'use strict'

const debug = require('debug')('file-upload')
const http = require('http')
const morgan = require('morgan')
const cors = require('cors')
const compression = require('compression')
const chalk = require('chalk')
const nconf = require('nconf')
const express = require('express')
const fileUpload = require('express-fileupload')
const router = require('./router')

//Config
const config = nconf.file({ file: 'config/config.json' })
const port = process.env.PORT || config.get('settings').port
const format = config.get('settings').morgan || 'tiny'

//Create server
const app = express()
const server = http.createServer(app)

//Middlewares
app.use(morgan(format))
app.use(cors())
app.use(compression())
app.use(fileUpload())
app.use('', router)

function handleFatalError(err) {
  console.error(`${chalk.red('[fatal error]')} ${err.message}`)
  console.error(err.stack)
  process.exit(1)
}

if (!module.parent) {
  process.on('uncaughtException', handleFatalError)
  process.on('unhandledRejection', handleFatalError)

  server.listen(port, () => {
    debug('connecting...')
    console.log(`${chalk.green('[SERVER SUCCESSFUL]')} Server listening on port ${port}`)
  })
}
