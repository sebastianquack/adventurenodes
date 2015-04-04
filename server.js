/**
 * Module dependencies.
 */
var express = require('express')
var mongoose = require('mongoose')
var http = require('http')
var path = require('path')
var fs = require('fs')
var env = process.env.NODE_ENV || 'development'
var config = require('./config/config')[env]

// Connect to mongodb
var connect = function () {
  var options = { server: { socketOptions: { keepAlive: 1 } } }
  mongoose.connect(config.db, options)
}
connect()

// Error handler
mongoose.connection.on('error', function (err) {
  console.log(err)
})

// Reconnect when closed
mongoose.connection.on('disconnected', function () {
  connect()
})

// Bootstrap models
fs.readdirSync(__dirname + '/app/models').forEach(function (file) {
  if (~file.indexOf('.js')) require(__dirname + '/app/models/' + file)
})

// create app
var app = express()

// Bootstrap application settings
require('./config/express')(app)

// Bootstrap routes
require('./config/routes')(app)

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'))
})

// sockets
io = require('socket.io').listen(server)
io.set('log level', 1) // disable verbose socket log

// launch game_controller
var game_controller = require('./app/controllers/game_controller')
game_controller.init(io)