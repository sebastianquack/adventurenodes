/* requires */

var mongoose = require('mongoose')
var AdventureNode = mongoose.model('AdventureNode')
var google = require('googleapis')
var Util = require('./util.js')
var manage_controller = require('manage_controller')


/* variables */

// authentication info for web app (creating & deleting a specific user's sheets)
var CLIENT_ID = '7163825488-q83ocjovlutg8e7cuoc9465bun33grvn.apps.googleusercontent.com'
var CLIENT_SECRET = process.env.googleClientSecret

if(process.env.NODE_ENV)
  REDIRECT_URL = 'http://adventurenodes.herokuapp.com/google_callback'
else
  REDIRECT_URL = 'http://localhost:3000/google_callback'

var drive = google.drive('v2')
var auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
var SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
var url = auth.generateAuthUrl({ scope: SCOPES })
google.options({ auth: auth }); // set auth as a global default

// authentication info for service account (reading & editing everyone's sheets)
var googleConf = {
          email: '7163825488-co5a1u10nfuscftajim053e9ht6kpkqi@developer.gserviceaccount.com',
          key: process.env.googleAPIKey2,
          useHTTPS: false,
          scopes: ['http://docs.google.com/feeds/','http://spreadsheets.google.com/feeds']
        }
var Spreadsheet = require('./edit-google-spreadsheet-patched')
var spreadsheetIdCache = {}
var spreadsheetCache = {}

/* functions */

var getDriveId = function(driveLink) {
  var re = /^https*:\/\/docs\.google\.com\/spreadsheets\/d\/(.*)\/edit/
  if ((m = driveLink.match(re)) !== null) {
    console.log(m)
    return m[1]
  }
  return null
}

// request authorization to get info on user
var authorize_about = function(req, res) {
  req.session.driveAction = "about"
  res.redirect(url)
}

// respond to user create new node action, send user to google for authorization
var authorize_create = function(req, res, title) {
    req.session.driveAction = "create"
    req.session.nodeExampleId = req.query.exampleId
    req.session.nodeDriveLink = req.query.driveLink
    req.session.nodeTitle = title
    res.redirect(url) // request authorization from google
}

// respond to user remove spreadsheet action, send user to google for authorization
var authorize_remove = function(req, res) {
  req.session.driveAction = "remove"
  req.session.driveId = req.params.id // save id in session for after auth
  console.log("saving driveId in session " + req.session.driveId)
  res.redirect(url)
}

// respond to google's callback
var handle_callback = function(req, res) {
  console.log("google callback")
  //console.log(res)
  console.log("req.session.driveAction = " + req.session.driveAction)
  switch(res.req.session.driveAction) {
    case "about":
      get_user_info(req, res)
      break
    case "create": 
      new_spreadsheet(req, res)
      break
    case "remove":
      remove_spreadsheet(req, res)
      break
  }
}

// requests an access token from google for the web app
var getAccessToken = function(code, callback) {
    auth.getToken(code, function(err, tokens) {
      if (err) {
        console.log('Error while trying to retrieve access token', err)
        return
      }
      //auth.credentials = tokens
      auth.setCredentials(tokens)
      callback()
    })
}

// get info on user
var get_user_info = function(req, res) {
  getAccessToken(req.query.code, function() {
    drive.about.get(function(err, data) {
      if(err) {
        console.log(err)
        res.redirect('/')      
        return
      }
      console.log(data.user.permissionId)
      req.session.driveUserId = data.user.permissionId
      res.redirect('/')
      //manage_controller.loadCreated(data.user.permissionId, req, res)
    })
  })
}

// create new spreadsheet 
var new_spreadsheet = function(req, res) {
  getAccessToken(req.query.code, function() {
    upload(req.session.nodeExampleId, req.session.nodeDriveLink, req.session.nodeTitle, function(ownerId) { 
      console.log("handing off to manage_controller " + ownerId)
      req.session.driveUserId = ownerId
      res.redirect('/')      
      //manage_controller.loadCreated(ownerId, req, res)
    })
  })
}

