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

    case "restart":
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

    case "rename":
      if(player.state == "chat") {
        var message = "Bye for now, I'm renaming myself..."
        Util.write(socket, player, player, message, "sender") 
        Chat.leaveChat(socket, player, message)
      }
      player.inMenu = false
      player.state = "welcome"
      player.save()
      Intro.handleInput(socket, player, "")
      break
      
    case "help": 
      if(player.state == "chat") {
        var message = "Bye for now, I'm reading the manual..."
        Util.write(socket, player, player, message, "sender") 
        Chat.leaveChat(socket, player, "Bye for now, I'm reading the manual...")
      }
      
      //Util.write(socket, player, {name: "System"}, "", "sender", "chapter")
      text = "Welcome to Adventure Nodes. Be curious! Click on the yellow boxes or type things using your keyboard. Make sure you also click on the menu button at the top right. You'll figure things out. You can always try to <look around>"
      /*player.inMenu = true
      player.save()*/
      Util.write(socket, player, {name: "System"}, Util.linkify(text), "sender")      
      /*break
        
    case "back to the game":
      player.inMenu = false
      player.save()
      if(player.state == "world" || player.state == "bot" || player.state == "chat") {*/
      player.state = "world"
      player.save()
      //Util.write(socket, player, {name: "System"}, "", "sender", "chapter", player) // send empty message to get back to game
      //} else {
      //  restart(socket, player)
        //}
      break 
        

    default:
      return false
  }
  return true
  
}

/* expose functionality */
module.exports.handleInput = handleInput
