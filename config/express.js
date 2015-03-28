var express = require('express');
var path = require('path');
var env = process.env.NODE_ENV || 'development'
var config = require('./config')[env]

module.exports = function (app) {

  app.use(express.cookieParser());
  app.use(express.session({secret: 'supersecret123'}));

  app.use(express.logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded());
  app.use(express.methodOverride());  
  app.use(express.static(config.root + '/public'));
  app.use(app.router);
  if (env == 'development') {
    app.use(express.errorHandler());
  }
  
  app.set('view engine', 'jade');
  app.set('views', config.root + '/app/views')
  app.set('port', process.env.PORT || 3000)
  
  app.use(express.favicon(config.root + '/public/images/favicon.ico'))

  app.disable('etag') // prevent weird caching reload issue in safari

}