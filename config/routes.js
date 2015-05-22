var mongoose = require('mongoose')
var express = require('express')
var drive_controller = require('../app/controllers/drive_controller')
var manage_controller = require('../app/controllers/manage_controller')
//var auth = express.basicAuth('admin', process.env.admin_pw)

/**
 * Expose
 */

module.exports = function (app) {

  // render node management area
  app.get('/', function (req, res) { 
    manage_controller.index(req, res)
  })

  // send user to google to get info
  app.get('/manage/load_created', function (req, res) {
    drive_controller.authorize_about(req, res)
  })

  // send user to google to authenticate drive
  app.get('/manage/create', function (req, res) {
    drive_controller.authorize_create(req, res)
  })

  // send user to google to authenticate drive
  app.get('/manage/remove/:id', function (req, res) {
    drive_controller.authorize_remove(req, res)
  })

  // render create spreadsheet result
  app.get('/google_callback', function (req, res) {
    drive_controller.handle_callback(req, res)
  })

  // get form for new node
  app.get('/node/new', function (req, res) { 
    manage_controller.get_new(req, res)
  })

  // create a new node
  app.get('/node/create', function (req, res) { 
    manage_controller.post_new(req, res)
  })

  // get node data
  app.get('/node/:node_id', function (req, res) { 
    manage_controller.get_node(req, res)
  })

  // update node data
  app.post('/node/:node_id', function (req, res) { 
    manage_controller.update_node(req, res)
  })

  // render node management area
  app.get('/embed/:node_title', function (req, res) { 
    var node_title = req.params.node_title
    res.render('manage/embed', {node_title: node_title})
  })

  // play specific node
  app.get('/:node_title', function (req, res) {
    var node_title = req.params.node_title
    console.log(node_title)
    res.render('play', {node_title: node_title})
  })

  /*
  // render admin interface
  app.get('/admin', auth, function (req, res) {
    res.render('admin', {title: 'node template - admin'})
  })
  */
  
}