// creates a new spreadsheet on user's account, shares with service account
var upload = function(exampleId, driveLink, title, callback) {
  // if driveLink is defined, use an existing sheet
  if(driveLink) {
    console.log(getDriveId(driveLink))
    drive.files.get({
      fileId: getDriveId(driveLink),
      auth: auth
    }, function(err, data) {
      if(err) { 
        console.log(err) // copy works but this throws 404 file not found error - why??
        callback()
        return
      }
      data.title = title
      createNodeAndSetupPermissions(data, callback)       
    })
  } else
  // if exampleId is specified, copy spreadsheet to user drive
  if(exampleId) {
    drive.files.copy({
       fileId: exampleId, // this is the original file id to be copied
       resource: { 
         title: title, // this is how the copy of the file should be called
         parents: [{id: "root"}] // this is where the copy of the file should be located
       },
       auth: auth
    }, function(err, data) {
        if(err) { 
          console.log(err) // copy works but this throws 404 file not found error - why??
          callback()
          return
        }
      createNodeAndSetupPermissions(data, callback)       
      })
  } else { // create a new empty spreadsheet in users
    drive.files.insert({
      resource: {
        title: title,
        mimeType: 'application/vnd.google-apps.spreadsheet'
      },
      auth: auth
    }, function(err, data) {
      createNodeAndSetupPermissions(data, function(ownerId) {
        baseSetupSpreadsheet(data.id, function() { // setup table header
          callback(ownerId) 
        }) 
      })                         
    })        
  } 
}

var createNodeAndSetupPermissions = function(data, callback) {
  
  var ownerId = data.owners[0].permissionId
  console.log("owner id " + ownerId)
  
  // create node object to link to google spreadsheet
  var new_adventure_node = new AdventureNode({ 
    driveId: data.id,
    driveLink: data.alternateLink, // this is how a user can access her file
    title: data.title,
    ownerId: ownerId
  }) 
  new_adventure_node.save()
  console.log(new_adventure_node)
  
  // add permission to service account for accessing the spreadsheet
  drive.permissions.insert({
    fileId: new_adventure_node.driveId,
    sendNotificationEmails: false,
    resource: {
      role: "writer",
      type: "user",
      value: "7163825488-co5a1u10nfuscftajim053e9ht6kpkqi@developer.gserviceaccount.com" 
    },
    auth: auth
  }, function(err, permission_data) {
    if(err) {
      console.log(err)
      callback()
      return
    }
    //console.log(permission_data)
    new_adventure_node.drivePermissionId = permission_data.id
    new_adventure_node.save()
    callback(ownerId)
  })
}

// fills spreadsheet with basic data
var baseSetupSpreadsheet = function(spreadsheetId, callback) {
  
    Spreadsheet.load({
      debug: true,
      spreadsheetId: spreadsheetId,
      useDefaultWorksheet: true,
      oauth : googleConf
    }, function sheetReady(err, spreadsheet) {
      if(err) {
        console.log(err)
      	return
      }
      
      spreadsheet.add({ 1: { 1: "action", 2: "object", 3: "response" } });
      spreadsheet.add({ 2: { 1: "", 3: "hello, world!" } });

      spreadsheet.send({ autoSize: true }, function(err) {
        if(err) {
          console.log(err)
        }
        callback()
      }) 
    })
}

// remove spreadsheet
var remove_spreadsheet = function(req, res) {
  console.log("requesting access token...")
  getAccessToken(req.query.code, function() {
    remove(req.session.driveId, function() {
      res.redirect('/')      
    })
  })
}

// creates a new spreadsheet on user's account, shares with service account
var remove = function(id, callback) {

  AdventureNode.findOne( { _id: id } , function(err, node) {
    if(err) return handleError(err)
        
      console.log("touching file " + id)
      drive.files.touch({
        fileId: node.driveId,
        auth: auth
      }, function(err, data) {
      
        if(!err) {
      
          // remove adventure node from database
          var permissionId
          permissionId = node.drivePermissionId // save permission Id for later
          console.log("saved permissionId to " + permissionId)
                  
          // remove permission of service account
          drive.permissions.delete({
            fileId: node.driveId,
            permissionId: permissionId,
            auth: auth
          }, function(err, permission_data) {
            if(err) {
              console.log(err)
            }
            node.remove() //remove node from database
            callback()      
          })
        }
     })  
  })
}

// reads spreadsheet data and dumps to the console
var dumpSpreadsheetFromId = function(spreadsheetId) {
  
    Spreadsheet.load({
      debug: true,
      spreadsheetId: spreadsheetId,
      useDefaultWorksheet: true,
      oauth : googleConf
    }, function sheetReady(err, spreadsheet) {
      if(err) {
        console.log("Error in sheetReady, Message follows:")
        console.log(err)
      	return
      }
      
      // read worksheet
      spreadsheet.receive(function(err, rows, info) {
        if(err) throw err

      	keys = rows[1]
      	data = new Object
      	for (k in keys) {
      		data[keys[k]] = []
      	}
      	for (i in rows) {
      		if (i > 1) {
      			for (k in keys) {
      				if (typeof rows[i][k] == "undefined") data[keys[k]].push("")
      				else data[keys[k]].push(rows[i][k])
      			}
      		}
      	}
      
        console.log(JSON.stringify(data))
      })
    })
}

