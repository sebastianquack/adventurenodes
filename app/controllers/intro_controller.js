/* variable declarations */

var Util = require('./util.js')
var World = require('./world_controller.js')
var Chat = require('./chat_controller.js')
var mongoose = require('mongoose')
var Player = mongoose.model('Player')

/* function declarations */

// handle introduction
var handleInput = function(socket, player, input) {
  
  switch(player.state) {
  case "welcome":
    Util.write(socket, player, {name: "System"}, "Out of nowhere, a computer speaks to you.", "socket")
    //if (player.name == "") player.name = "Du"
    Util.write(socket, { name: "You" }, {name: "Computer"}, "How do you want to be called?", "socket")
    player.inMenu = false
    player.state = "name"
    player.save()
    break

  case "name":
    Util.write(socket, { name: "You" }, { name: "You" }, input, "socket") // echo player input
    input = Util.lowerTrim(input)
    Util.write(socket, player, {name: "Computer"}, "Ok. Have fun, " + Util.capitaliseFirstLetter(input) + "!", "socket")
    
    // save player data
    var oldName = player.name.capitalize()
    if(!oldName) oldName = "Someone"
    player.name = input
    player.state = "world"
    player.save()
    socket.set("player", player) // store whole player in socket
    
    var response = "Your name is now " + player.name.capitalize() + "."
    var announcement = oldName + " set their name to " + player.name.capitalize() + "."
    Util.logPlayerAction(player, "", response, announcement, false)            
    Util.write(socket, player, {name: "System"}, response, "sender", null, player)
    Util.write(socket, player, {name: "System", currentRoom: player.currentRoom}, announcement, "everyone else")
    
    if(!player.active) {
      player.active = true    
      player.save()
      // hand off to world controller
      World.handleInput(socket, player, null)
    }
    
    break
  }
}

/* expose functionality */
module.exports.handleInput = handleInput
