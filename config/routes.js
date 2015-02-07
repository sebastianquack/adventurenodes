var mongoose = require('mongoose')
var express = require('express')
var drive_controller = require('../app/controllers/drive_controller')

//var auth = express.basicAuth('admin', process.env.admin_pw)

/**
 * Expose
 */

module.exports = function (app) {

  // render node management area
  app.get('/', function (req, res) { 
    res.render('manage', {title: 'adventure nodes'})
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

  // render node management area
  app.get('/embed/:node_title', function (req, res) { 
    var node_title = req.params.node_title
    res.render('manage/details', {node_title: node_title})
  })

  // play default node - intro?
  app.get('/play', function (req, res) {
    res.render('play')
  })

  // play specific node
  app.get('/play/:node_title', function (req, res) {
    var node_title = req.params.node_title
    res.render('play', {node_title: node_title})
  })

  /*
  // render admin interface
  app.get('/admin', auth, function (req, res) {
    res.render('admin', {title: 'node template - admin'})
  })
  */
  
}
