/* variable declarations */

var mongoose = require('mongoose')
//var Bots = mongoose.model('Bot')
var Player = mongoose.model('Player')
//var Cleverscript = require('./apis/cleverscript')
var RegexChatExit = /^(exit|ciao|tschüss|tschüß|tschüssikowski|bye|bye bye|auf wiedersehen|wiedersehen)+[\s!\.]*$/i

var Util = require('./util.js')
var World = require('./world_controller.js')

/* function declarations */

var leaveChat = function(socket, player, message) {

  
  Player
    .find({ 'currentChat': player.currentChat })
    .where('_id').ne(player._id)
    .where('online').equals(true)
    //.select('_id')
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
            //Util.write(socket, otherChatters[i], player, message, "everyone else and me", null, otherChatters[i])
            Util.write(socket, otherChatters[i], player, message, "sender", null, otherChatters[i])
          })
        }
      }
      else {
        for (i in otherChatters) {
          Util.write(socket, otherChatters[i], player, message, "sender", null, otherChatters[i])
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
var handleInput = function(socket, player, input) {

  if (input != null & input != "") {
    // reflect player input back to player
    Util.write(socket, player, player, input , "sender") 

  if(typeof input == "string" && input.search(RegexChatExit) != -1) { // leave chat
    leaveChat(socket, player, input)
    Util.write(socket, player, {name: "System"}, "Du verlässt das Gespräch.", "sender")    
    Util.write(socket, player, {name: "System"}, Util.linkify("Du bist weiterhin in " + Util.capitaliseFirstLetter(player.currentRoom) + ". [schaue]"), "sender")

    return
  }
      
    // send input to other chat members
    // (Hint: the easy way to just send to anybody would be: Util.write(socket, player, player, input , "chat") )
  
    Player
      .find({ 'currentRoom': player.currentRoom })
      //.where('previousChat').ne(player.currentChat)
      .where('_id').ne(player._id)
      .where('state').in(['world', 'chat'])
      .where('online').equals(true)
      //.select('_id')
      .exec(function (err, availableRoomPlayers) {
        // TODO: error handling

        // change state of recipients
        if (availableRoomPlayers != null && availableRoomPlayers.length > 0) {
          for (i in availableRoomPlayers) {
            availableRoomPlayers[i].currentChat = player.currentChat
            availableRoomPlayers[i].state = "chat"
            availableRoomPlayers[i].save(function (err, chatPlayer) {
              /*
              Util.playerGetSockets(chatPlayer, function(sockets) {
                for (s in sockets) {
                  sockets[s].join(player.currentChat)
                }
              })
              */
              Util.write(socket, chatPlayer, player, input, "sender", null, chatPlayer)
            })
          }
        }

        //Util.write(socket, player, player, input , "chat") // send the message

      })
  }
  
}

/* expose functionality */
module.exports.leaveChat = leaveChat
module.exports.handleInput = handleInput