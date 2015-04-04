/*!
 * Module dependencies
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var AdventureNodeSchema = new Schema({
  title: { type: String, default: '' },
  subnodes: { type: Array, default: [] }, 
  variables: { type: Object, default: {}},  
  driveId: { type: String, default: '' },
  drivePermissionId: { type: String, default: '' },
  driveLink: { type: String, default: '' },
  published: { type: Boolean, default: false },
  ownerId: { type: String, default: '' }
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