/*!
 * Module dependencies
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var NodePermissionSchema = new Schema({

  permissionId: { type: String, default: '' },
  driveLink: { type: String, default: '' },
  node: { type: Schema.Types.ObjectId, ref: 'AdventureNode' }

})

/**
 * Register
 */

mongoose.model('NodePermission', NodePermissionSchema)