/*!
 * Module dependencies
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var AdventureNodeSchema = new Schema({
  subnodes: { type: Array, default: [] }, 
  variables: { type: Object, default: {}},  
  driveId: { type: String, default: '' },
  drivePermissionId: { type: String, default: '' },
  ownerId: { type: String, default: '' },
  
  // this is directly user editable
  driveLink: { type: String, default: '' },  
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  author: { type: String, default: '' },
  published: { type: Boolean, default: false },
  playMode: { type: String, default: '' },
  colors: { type: Object, default: { borders: '#7c79d2', links: '#d7d6dc' } },  
})

/**
 * Methods
 */


/**
 * Events
 */

AdventureNodeSchema.post('save', function () {

})

/**
 * Statics
 */

AdventureNodeSchema.static({
  
})

/**
 * Register
 */

mongoose.model('AdventureNode', AdventureNodeSchema)