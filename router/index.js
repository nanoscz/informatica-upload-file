'use strict'

const path = require('path')
const fetch = require('node-fetch')
const Minio = require('minio')
const express = require('express')
const nconf = require('nconf')

const config = nconf.file({ file: 'config/config.json' })

const endpoint = config.get('settings').endpoint || undefined
const directory = path.join(__dirname, config.get('settings').directory || 'some-directory')

const bucket = config.get('minio').bucket || 'informatica'
const connection = config.get('minio').connection || null
const minioClient = new Minio.Client(connection)

const { getUrlImage } = require('../utils')

const router = express.Router()

//TODO
router.get('/:image', function (req, res) {
  const image = req.params.image
  getUrlImage(directory, image)
    .then(pathImage => res.sendFile(pathImage))
    .catch(err => res.status(500).json(err))
})

router.post('/upload', function (req, res) {
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
            headers: { 'Content-Type': 'application/json' },
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

module.exports = router