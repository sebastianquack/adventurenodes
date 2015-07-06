var Util = require('./util.js')
var mongoose = require('mongoose')
var adventureNode = mongoose.model('AdventureNode')
var nodePermission = mongoose.model('NodePermission')
var nodeEdge = mongoose.model('NodeEdge')

var drive_controller = require('drive_controller')

var exampleTitles = ["example1", "example2", "example3", "example4", "example5"]
var playModes = ["Text Adventure", "Tabletop Roleplaying", "Collective Writing"]

// load published nodes
var getPublicNodes = function(callback) {
  adventureNode.find({published: true }).sort({title: 1}).exec(function(err, adventure_nodes) {
    callback(adventure_nodes) 
  })  
}

// send back list of public nodes via json
var load_graph_json = function(req, res) {
  getPublicNodes(function(data) {    
    nodeEdge.find({}, function(err, edges) {
      res.setHeader('Content-Type', 'application/json')
      res.send(JSON.stringify({ nodes: data, edges: edges }))
    })    
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
    
  nodePermission.find({permissionId: ownerId}).populate('node').exec(function(err, permissions) {
    if(err) {
      console.log(err)
      return
    }
    
    var adventure_nodes = []
    permissions.forEach(function(permission) {
      if(permission.node) {
        adventure_nodes.push(permission.node)
      }
    })
    // sort
    function compare(a, b) {
      if (a.title < b.title) return -1
      if (a.title > b.title) return 1
      return 0
    }
    adventure_nodes.sort(compare)
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

// load index page with created nodes and examples
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

// link an existing spreadsheet to a new node (ajax)
var get_link = function(req, res) {
  var node = new adventureNode({})
  res.render('manage/node_details_edit', {node: node, link: true})
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

// update a node edge

var updateEdge = function(source_node, jump_target_name) {
  
  adventureNode.findOne({ title: jump_target_name }, function(err, target_node) {
    if(err) return Util.handleError(err)
  
    nodeEdge.findOne({sourceNode: source_node._id, targetNode: target_node._id}, function(err, edge) {
      if(err) return Util.handleError(err)
        
      if(!edge) {
        console.log("creating new edge")
        // create new edge
        var edge = new nodeEdge({sourceNode: source_node._id, targetNode: target_node._id})
        edge.save(function(err, data) {
          if(err) return Util.handleError(err)
          console.log(data)
        })
      } 
        
    })
  })  
}


module.exports.index = index
module.exports.load_graph_json = load_graph_json
module.exports.get_new = get_new
module.exports.get_link = get_link
module.exports.post_new = post_new
module.exports.get_node = get_node
module.exports.update_node = update_node
module.exports.loadCreated = loadCreated
module.exports.updateEdge = updateEdge

    
