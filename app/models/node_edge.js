/*!
 * Module dependencies
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var NodeEdgeSchema = new Schema({
  sourceNode: { type: Schema.Types.ObjectId, ref: 'AdventureNode' },
  targetNode: { type: Schema.Types.ObjectId, ref: 'AdventureNode' }
})

/**
 * Methods
 */


/**
 * Events
 */

NodeEdgeSchema.post('save', function () {

})

/**
 * Statics
 */

NodeEdgeSchema.static({
  
})

/**
 * Register
 */

mongoose.model('NodeEdge', NodeEdgeSchema)