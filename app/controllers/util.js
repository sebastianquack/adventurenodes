var mongoose = require('mongoose')
var ChatItem = mongoose.model('ChatItem')
var Player = mongoose.model('Player')

// handle errors
var handleError = function(err) {
  console.log("error")
  console.log(err)
  return err
}

// capitalize first letter of string
var capitaliseFirstLetter = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

String.prototype.capitalize = function() {
    return capitaliseFirstLetter(this)
}

// lower case and trim
var lowerTrim = function(input) {
  if(input) return input.trim().toLowerCase()
  else return input
}

// returns first word
var getCommand = function(input) {
  if(input) {
    var words = input.split(" ")
    return words[0]
  } else {
    return null
  }
}

var ignoreList = ['the', 'to', 'at', 'in', 'into', 'against']

// returns string without first word
var getObject = function(input) {
  var words = input.split(" ")
  if(words.length < 2) {
    return ""
  }
  if(words.length == 2) {
    return words[1]  
  }
  if(words.length >= 3) {
    if (['the', 'to', 'at', 'in', 'into'].indexOf(words[1]) >= 0) {
      if(words.length == 3) {
        return words[2] // eat the cake -> use cake
      }
      if (words.length > 3) {
        if (ignoreList.indexOf(words[2]) >= 0) {
          return words[3] // jump on the cake -> use cake
        }
      }
    }
  }
  // fallback: just return everything except first word as object
  words.splice(0,1)
  return words.join(" ") 
}

// parse world descriptions for links
var linkify = function(text) {
    
  text = text.replace(/\/(.*?)\//g,'<span class="italic">$1</span>') // italic      
  text = text.replace(/\*(.*?)\*/g,'<span class="bold">$1</span>') // bold
  text = text.replace(/\[(.*?)\|(.*?)\]/g,'<b data-command="$2">$1</b>') // parse old links
  text = text.replace(/\[(.*?)\]/g,'<b data-command="$1"></b>') // parse new links
    
	return text
}

var socketGetPlayer = function(socket, callback) {
  socket.get("uuid", function(err, uuid) {
    // TODO: error handling

    Player.find( { uuid: uuid } , function(err, player) {
      if(err) return handleError(err)

      callback(player)
    })
  })
}

var playerGetSockets = function(player, callback) {
  return io.sockets.clients(player.uuid)
}

// send text to client
// player: playing belonging to the socket, both causing the message
// emitter: player object of the sender ( usually the player again, or {name: "System"})
// value: the message
// mode: the recipients group
// type: info about the message type for the front end
//
// IDEE / REFACTOR : instead of taking metadata from player (which does not work for group messages to socket.io rooms)
// , pass only the relevant ones in the arguments if required
//
var write = function(socket, player, emitter, value, mode, type, recipient) {

  var ipLog = ""
  if(socket.handshake)
    if(socket.handshake.headers['x-forwarded-for'])
      ipLog = socket.handshake.headers['x-forwarded-for']

  var chat_item = new ChatItem({ 
    player_uuid: player.uuid, 
    sender_name: emitter.name,
    player_name: (mode == "sender" || mode == "socket") ? player.name : null, 
    player_room: (mode == "sender" || mode == "socket") ? player.currentRoom : null, 
    player_state: (mode == "sender" || mode == "socket") ? player.state : null,
    nodeLink: player.currentNode ? player.currentNode.driveLink : null,
    value: value, 
    type: type,
    ip: ipLog
  })
  
  if(player.inMenu) {
    chat_item.player_state = "menu"
  }
  chat_item.save()

  if (recipient != undefined)
    recipient_uuid = recipient.uuid
  else
    recipient_uuid = player.uuid

  // broadcast to everyone
  if(mode == "everyone")  
    socket.broadcast.emit('chat-update', chat_item)

  // broadcast to everyone else in room
  if(mode == "everyone else") {
    socket.broadcast.to(player.currentRoom).emit('chat-update', chat_item) 
  }

  // broadcast to everyone else in room and sender
  if(mode == "everyone else and me") {
    socket.to(player.currentRoom).emit('chat-update', chat_item)
    socket.broadcast.to(player.currentRoom).to(recipient_uuid).emit('chat-update', chat_item) 
  }

  // send to chat
  if(mode == "chat") {
    chat_item.player_state = "chat"
    socket.broadcast.to(player.currentChat).emit('chat-update', chat_item) 
  }

  // send to player
  if(mode == "sender") {
    io.sockets.to(recipient_uuid).emit('chat-update', chat_item) 
  }

  // send back to socket
  if(mode == "socket") {
    socket.emit('chat-update', chat_item) 
  }  
}

var getClientIp = function(req) {
  var ipAddress;
  // Amazon EC2 / Heroku workaround to get real client IP
  var forwardedIpsStr = req.header('x-forwarded-for'); 
  if (forwardedIpsStr) {
    // 'x-forwarded-for' header may return multiple IP addresses in
    // the format: "client IP, proxy 1 IP, proxy 2 IP" so take the
    // the first one
    var forwardedIps = forwardedIpsStr.split(',');
    ipAddress = forwardedIps[0];
  }
  if (!ipAddress) {
    // Ensure getting client IP address still works in
    // development environment
    ipAddress = req.connection.remoteAddress;
  }
  return ipAddress;
}

module.exports.capitaliseFirstLetter = capitaliseFirstLetter
module.exports.linkify = linkify
module.exports.getCommand = getCommand
module.exports.getObject = getObject
module.exports.handleError = handleError
module.exports.write = write
module.exports.lowerTrim = lowerTrim
module.exports.socketGetPlayer = socketGetPlayer
module.exports.playerGetSockets = playerGetSockets
module.exports.getClientIp