var Util = require('./util.js')
var mongoose = require('mongoose')
var adventureNode = mongoose.model('AdventureNode')
var drive_controller = require('drive_controller')

// load published nodes
var getPublicNodes = function(callback) {
  adventureNode.find({published: true }).sort({title: 1}).exec(function(err, adventure_nodes) {
    callback(adventure_nodes) 
  })  
}

// load example nodes (specified here via list of title)
var getExampleNodes = function(callback) {
  var exampleTitles = ["example1", "example2", "example3", "example4", "example5"]
  adventureNode.find({title: {$in: exampleTitles}}).sort({title: 1}).exec(function(err, adventure_nodes) {
    callback(adventure_nodes) 
  })    
}

// load nodes with permission id
var getNodesByOwner = function(ownerId, callback) {
  adventureNode.find({ownerId: ownerId}).sort({title: 1}).exec(function(err, adventure_nodes) {
    callback(adventure_nodes) 
  })  
}

// load initial manage page
var index = function(req, res) {
  if(req.session.driveUserId) {
    loadCreated(req.session.driveUserId, req, res)
  } else {
    loadExamplePublic(req, res)
  }
}

var loadExamplePublic = function(req, res, createdNodes) {
  getExampleNodes(function(exampleNodes) {
    getPublicNodes(function(publicNodes) {
      res.render('manage', {
        title: 'Adventure Nodes', 
        exampleNodes: exampleNodes,
        publicNodes: publicNodes,
        createdNodes: createdNodes
      })        
    })
  })
}

// load index page with created nodes
var loadCreated = function(ownerId, req, res) {
  getNodesByOwner(ownerId, function(createdNodes) {
    loadExamplePublic(req, res, createdNodes)
  })
}

module.exports.index = index
module.exports.loadCreated = loadCreated


    
