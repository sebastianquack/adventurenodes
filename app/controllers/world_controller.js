/* variable declarations */

var mongoose = require('mongoose')
var Player = mongoose.model('Player')
var ChatItem = mongoose.model('ChatItem')
var AdventureNode = mongoose.model('AdventureNode')

var Drive = require('./drive_controller.js')
var Util = require('./util.js')
var Chat = require('./chat_controller.js')
var Intro = require('./intro_controller.js')

var startingNodes = ['example1']
var RegexPrivateRooms = "(tretroller|stahlgleiter|mini\-van|kart)$"
var Spreadsheets = require('drive_controller')

var RegexWoBinIch = /^(wo bin ich|wobinich|wo|umschauen|schaue um|schaue dich um|schau um|schau dich um|schaue$)/i
var RegexWerBinIch = /^(wer bin ich|werbinich|ich$|schau dich an)/i
var RegexWerIstDa = /^(wer ist da|werbistda|wer$|wer ist anwesend)/i
var worldVariables = []

/* function declarations */

// get a list of active player in a room
function getPlayersInRoom(socket, room, callback) {

  uuids = []
  roomSockets = io.sockets.clients(room)

  var queryPlayers = function (uuids){
    Player.find( { uuid: { $in: uuids } } , function(err, roomPlayers) {
      if(err) return handleError(err)

      callback(roomPlayers)
    })
  } 

  for (i in roomSockets) {
    //if (uuids.indexOf(roomSockets[i]) == -1) 
    roomSockets[i].get("uuid", function(err, uuid) {
      if (uuid == undefined) return
      else uuids.push(uuid)
      if (i >= roomSockets.length-1) queryPlayers(uuids)
    })
  }
}

function announceRoomPlayers(socket, player, announceArrival) {
    if (player.currentRoom.search(RegexPrivateRooms) != -1) return // no output in private rooms
    getPlayersInRoom(socket, player.currentRoom, function(roomPlayers) {
      playerNames = []
      for (i in roomPlayers) { 
        if (player.name != roomPlayers[i].name) {
          playerNames.push(roomPlayers[i].name) 
          if (announceArrival) {
            Util.write(socket, player, {name: "System", currentRoom: player.currentRoom}, player.name + Util.linkify(" ist jetzt auch hier. [sprich " + player.name + "]"), "sender", null, roomPlayers[i])
          }
        }
      }    
      switch(playerNames.length) {
        case 0:  return;
        case 1:  var list= playerNames[0] + " ist"; break;
        case 2:  var list= playerNames[0] + " und " + playerNames[1] + " sind"; break;
        default: var list= playerNames.splice(0,-1).join(", ") + " und " + playerNames[playerNames.length-1] + " sind"
      }
      Util.write(socket, player, {name: "System", currentRoom: player.currentRoom}, Util.linkify("[" + list + " auch hier.|sage Hallo]"), "sender")
    })
}

// parse WorldVariable String
function parseWV(string) {
  parts = string.split("=")
  // TODO error handling
  return { name: parts[0], value: parts[1] }
}

// check WorldVariable
function checkWV(wv) {
  if (wv == undefined) return true // no object given
  if (worldVariables[wv.name] == undefined) { // wv does not exist
    console.log("init WV " + wv.name + "=" + wv.value)
    setWV(wv) // init at first appearance
    return true
  }
  else return (worldVariables[wv.name] == wv.value)
}

// set WorldVariable
function setWV(vw) {
  worldVariables[vw.name] = vw.value
}

// prepare player for movement
function setRoom(player, room, socket) {

  // always fix sockets (in case of reconnect)
  if (player.currentRoom != undefined && player.currentRoom != "") socket.leave(player.currentRoom)
  socket.join(room)

  // always clear the chat
  player.currentChat = "" 

  // update player on movement
  if (room != player.currentRoom) {
    
    // implement shorthand for subrooms in one node
    if(room.split("/")[0] == ".") {
      room = player.currentRoom.split("/")[0] + "/" + room.split("/")[1]
    }

    player.previousRoom = player.currentRoom
    player.currentRoom = room
    player.previousChat = "" // a new chance for chat
         
  }
}