var clearCache = function(room) {
  spreadsheetCache[room] = undefined
}

// loads spreadsheet data into room object
var loadRoom = function(socket, player, room, node, callback) {
  
  // retrieve spreadsheet cache
  if (spreadsheetCache[room] != undefined) {
    console.log("found " + room + " in spreadsheet cache.")
    callback(spreadsheetCache[room])
    var cacheDelivered = true
    
  } else {
    //Util.write(socket, player, {name: "System"}, Util.linkify("[Loading...]"), "sender", "notice")    
  }

  var spreadsheetId = node.driveId
  var spreadsheetName = node.title
  var worksheetId = undefined
  var worksheetName = undefined
  var useDefaultWorksheet = true

  // check if worksheet is requested
  var parts = room.split("/")
  if (parts.length > 1) {
    worksheetName = parts[1]
    useDefaultWorksheet = false
    
    // retrieve worksheet ID from cache
    if (spreadsheetIdCache[spreadsheetId][worksheetName] != undefined) {
      worksheetId = spreadsheetIdCache[spreadsheetId][worksheetName].worksheetId
    }
  }

  Spreadsheet.load({
    debug: true,
    spreadsheetName: spreadsheetName,
    spreadsheetId: spreadsheetId,
    worksheetName: worksheetName,
    worksheetId: worksheetId,
    useDefaultWorksheet: useDefaultWorksheet,
    oauth : googleConf
  }, function sheetReady(err, spreadsheet) {
    if(err) {
    	//throw err
      console.log("Error in sheetReady, Message follows:")
      console.log(err)
      if (!cacheDelivered) {
        callback(undefined)
      }      
    	return
    }
    
    // save worksheet names as array of subnodes in node object
    var subnodes = []
    if(spreadsheet.raw.worksheets)
      spreadsheet.raw.worksheets.forEach(function(worksheet) {
         subnodes.push (worksheet.title)
      })
    node.subnodes = subnodes
    node.markModified("subnodes")  
    node.save(function() {
    
    	// populate cache
    	if (typeof spreadsheetIdCache[spreadsheetName] == "undefined") {
    		spreadsheetIdCache[spreadsheetId] = {} 
    		spreadsheetIdCache[spreadsheetId][spreadsheet.worksheetName] = {worksheetId: spreadsheet.worksheetId}
    		console.log("cached spreadsheet IDs for " + spreadsheetName + " / " + spreadsheet.worksheetName + " as " + spreadsheet.spreadsheetId + " / " + spreadsheet.worksheetId)
    	}
    	else if (typeof spreadsheetIdCache[spreadsheetName][spreadsheet.worksheetName] == "undefined") {
    		spreadsheetIdCache[spreadsheetId][spreadsheet.worksheetName] = {worksheetId: spreadsheet.worksheetId}
    		console.log("cached spreadsheet IDs for " + spreadsheetName + " / " + spreadsheet.worksheetName + " as " + spreadsheet.spreadsheetId + " / " + spreadsheet.worksheetId)
    	}
    
      // process worksheet
      spreadsheet.receive(function(err, rows, info) {
        if(err) throw err

      	keys = rows[1]
      	data = new Object
      	for (k in keys) {
          keys[k] = keys[k].trim().replace(/(\r\n|\n|\r)/gm,"") // get rid of common typos
          data[keys[k]] = []
      	}
      	for (i in rows) {
      		if (i > 1) {
      			for (k in keys) {
      				if (typeof rows[i][k] == "undefined") data[keys[k]].push("")
      				else data[keys[k]].push(rows[i][k])
      			}
      		}
      	}
      
        // populate cache
        spreadsheetCache[room] = data
        // callback
        if (!cacheDelivered) callback(data)
      
      })
    
    })
    
  })
}

/* expose */
module.exports.authorize_about = authorize_about
module.exports.authorize_create = authorize_create
module.exports.authorize_remove = authorize_remove
module.exports.handle_callback = handle_callback
module.exports.dumpSpreadsheetFromId = dumpSpreadsheetFromId
module.exports.loadRoom = loadRoom
module.exports.clearCache = clearCache

