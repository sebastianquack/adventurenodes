/* variable declarations */

var mongoose = require('mongoose')
var Player = mongoose.model('Player')
var PlayerAction = mongoose.model('PlayerAction')

var Util = require('./util.js')
var World = require('./world_controller.js')
var Chat = require('./chat_controller.js')
var Intro = require('./intro_controller.js')
var Menu = require('./menu_controller.js')

/* expose functionality */
module.exports.init = function (io) {

  // reset players
  console.log("Resetting Players...")
  Player.update({ online: true }, { $set: { online: false }}, { multi: true }, function() {

    // client connects
    io.sockets.on('connection', function (socket) {
      console.log('connected')
      //console.log(socket)

      // client detects player action
      socket.on('player-action', function (data) {    

        // check if player exists
        Player.findOne({ uuid: data.uuid }).populate('currentNode').exec(function(err, player) {
          if(err) return Util.handleError(err)

          // no player yet, create one
          if(!player) {
            player = new Player({ uuid: data.uuid }) // use data as name
            //player.state = "welcome"
            // skip intro
            player.state = "world"
            player.name = "Someone"
            player.active = true
            player.save()
          } 
          
          // connect sockets and players (player can have several sockets)
          socket.set("uuid", player.uuid) // or: add socket id to player (and clean the list up)
          socket.set("player", player) // store whole player in socket
          socket.join(player.uuid)
          player.online = true
          
          //console.log("headers " + Object.keys(socket.handshake.headers))
          if(socket.handshake.headers['x-forwarded-for'])
            player.currentIP = socket.handshake.headers['x-forwarded-for']
            //console.log("x-forwarded-for " + socket.handshake.headers['x-forwarded-for'])
          player.save()

          if (player.blocked == true) {
            Util.write(socket, player, {name: "System"}, Util.linkify("Dein Account wurde gesperrt. Bei Fragen hierzu wende dich bitte an /max.grafe@ringlokschuppen.de/"), "sender")
            return
          }

          if(data.firstPlayerAction && data.target_node) {
            console.log('moving player to ' + data.target_node)
            World.setRoom(player, data.target_node, socket)
          }  
          
          if (player.state == "welcome") {
            // new player action
            Intro.handleInput(socket, player, null)
          } else {

            // if client was just reloaded
            if(data.firstPlayerAction) {

              player.inMenu = false
              player.save()
              
              switch(player.state) {
                case "world":
                  break
                case "chat":
                  player.previousChat = player.currentChat            
                  player.currentChat = ""
                  player.state = "world"        
                  break      
                default: // reset intro to start
                  player.state = "welcome"
                  player.name = ""
                  player.save()
                  break
              }
            }

            // see if this is a menu event
            if(!Menu.handleInput(socket, player, data.input)) {

              // check player state and hand off to different parsers
              switch(player.state) {
                case "world": 
                  World.handleInput(socket, player, data.input)
                  break
                case "chat":
                  Chat.handleInput(socket, player, data.input)  
                  break              
                default:
                  Intro.handleInput(socket, player, data.input)
              }
            
            }
            
          }

        })
      })

      socket.on('log-load', function (data) {    
        console.log("query")
        console.log(data)
        Player.findOne({ uuid: data.uuid }).exec(function(err, player) {        
          if(data.limit)
            search = { room: player.currentRoom, time: {$lt: data.limit}}
          else 
            search = { room: player.currentRoom }
          PlayerAction.find(search).sort({ time: -1 }).limit(10).exec(function(err, actions) {
            console.log(actions)
            socket.emit('log-update', actions) 
          })
        })
      })

      socket.on('disconnect', function () {
        console.log('disconnect')
        socket.get("player", function(err, player) {
          if(player)
            //Util.logPlayerAction(player, "", "You are gone.", player.name.capitalize() + " is gone.", false)          
            World.announceRoomPlayers(socket, player, "departure")
        })
      })
    })
  })
}