/*!
 * Module dependencies
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var PlayerSchema = new Schema({
  uuid: { type: String, default: '' },
  sockets: { type: Array, default: [] }, 
  online: { type: Boolean, default: true }, 
  name: { type: String, default: '' },
  state: { type: String, default: '' },
  active: { type: Boolean, default: false },
  inMenu: { type: Boolean, default: false },
  passphrase: { type: String, default: null },
  currentRoom: { type: String, default: '' },
  previousRoom: { type: String, default: '' },
  currentRoomData: { type: Object, default: {}},  
  currentBot: { type: String, default: '' },
  currentChat: { type: String, default: '' },
  previousChat: { type: String, default: '' },
  currentIP: { type: String, default: '' },
  blocked: { type: Boolean, default: false }, 
  quests: [],
  cities: []
})

/**
 * Methods
 */

PlayerSchema.methods.setRoom = function(room, socket) {

  // always fix sockets (in case of reconnect)
  if (this.currentRoom != undefined && this.currentRoom != "") socket.leave(this.currentRoom)
  socket.join(room)

  this.currentChat = "" // clean up

  // change attributs if there is a difference
  if (this.currentRoom != room) {
    this.previousRoom = this.currentRoom
    this.currentRoom = room
    this.previousChat = "" // a new chance for chat
    
    var currentCity = this.currentRoom.split("/")[0]
    if(this.cities.indexOf(currentCity) == -1) {
      this.cities.push(currentCity)
      console.log(this.cities)
    } 
  }
}

PlayerSchema.methods.getActiveQuestsToBot = function(toBot) {
  var quests = []
  this.quests.forEach(function(q) {
    if((q.toBot == toBot) && q.status == 'active') {
      quests.push(q)
    }
  })
  return quests
}

PlayerSchema.methods.getActiveQuestsFromBot = function(fromBot) {
  var quests = []
  this.quests.forEach(function(q) {
    if((q.fromBot == fromBot) && q.status == 'active') {
      quests.push(q)
    }
  })
  return quests
}


PlayerSchema.methods.resolveQuest = function(quest, status) {
  if(status == undefined) status = 'resolved'
  thisPlayer = this
  console.log("resolving quest")
  console.log(quest)
  this.quests.forEach(function(q, index) {
    if(q.fromBot == quest.fromBot && q.toBot == quest.toBot && q.message.text == quest.message.text) {
      thisPlayer.quests[index].status = status
      thisPlayer.markModified('quests')
      thisPlayer.save()
      console.log(thisPlayer.quests[index])
      return
    }
  })
}

/**
 * Events
 */

PlayerSchema.post('save', function () {
});

/**
 * Statics
 */

PlayerSchema.static({

})

/**
 * Register
 */

mongoose.model('Player', PlayerSchema)