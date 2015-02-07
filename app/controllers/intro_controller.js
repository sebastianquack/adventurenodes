/* variable declarations */

var Util = require('./util.js')
var World = require('./world_controller.js')

var mongoose = require('mongoose')
var Player = mongoose.model('Player')

var RegexJump = /^(jump|go|yes)?[\s!\.]*$/i

// handle introduction
var handleInput = function(socket, player, input) {
  
  switch(player.state) {
  case "welcome":
    Util.write(socket, player, {name: "System"}, "You are standing in an empty room with a computer.", "socket")
    //if (player.name == "") player.name = "Du"
    Util.write(socket, { name: "You" }, {name: "Computer"}, "Before you can enter your first node, I need to ask a few questions. What's your name?", "socket")
    player.inMenu = false
    player.state = "name"
    player.save()
    break

  case "name":
    Util.write(socket, { name: "You" }, { name: "You" }, input, "socket") // echo player input
    input = Util.lowerTrim(input)
    
    console.log(input)
    
    // check if playername exists
    Player.find({ name: input /*, active: true */ }, function (err, records) {

      //console.log(records)
      
      if(records.length >= 1) {
    
        // if yes, ask passphrase    
        Util.write(socket, {name: "You"}, {name: "Computer"}, Util.capitaliseFirstLetter(input) + "... I have heard this name before. Do you know the passphrase?", "socket")
        player.name = input
        player.state = "check_passphrase"
        player.save()

      } else {

        // if no, create player
        player.name = input
        player.state = "save_passphrase"
        player.save()      
        Util.write(socket, player, {name: "Computer"}, "Hi, " + Util.capitaliseFirstLetter(input) + "! Please make up a passphrase so I can recognize you in the future.", "socket")
      }

    })
    
    break
    
  case "check_passphrase":
    Util.write(socket, player, player, input, "socket") // echo player input
    input = Util.lowerTrim(input)

    Player.findOne({ name: player.name }, function (err, existingPlayer){

      if(existingPlayer) {
    
        console.log(existingPlayer.passphrase)
    
        // check if passphrase is correct
        if(existingPlayer.passphrase == input) {

          Util.write(socket, player, {name: "Computer"}, "Ah, it's you, good. I'll bring you in now.", "socket")

          // use existingPlayer from now on with this cookie, remove temporary player document
          existingPlayer.uuid = player.uuid
          existingPlayer.state = "world"
          existingPlayer.save()
          player.remove()

          World.handleInput(socket, existingPlayer, null)
                            
        } else {

          player.name = "Du"
          player.state = "name"
          player.save()         
          Util.write(socket, player, {name: "Computer"}, "You don't seem to be the " + Util.capitaliseFirstLetter(existingPlayer.name) + "that I know. Please choose a different name, so I don't get confused!", "socket")
        }
        
      } else {
        // this shouldn't happen, go back to start
        player.state = "welcome"
        player.save()      
      }

    })
    break
        
  case "save_passphrase":
    Util.write(socket, player, player, input , "socket") // echo player input
    player.passphrase = input
    player.state = "jump"
    player.save()
    Util.write(socket, player, {name: "Computer"}, "Alright! You're ready to go. All you need to do is jump!", "socket")
    Util.write(socket, player, {name: "System"}, Util.linkify("You hesitate for a moment. [Will you jump?|jump]"), "socket")
    break
    
  case "jump":
    if(!input) input = ""
    if(input.search(RegexJump) != -1) { 
      Util.write(socket, player, {name: "System"}, "You crouch down low and jump into the air. You land in...", "socket")
    } else {
      Util.write(socket, player, {name: "System"}, "While you are still hesitating, the computer loses her patience and brutally yanks you into the node. You recover your senses in...", "socket")            
    }
    
    if(player.currentRoom == undefined) {
      randomRoom = World.rooms[Math.floor(Math.random() * World.rooms.length)]
      player.setRoom(randomRoom, socket)
      console.log("random room " + randomRoom + " -> " + player.currentRoom)
    }
    
    player.state = "world"
    player.active = true
    player.save()
    World.handleInput(socket, player, null)
    break
  }
}

/* expose functionality */
module.exports.handleInput = handleInput
