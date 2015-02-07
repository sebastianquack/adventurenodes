/*!
 * Module dependencies
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var ChatItemSchema = new Schema({
  player_uuid: { type: String, default: '' },
  sender_name: { type: String, default: '' },
  player_name: { type: String, default: '' },
  player_room: { type: String, default: ''},
  player_state: { type: String, default: ''},
  value: { type: String, default: '' },
  type: { type: String, default: '' },  
  time: { type : Date, default: Date.now },
  ip: { type: String, default: '' }
})

/**
 * Register
 */

mongoose.model('ChatItem', ChatItemSchema)