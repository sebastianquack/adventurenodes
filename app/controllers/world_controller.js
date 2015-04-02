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
var Spreadsheets = require('drive_controller')

var RegexWoBinIch = /^(look|look around)/i
var RegexWerBinIch = /^(who am I)/i
var RegexWerIstDa = /^(who is there)/i

/* function declarations */

// get a list of active players in a room
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
    roomSockets[i].get("uuid", function(err, uuid) {
      if (uuid == undefined) return
      else uuids.push(uuid)
      if (i >= roomSockets.length - 1) queryPlayers(uuids)
    })
  }
}

// announces players to each other, is called when player enters a subnode or looks around
function announceRoomPlayers(socket, player, announceArrival) {
    console.log("announcing player")
    getPlayersInRoom(socket, player.currentRoom, function(roomPlayers) {
      var playerNames = []
      for (i in roomPlayers) { 
        console.log(roomPlayers[i].name)
        if (player.uuid != roomPlayers[i].uuid) {
          playerNames.push(roomPlayers[i].name) 
          if (announceArrival) {
            Util.write(socket, player, {name: "System", currentRoom: player.currentRoom}, player.name.capitalize() + Util.linkify(" just arrived! <say something> <start a conversation>"), "sender", null, roomPlayers[i])
          }
        }
      }
      switch(playerNames.length) {
        case 0:  return;
        case 1:  var list= playerNames[0].capitalize() + " is"; break;
        case 2:  var list= playerNames[0].capitalize() + " and " + playerNames[1].capitalize() + " are"; break;
        default: var list= playerNames.splice(0,-1).map(Util.capitaliseFirstLetter).join(", ") + " and " + playerNames[playerNames.length-1].capitalize() + " are"
      }
      Util.write(socket, player, {name: "System", currentRoom: player.currentRoom}, Util.linkify(list + " here. <say something> <start a conversation>"), "sender")
    })
}

// parse WorldVariable String
function parseWV(string) {
  parts = string.split(" ")
  if(parts.length == 1) {
    return { name: parts[0].trim(), value: 'true', operator: "=" }    
  }
  if(parts.length == 2) {
    if(parts[0].trim() == "not") {
      return { name: parts[1].trim(), value: 'true', operator: "!=" }    
    } else 
      return { name: parts[0].trim(), value: parts[1].trim(), operator: "=" }    
  } 
  if (parts.length == 3) {
    if(parts[1].trim() == "not") {
      return { name: parts[0].trim(), value: parts[2].trim(), operator: "!=" }    
    }
  }
  return null
}

// check WorldVariable
function checkCondition(node, condition) {
  //console.log(node)
  if (condition == undefined) return true // no object given
  if (node.variables[condition.name] == undefined) { // wv hase not been set
    if(condition.operator == "=") return false
    if(condition.operator == "!=") return true
  }
  if(condition.operator == "=") {
    return (node.variables[condition.name] == condition.value)
  }
  if(condition.operator == "!=") {
    return !(node.variables[condition.name] == condition.value)
  }
}

// set node variable
function setWV(node, wv) {
  node.markModified('variables')
  if(wv.operator == "=") {
    node.variables[wv.name] = wv.value
    console.log("set WV " + wv.name + "=" + wv.value)
    node.save()
  }
  if(wv.operator == "!=") {
    node.variables[wv.name] = undefined
    console.log("unset WV " + wv.name)
    node.save()
  }
  //console.log(node)
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
  handleInput(socket, player, null)
}

// enter chat
function enterChat(socket, player, chatRoom, message) {
  player.currentChat = chatRoom
  socket.join(chatRoom)
  player.state = "chat"
  player.save()
  Chat.handleInput(socket, player, message, "start conversation")
}

