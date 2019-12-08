'use strict'

const debug = require('debug')('file-upload')

const http = require('http')
const path = require('path')

const morgan = require('morgan')
const cors = require('cors')
const compression = require('compression')
const chalk = require('chalk')
const nconf = require('nconf')
const express = require('express')
const fetch = require('node-fetch')
const fileUpload = require('express-fileupload')
const Minio = require('minio')

const config = nconf.file({ file: 'config/config.json' })
const port = process.env.PORT || config.get('settings').port
const endpoint = config.get('settings').endpoint || undefined
const format = config.get('settings').morgan || 'tiny'
const directory = path.join(__dirname, config.get('settings').directory || 'some-directory')

const { getUrlImage } = require('./utils')

const bucket = config.get('minio').bucket || 'informatica'
const connection = config.get('minio').connection || null
const minioClient = new Minio.Client(connection)

const app = express()
const server = http.createServer(app)

app.use(morgan(format))
app.use(cors())
app.use(compression())
app.use(fileUpload())

//TODO
app.get('/:image', function (req, res) {
  const image = req.params.image
  getUrlImage(directory, image)
    .then(pathImage => res.sendFile(pathImage))
    .catch(err => res.status(500).json(err))
})

app.post('/upload', function (req, res) {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({
      message: 'No files were uploaded'
    })
  }
  if (!req.headers.user_id) {
    return res.status(400).json({
      message: 'User id is required.'
    })
  }
  const userId = req.headers.user_id
  const urlApi = `${endpoint}/${userId}`
  fetch(urlApi)
    .then(response => response.json())
    .then(data => {
      minioClient.removeObject(bucket, data.image, (err) => {
        if (err) {
          res.end('Unable to remove object', err)
        }
        let sampleFile = req.files.sampleFile
        const rename = `${new Date().getTime()}.${sampleFile.name.trim().toLowerCase()}`
        minioClient.putObject(bucket, rename, sampleFile.data, (err, etag) => {
          if (err) {
            res.end("File upload error.")
          }
          fetch(urlApi, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ image: rename })
          })
            .then(() => {
              res.json({
                message: 'File uploaded successfully',
                etag
              })
            })
            .catch(err => res.status(500).json({
              message: `Endpoint: ${endpoint} not found. (PATCH)`,
              err
            }))
        })
      })
    })
    .catch(err => res.status(500).json({
      message: `Endpoint: ${endpoint} not found. (GET)`,
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
