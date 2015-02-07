/*!
 * Module dependencies
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var WorldVariableSchema = new Schema({
  name: { type: String, default: '' },
  value: { type: String, default: '' },
})

/**
 * Register
 */

mongoose.model('WorldVariable', WorldVariableSchema)