// move player to a room
function enterRoom(player, room, socket) {
  setRoom(player, room, socket)
  player.currentRoomData = {}
  player.save()
  //if (reply == "") chat(socket, {name: "System"}, "Du verlässt den Raum...", "sender") // todo get response from db        
  handleInput(socket, player, null)
}

// enter chat
function enterChat(socket, player, chatRoom, message) {
  player.currentChat = chatRoom
  socket.join(chatRoom)
  player.state = "chat"
  player.save()
  Chat.handleInput(socket, player, message)
}

// parse and execute room commands
function processRoomCommand(socket, player, command, object) {
  data = player.currentRoomData
  roomCommandFound = false
  if (data == undefined) return false
  var reply = ""
  //var bot = ""
  var exit = ""
  var effects = []
  for (i in data.command) {
    if (i >= data.command.length) { // prevent a strange bug having to do with cached data object being too large
      console.log("error prevented: player.currentRoomData too large!")
      continue
    }
    if (data.command[i] != undefined) data.command[i] = data.command[i].toLowerCase().trim()
    if (data.object[i] != undefined)  data.object[i] = data.object[i].toLowerCase().trim()

    var condition = null

    // get world variable (condition)
    if (data.condition != undefined && data.condition[i].length > 0) {
      var condition = parseWV(data.condition[i])
    }

    if (
      data.command[i].split("|").indexOf(command) != -1
      && data.object[i].split("|").indexOf(object) != -1
      && (condition == null || checkWV(condition)) // check condition
    ) { // TODO: SYNONYMS
      
      roomCommandFound = true

      // collect effect
      if (data.effect != undefined && data.effect[i].length > 0) {
        effect = parseWV(data.effect[i])
        effects.push(effect)
      }   

      // collect reply
      reply = reply + Util.linkify(data.text[i]) + " "

      // announce action publicly
      if (data.announcement != undefined && data.announcement[i].length > 0) {
        Util.write(socket, player, {name: "System", currentRoom: player.currentRoom}, player.name + " " + Util.linkify(data.announcement[i]), "everyone else") // todo only to people in room
      } 

      // collect exit
      if (data.exit != undefined && data.exit[i].length > 0) {
        exit = data.exit[i]
      }  

    }
  }
  // send reply
  if (reply != "") {
    Util.write(socket, player, {name: "System"}, reply, "sender")
  }

  // set variable effects
  effects.forEach(function(effect) { setWV(effect) })

  // leave room
  if (exit != "") {
    enterRoom(player, exit, socket)
  }  

  return roomCommandFound
}

// function to process room data loaded from google spreadsheet
function roomEntered(socket, player, data) {

  // no data delivered - send player back to previous room (there is a slight risk of infinite loops here)
  if (data == undefined) {
    console.log("room " + player.currentRoom + " delivered no data. sending player back to " + player.previousRoom)
    Util.write(socket, player, {name: "System"}, "Error: Room data could not be loaded.", "sender", "error")
    if(player.previousRoom) {
      enterRoom(player, player.previousRoom, socket)
    }
    return
  }
  
  // save room data in player
  setRoom(player, player.currentRoom, socket)
  Util.write(socket, player, {name: "System"}, player.currentRoom.replace("/",", ") + " — \time", "sender", "chapter")
  //if (player.currentRoom.search(RegexPrivateRooms) == -1) Util.write(socket, player, {name: "System", currentRoom: player.currentRoom}, player.name + Util.linkify(" ist jetzt auch hier. [sprich " + player.name + "]"), "everyone else")
  player.currentRoomData = data;
  player.inMenu = false
  player.save()
  
  processRoomCommand(socket, player, "base", "") // display base description of room on entry
  announceRoomPlayers(socket, player, true) // announce player entry to other players
}     

