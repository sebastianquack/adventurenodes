/* variable declarations */

var Util = require('./util.js')
var Menu = require('./menu_controller.js')
var Intro = require('./intro_controller.js')
var World = require('./world_controller.js')
var Drive = require('./drive_controller.js')
var Chat = require('./chat_controller.js')
var mongoose = require('mongoose')

/* function declarations */

// handle introduction
var handleInput = function(socket, player, input) {

  switch(Util.lowerTrim(input)) {

    case "rename":
      player.inMenu = false
      player.state = "welcome"
      player.save()
      Intro.handleInput(socket, player, "")
      break
      
    case "restart node":
      player.inMenu = false
      player.state = "world"
      player.save()
      World.enterRoom(player, player.currentRoom.split("/")[0], socket)
      break

    case "reload":
      Drive.clearCache(player.currentRoom)
      player.inMenu = false
      player.state = "world"
      player.save()
      World.enterRoom(player, player.currentRoom, socket)
      break

    case "back to the game":
      player.inMenu = false
      player.save()
      if(player.state == "world" || player.state == "bot" || player.state == "chat") {
        player.state = "world"
        player.save()
        World.handleInput(socket, player, "")
      } else {
        restart(socket, player)
      }
      break 

    case "help": 
      Util.write(socket, player, {name: "System"}, "How to play", "sender", "chapter")
      text = "Welcome to Adventure Nodes. Be curious! You'll figure things out. [back to the game]"
      player.inMenu = true
      player.save()
      Util.write(socket, player, {name: "System"}, Util.linkify(text), "sender")      
      break

    default:
      return false
  }
  return true
  
}

/* expose functionality */
module.exports.handleInput = handleInput
