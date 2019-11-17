'use strict'

const debug = require('debug')('file-upload')
const path = require('path')

const http = require('http')
const morgan = require('morgan')
const cors = require('cors')
const compression = require('compression')
const chalk = require('chalk')
const nconf = require('nconf')
const express = require('express')
const fetch = require('node-fetch')
const fileUpload = require('express-fileupload')

const settings = nconf.file({ file: 'config/config.json' })
const port = process.env.PORT || settings.get('settings').port
const endpoint = settings.get('settings').endpoint || undefined
const format = settings.get('settings').morgan || 'tiny'
const directory = path.join(__dirname, settings.get('settings').directory || 'some-directory')

const { getUrlImage, verifyExistsImagen } = require('./utils')

const app = express()
const server = http.createServer(app)

app.use(morgan(format))
app.use(cors())
app.use(compression())
app.use(fileUpload())

app.get('/:image', function(req, res) {
  const image = req.params.image
  getUrlImage(directory, image)
    .then(pathImage => res.sendFile(pathImage))
    .catch(err => res.status(500).json(err))
})

app.post('/upload', function(req, res) {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({
      message: 'No files were uploaded'
    })
  }
  const userId = req.headers.user_id
  fetch(`${endpoint}/${userId}`)
    .then(response => response.json())
    .then(body => {
      const pathOld = `${directory}/${body.image}`
      verifyExistsImagen(pathOld)
      let sampleFile = req.files.sampleFile
      const rename = `${new Date().getTime()}.${sampleFile.name.toLowerCase()}`
      sampleFile.mv(`${directory}/${rename}`, (err) => {
        if (err) {
          return res.status(500).send(err)
        }
        res.json({
          image: rename,
          message: 'File uploaded!'
        })
      })
    })
    .catch(err => res.status(500).json({
      message: `Endpoint: ${endpoint} not found.`,
      err
    }))
})

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
