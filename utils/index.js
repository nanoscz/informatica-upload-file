'use strict'
const fs = require('fs')

function getUrlImage(directory, image) {
  const pathImage = `${directory}/${image}`
  return new Promise((resolve, reject) => {
    try {
      fs.exists(pathImage, fileExists => {
        console.log(directory, pathImage, fileExists)
        if (!fileExists) {
          resolve(`${directory}/default.png`)
        }
        resolve(pathImage)
      })
    } catch (err) {
      reject({
        message: "File search error.",
        err
      })
    }
  })
}

function verifyExistsImagen(path) {
  if (fs.existsSync(path)) {
    fs.unlink(path, err => {
      if (err) throw err
      console.log(`${path} file deleted!`)
    })
  }
}

module.exports = { getUrlImage, verifyExistsImagen }
