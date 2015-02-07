/*!
 * Module dependencies.
 */

var path = require('path')
var rootPath = path.resolve(__dirname + '../..')

/**
 * Expose config
 */

module.exports = {
  development: {
    root: rootPath,
    db: 'mongodb://localhost/adventure_nodes_test'
  },
  test: {
    root: rootPath,
    db: 'mongodb://localhost/adventure_nodes_test'
  },
  staging: {
    root: rootPath,
    db: process.env.MONGOLAB_URI
  },
  production: {
    root: rootPath,
    db: process.env.MONGOLAB_URI
  }
}
