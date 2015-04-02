/*!
 * Module dependencies
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var PlayerActionSchema = new Schema({
  time: { type : Number, default: Date.now }, // when?

  player_uuid: { type: String, default: '' }, // who?
  player_name: { type: String, default: '' },

  room: { type: String, default: ''}, // where?
  node: { type: Schema.Types.ObjectId, ref: 'AdventureNode' },

  input: { type: String, default: ''}, // what did the player enter?
  response: { type: String, default: ''}, // what happened? - player's perspective
  announcement: { type: String, default: ''}, // what happened? - public perspective
  direct: { type: Boolean, default: false} // did the player say something?

})

/**
 * Register
 */

mongoose.model('PlayerAction', PlayerActionSchema)