// handle world exploration
var handleInput = function(socket, player, input) {  

  input = Util.lowerTrim(input)

  // there is no player input: the player just entered the room
  if(!input) { 
    
    // determine the name of the node the player wants to enter
    var requestedNode = player.currentRoom.split("/")[0] 

    // if player doesn't know where to be - assign to random node
    if(!requestedNode || player.currentRoom == undefined) {
      requestedNode = startingNodes[Math.floor(Math.random() * startingNodes.length)]
      setRoom(player, requestedNode, socket)
    }
    
    console.log("looking for Node " + requestedNode)
    
    // search node database by title
    AdventureNode.findOne({ title: requestedNode }, function(err, node) {
      if(err) return Util.handleError(err)
      
      // found the node
      if(node) {
        console.log("Moving player to node:")
        console.log(node)

        // save the node
        player.currentNode = node
        
        // determine and save the name of the node / city to history
        if(player.cities.indexOf(node.title) == -1) {
          player.cities.push(node.title)
        }
        player.save()
        
        // load room data from google and save it to player
        Spreadsheets.loadRoom(socket, player, player.currentRoom, node, function(data) {
          roomEntered(socket, player, data)
        })      
              
      // no node found
      } else {
        Util.write(socket, player, {name: "System"}, "Error: Node not found.", "sender", "error")
      }
      
    })
    
    return
  }

  // player entered a command
  var command = Util.getCommand(input)
  var object = Util.getObject(input)

  // check if player entered a command speficied in spreadsheet
  if (command != "base") {
    roomCommandFound = processRoomCommand(socket, player, command, object)
  }

  // the command palyer entered was not specified, try to interpret it as general system command
  if (!roomCommandFound) {

    // wo bin ich?
    if (input.search(RegexWoBinIch) != -1) {
      processRoomCommand(socket, player, "base", "")
      announceRoomPlayers(socket, player)
      return
    }

    // wer bin ich?
    if (input.search(RegexWerBinIch) != -1) {
      Util.write(socket, player, {name: "System"}, player.name, "sender")
      return
    }

    // wer ist da?
    if (input.search(RegexWerIstDa) != -1) {
      announceRoomPlayers(socket, player)
      return
    }

    switch(command) {
      case "sage" :
      case "sprich" :
        if(player.inMenu) {
          player.inMenu = false
        }
        player.state = "chat"
        player.save()
        Util.write(socket, player, {name: "System"}, "Du beginnst zu sprechen. Verabschiede dich, um das Gespräch zu beenden.", "sender")
        if (object) {
          playerOrMessage = Util.getCommand(object)
          var targetPlayer = undefined
          var message = Util.getObject(object)
          getPlayersInRoom(socket, player.currentRoom, function(roomPlayers) {
            for (i in roomPlayers) { 
              if (roomPlayers[i].name == playerOrMessage) {
                targetPlayer = roomPlayers[i]
              }
            }
            // target player found
            if (targetPlayer != undefined) {
              if (message) {
                // enter chat with targetPlayer & message
                //Util.write(socket, targetPlayer, {name: "System"}, player.name + " spricht so zu dir, dass nur du es hören kannst...", "sender")
                //Util.write(socket, player, {name: "System"}, "Du wendest dich " + targetPlayer.name + " zu.", "sender")
                //Util.write(socket, player, player, message, "everyone else", null, targetPlayer )
                enterChat(socket, player, player.currentRoom, object) 
              }
              else {
                // enter chat with targetPlayer
                enterChat(socket, player, player.currentRoom, object) 
              }
            }
            // no target player found
            else {
              // enter chat with room and message
              enterChat(socket, player, player.currentRoom, object) 
            }
          })
        }
        else {
          enterChat(socket, player, player.currentRoom) 
        }
        break
      case "warp":
        var target = object
        enterRoom(player, target, socket)
        break

      case "admin":
          switch(object) {
            case "print player":
              Util.write(socket, player, {name: "System"}, player, "sender")
            break
          }
        break
      default:
        if (!object) var apologies = "You try to " + command + ", but it doesn't work."
        else var apologies = "You try to " + command + " the " + object + ", but it doesn't work."
        Util.write(socket, player, {name: "System"}, apologies, "sender", "error")        
    }
  }

}


/* expose functionality */
module.exports.setRoom = setRoom
module.exports.enterRoom = enterRoom
module.exports.handleInput = handleInput