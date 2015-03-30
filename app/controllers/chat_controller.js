/* variable declarations */

var mongoose = require('mongoose')
var Player = mongoose.model('Player')
var RegexChatExit = /^(exit|ciao|tschüss|tschüß|tschüssikowski|bye|bye bye|auf wiedersehen|wiedersehen)+[\s!\.]*$/i

var Util = require('./util.js')
var World = require('./world_controller.js')

/* function declarations */

var leaveChat = function(socket, player, message) {

  Player
    .find({ 'currentChat': player.currentChat })
    .where('_id').ne(player._id)
    .where('online').equals(true)
    .exec(function (err, otherChatters) {
      // TODO: error handling

      // kick other chatter out, if there is only one chatter left
      if (otherChatters != null && otherChatters.length == 1) {
        for (i in otherChatters) {
          // PROBLEM: cannot remove chatter from room as the socket is unknown
          otherChatters[i].previousChat = player.currentChat            
          otherChatters[i].currentChat = ""
          otherChatters[i].state = "world"
          otherChatters[i].save( function(err, data) {
            Util.write(socket, otherChatters[i], player, message, "sender", null, otherChatters[i])    
          })
        }
      }
      else {
        for (i in otherChatters) {
          Util.write(socket, otherChatters[i], player, message, "sender", null, otherChatters[i])
          Util.write(socket, otherChatters[i], {name: "System"}, player.name.capitalize() + " has left the conversation.", "sender", null, otherChatters[i])
        }
      }
    })
  
  if (player.currentChat != player.currentRoom) { // do not leave room feed
    Util.playerGetSockets(player, function(sockets) {
      for (s in sockets) {
        sockets[s].leave(player.currentChat)
      }
    })
  }
  player.previousChat = player.currentChat
  player.currentChat = ""
  player.state = "world" // send player back into world
  player.save()
}

// handle player chat
var handleInput = function(socket, player, input, mode) {

  if (input != null & input != "") {
    // reflect player input back to player
    Util.write(socket, player, player, input , "sender") 

  if(typeof input == "string" && input.search(RegexChatExit) != -1) { // leave chat
    leaveChat(socket, player, input)
    Util.write(socket, player, {name: "System"}, "", "sender", null, player) // send empty message to end chat
  
    return
  }
      
  // send input to other chat members
  // (Hint: the easy way to just send to anybody would be: Util.write(socket, player, player, input , "chat") )

  var chatPartnerStates = ['chat']
  if(mode == "start conversation" || mode == "say") {
     chatPartnerStates.push('world') // pull in other players only when chat is first initated or it's a single chat
  }

  Player
      .find({ 'currentRoom': player.currentRoom })
      .where('_id').ne(player._id)
      .where('state').in(chatPartnerStates)
      .where('online').equals(true)
  .exec(function (err, availableRoomPlayers) {
        // TODO: error handling

        // change state of recipients
        if (availableRoomPlayers != null && availableRoomPlayers.length > 0) {
          for (i in availableRoomPlayers) {
            if(mode != "say") { // don't pull people into conversation if it's just a one time speach act
              availableRoomPlayers[i].currentChat = player.currentChat
              availableRoomPlayers[i].state = "chat"
            }
            availableRoomPlayers[i].save(function (err, chatPlayer) {
              Util.write(socket, chatPlayer, player, input, "sender", null, chatPlayer)
            })
          }
        }

      })
  }
  
}

/* expose functionality */
module.exports.leaveChat = leaveChat
module.exports.handleInput = handleInput