// parse input and execute room actions
function processNodeAction(socket, player, input, marker) {
  var data = player.currentRoomData
  var actionFound = false
  if (data == undefined) return false
  var response = ""
  var jump = ""
  var effects = []
  var markers = []
  var markerReached = false
    
  for (i in data.action) {
    //console.log(i + ": " + data.marker[i] + " " + data.action[i] + " " + data.object[i]) 

    if(data.marker[i]) { // we're on a line with a marker
      markers.push(data.marker[i])
      if(!markerReached && data.marker[i] != marker && marker) {
        continue // it's not our marker, move on
      }
      if(data.marker[i] == marker || !marker) {
        markerReached = true // we've reached our marker
        if(!marker) {
          marker = data.marker[i]
        } else {
          Util.write(socket, player, {name: "System"}, "", "sender", "chapter")
        }
        player.currentMarker = marker // save marker for later
        player.save()
      }
      if(markerReached && data.marker[i] != marker) {
        break // we've reached the next marker
      }
    } else {
      if(!markerReached && marker) { // we haven't found our marker and we're really looking for one
        continue
      }
    }

    if (i >= data.action.length) { // prevent a strange bug having to do with cached data object being too large
      console.log("error prevented: player.currentRoomData too large!")
      continue
    }
    
    if (data.action[i] != undefined) data.action[i] = data.action[i].toLowerCase().trim()
    if (data.object[i] != undefined)  data.object[i] = data.object[i].toLowerCase().trim()

    // check if command and object matches
    var actions = data.action[i].split(",")
    var objects = data.object[i].split(",")  
    var matchAction = false
    var matchObject = false
    
    if(input) {
      
      actions.some(function(action) {
        if(action)
          if(input.indexOf(action.trim()) != -1) {
            matchAction = true
            return true
          }
      })
    
      objects.some(function(object) {
          if(input.indexOf(object.trim()) != -1) {
            matchObject = true
            return true
          }
      })
    
    }
    
    // check conditions
    var condition = null
    if (data.condition != undefined && data.condition[i].length > 0) {
      var condition = parseWV(data.condition[i])
    }
    
    // if there's no input and no command or if the input matches command+object && variable conditions are met
    if( ((!input && actions[0] == '') || (matchAction && matchObject)) && (condition == null || checkCondition(player.currentNode, condition)) ) {
      
      actionFound = true

      // collect effect
      if (data.effect != undefined && data.effect[i].length > 0) {
        effect = parseWV(data.effect[i])
        effects.push(effect)
      }   

      // collect response
      if(response != "") response += "<br>"
      response += Util.linkify(data.response[i])

      // announce action publicly
      if (data.announcement != undefined && data.announcement[i].length > 0) {
        Util.write(socket, player, {name: "System", currentRoom: player.currentRoom}, player.name.capitalize() + " " + Util.linkify(data.announcement[i]) + ".", "everyone else") // todo only to people in room
      } 

      // collect jumps
      if (data.jump != undefined && data.jump[i].length > 0) {
        jump = data.jump[i]
      }  

    }
  }
  // send response
  if (response != "") {
    Util.write(socket, player, {name: "System"}, response, "sender")
  }

  // set variable effects
  effects.forEach(function(effect) { setWV(player.currentNode, effect) })

  // do jump
  if (jump != "") {
    if(markers.indexOf(jump) != -1) { // check if jump is to a marker
      processNodeAction(socket, player, "", jump)
    } else 
    if(player.currentNode.subnodes.indexOf(jump) != -1) { // check if jump is to a subnode
      enterRoom(player, player.currentNode.title + "/" + jump, socket)
    }
    else { // jump to a whole different node
      enterRoom(player, jump, socket)
    }
  }  

  return actionFound
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
  
  player.currentRoomData = data;
  player.inMenu = false
  player.save()
  
  processNodeAction(socket, player, null, null) // display base description of room on entry
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
    
    // search node database by title
    AdventureNode.findOne({ title: requestedNode }, function(err, node) {
      if(err) return Util.handleError(err)
      
      // found the node
      if(node) {
        // save the node in playerx
        player.currentNode = node._id
        
        // reset marker
        player.currentMarker = null 
        // determine and save the name of the node / city to history
        if(player.cities.indexOf(node.title) == -1) {
          player.cities.push(node.title)
        }
        player.save()
        
        player.populate('currentNode', function() {
        
          // load room data from google and save it to player
          Spreadsheets.loadRoom(socket, player, player.currentRoom, node, function(data) {
            roomEntered(socket, player, data)
          })      
        })
              
      // no node found
      } else {
        Util.write(socket, player, {name: "System"}, "Error: Node not found.", "sender", "error")
      }
      
    })
    
    return
  }

  // check if player input matches to input from spreadsheet
  if (input != null) {
    actionFound = processNodeAction(socket, player, input, player.currentMarker)
  }

  // the action player entered was not specified, try to interpret it as general system command
  if (!actionFound) {

    // look around?
    if (input.search(RegexWoBinIch) != -1) {
      processNodeAction(socket, player, null, player.currentMarker)
      announceRoomPlayers(socket, player, null)
      return
    }

    // who am I?
    if (input.search(RegexWerBinIch) != -1) {
      Util.write(socket, player, {name: "System"}, player.name, "sender")
      return
    }

    // who else is here?
    if (input.search(RegexWerIstDa) != -1) {
      announceRoomPlayers(socket, player, null)
      return
    }

    var command = Util.getCommand(input)
    var object = Util.getObject(input)

    switch(command) {

      case "say" :
        var msg = input.substring(4)
        Chat.handleInput(socket, player, msg, "say")
        break

      case "start" :
        if(object != "conversation") break
        if(player.inMenu) {
          player.inMenu = false
        }
        player.state = "chat"
        player.save()
        Util.write(socket, player, {name: "System"}, "You start a conversation! Say goodbye to leave.", "sender")
        Util.write(socket, player, {name: "System"}, player.name.capitalize() + " starts a conversation! Say goodbye to leave.", "everyone else")
        enterChat(socket, player, player.currentRoom, "Let's talk!") 
        break
      
      case "warp":
        var target = object
        enterRoom(player, target, socket)
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