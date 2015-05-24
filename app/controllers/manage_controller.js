var Util = require('./util.js')
var mongoose = require('mongoose')
var adventureNode = mongoose.model('AdventureNode')
var drive_controller = require('drive_controller')

var exampleTitles = ["example1", "example2", "example3", "example4", "example5"]
var playModes = ["Text Adventure", "Tabletop Roleplaying", "Collective Writing"]

// load published nodes
var getPublicNodes = function(callback) {
  adventureNode.find({published: true }).sort({title: 1}).exec(function(err, adventure_nodes) {
    callback(adventure_nodes) 
  })  
}

// load example nodes (specified here via list of title)
var getExampleNodes = function(callback) {
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
var index = function(req, res, newNode, notice) {
  if(req.cookies.driveUserId) {
    loadCreated(req.cookies.driveUserId, req, res, newNode, notice)
  } else {
    loadExamplePublic(req, res, null, newNode, notice)
  }
}

var loadExamplePublic = function(req, res, createdNodes, newNode, notice) {
  getExampleNodes(function(exampleNodes) {
    getPublicNodes(function(publicNodes) {
      res.render('manage', {
        title: 'Adventure Nodes', 
        exampleNodes: exampleNodes,
        publicNodes: publicNodes,
        createdNodes: createdNodes,
        node: newNode,
        notice: notice,
        create: true
      })        
    })
  })
}

// load index page with created nodes
var loadCreated = function(ownerId, req, res, newNode, notice) {
  getNodesByOwner(ownerId, function(createdNodes) {
    loadExamplePublic(req, res, createdNodes, newNode, notice)
  })
}

// get node data
var get_node = function(req, res) {
  adventureNode.findOne({_id: req.params.node_id}, function(err, node) {
    if(err) return Util.handleError(err)
      
    if(req.param('edit'))
      res.render('manage/node_details_edit', {node: node, exampleTitles: exampleTitles, playModes: playModes})
    else 
      res.render('manage/node_details', {node: node, exampleTitles: exampleTitles, playModes: playModes})
  })
}

// update node data from req object
var update_node_data = function(node, req, callback) {
  console.log(node)
  console.log(req.body)
  if(req.body.title != undefined) node.title = req.body.title
  if(req.body.description != undefined) node.description = req.body.description
  if(req.body.author != undefined) node.author = req.body.author
  node.published = (req.body.published == "True")
  if(req.body.playMode != undefined) node.playMode = req.body.playMode
  if(node.colors == undefined) node.colors = {}
  if(req.body.colors_links != undefined) {
    node.colors.links = req.body.colors_links
    node.markModified("colors")
  }
  if(req.body.colors_borders != undefined) {
    node.colors.borders = req.body.colors_borders
    node.markModified("colors")
  }
  if(req.body.colors_highlights != undefined) {
    node.colors.highlights = req.body.colors_highlights
    node.markModified("colors")
  }
  // todo: driveLink
  node.save()
  console.log(node)    
  callback(node)
}

// update a node
var update_node = function(req, res) {
  adventureNode.findOne({_id: req.param('node_id')}, function(err, node) {
    if(err) return Util.handleError(err)
    update_node_data(node, req, function(node) {
      res.render('manage/node_details', {node: node, playModes: playModes, notice: "success"})        
    })
  })
}

// create a new node (ajax)
var get_new = function(req, res) {
  var node = new adventureNode({})
  getExampleNodes(function(exampleNodes) {
    res.render('manage/node_details_edit', {node: node, exampleNodes: exampleNodes, playModes: playModes, create: true})
  })
}

// create a new node
var post_new = function(req, res) {
  
  // normalize title
  var title = req.query.title = req.query.title.trim()

  var newNode = new adventureNode({})
  newNode.title = title

  // check if title contains illegal characters
  if(!/^[a-zA-Z0-9\s]*$/i.test(title) || title == "" || !title)  {
    index(req, res, newNode, 'Please only use alphanumeric characters and spaces in your node title!')
    return
  }
  
  // check if node with that title exists
  adventureNode.findOne({ title: title }, function(err, node) {
    if(err) return handleError(err)      
    if(node) {
      index(req, res, newNode, 'A node with that title already exists. Please choose another title!')
    } else {  
      drive_controller.authorize_create(req, res, title)
    }
  })

}

module.exports.index = index
module.exports.get_new = get_new
module.exports.post_new = post_new
module.exports.get_node = get_node
module.exports.update_node = update_node
module.exports.loadCreated = loadCreated


    
