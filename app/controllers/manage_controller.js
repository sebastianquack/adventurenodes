var Util = require('./util.js')
var mongoose = require('mongoose')
var adventureNode = mongoose.model('AdventureNode')
var drive_controller = require('drive_controller')

// look up existing nodes and send to client
var updateNodeList = function(socket) {
  adventureNode.find({}, function(err, adventure_nodes) {
    socket.emit('update-node-list', adventure_nodes) 
  })
  
}

module.exports.init = function (io) {

    // client connects
    io.sockets.on('connection', function (socket) {
      
      // send client current list of nodes on connect
      updateNodeList(socket)
            
      // client has disconnected from socket
      socket.on('disconnect', function () {
        console.log('disconnect')
      })
    
    })
}