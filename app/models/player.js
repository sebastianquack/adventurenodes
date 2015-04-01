/*!
 * Module dependencies
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema
var Util = require('util')

var PlayerSchema = new Schema({
  uuid: { type: String, default: '' },
  sockets: { type: Array, default: [] }, 
  online: { type: Boolean, default: true }, 
  name: { type: String, default: '' },
  state: { type: String, default: '' },
  active: { type: Boolean, default: false },
  inMenu: { type: Boolean, default: false },
  passphrase: { type: String, default: null },
  currentMarker: { type: String, default: '' },
  currentRoom: { type: String, default: '' },
  previousRoom: { type: String, default: '' },
  currentRoomData: { type: Object, default: {}},  
  currentNode: { type: Object, default: {}},  
  currentBot: { type: String, default: '' },
  currentChat: { type: String, default: '' },
  previousChat: { type: String, default: '' },
  currentIP: { type: String, default: '' },
  blocked: { type: Boolean, default: false }, 
  quests: [],
  cities: []
})

/**
 * Methods
 */


/**
 * Events
 */

PlayerSchema.post('save', function () {
});

/**
 * Statics
 */

PlayerSchema.static({

})

/**
 * Register
 */

mongoose.model('Player', PlayerSchema)