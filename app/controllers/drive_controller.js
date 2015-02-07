/* requires */

var mongoose = require('mongoose')
var AdventureNode = mongoose.model('AdventureNode')
var google = require('googleapis')

/* variables */

// authentication info for web app (creating & deleting a specific user's sheets)
var CLIENT_ID = '7163825488-q83ocjovlutg8e7cuoc9465bun33grvn.apps.googleusercontent.com',
    CLIENT_SECRET = process.env.googleClientSecret
    REDIRECT_URL = 'http://adventurenodes.herokuapp.com/google_callback',
    SCOPE = 'https://www.googleapis.com/auth/drive.file'
var auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
var url = auth.generateAuthUrl({ scope: SCOPE })
var drive = google.drive('v2')

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

// respond to user create new node action, send user to google for authorization
var authorize_create = function(req, res) {
  req.session.driveAction = "create"
  req.session.nodeTitle = req.query.title // save title in session for after auth
  res.redirect(url)
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
  switch(req.session.driveAction) {
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
      auth.credentials = tokens
      callback()
    })
}

// create new spreadsheet 
var new_spreadsheet = function(req, res) {
  getAccessToken(req.query.code, function() {
    upload(req.session.nodeTitle, function() { // retrieve title
      res.redirect('/')      
    })
  })
}

// creates a new spreadsheet on user's account, shares with service account
var upload = function(title, callback) {
    drive.files.insert({
      resource: {
        title: title,
        mimeType: 'application/vnd.google-apps.spreadsheet'
      },
      auth: auth
    }, function(err, data) {
      // console.log(data) // output and save google data of sheet?
      var new_adventure_node = new AdventureNode({ 
        driveId: data.id,
        driveLink: data.alternateLink, // this is how a user can access her file
        title: data.title
      }) 
      new_adventure_node.save(callback)
      
      // add permission to service account for accessing the file
      drive.permissions.insert({
        fileId: data.id,
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
          return
        }
        console.log(permission_data)
        new_adventure_node.drivePermissionId = permission_data.id
        new_adventure_node.save()
        baseSetupSpreadsheet(data.id)
      })
            
    })  
}

// fills spreadsheet with basic data
var baseSetupSpreadsheet = function(spreadsheetId) {
  
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
      
      spreadsheet.add({ 1: { 1: "command", 2: "object", 3: "text", 4: "condition", 5: "effect", 6: "exit" } });
      spreadsheet.add({ 2: { 1: "base", 3: "hello, world!" } });

      spreadsheet.send({ autoSize: true }, function(err) {
        if(err) {
          console.log(err)
        }
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

    console.log("touching file " + id)
    drive.files.touch({
      fileId: id,
      auth: auth
    }, function(err, data) {
      
      if(!err) {
      
        // remove adventure node from database
        var permissionId
        AdventureNode.findOne( { driveId: id } , function(err, node) {
          if(err) return handleError(err)
          console.log(node)
          permissionId = node.drivePermissionId // save permission Id for later
          node.remove()
        
          console.log("saved permissionId to " + permissionId)
      
          // remove permission of service account
          drive.permissions.delete({
            fileId: id,
            permissionId: permissionId,
            auth: auth
          }, function(err, permission_data) {
            if(err) {
              console.log(err)
            }
          })      
        
        })
        
      }
      callback()      
      
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

// loads spreadsheet data into room object
var loadRoom = function(room, callback) {
	get_spreadsheet(room, callback) 
  return
}

// does the work for loadRoom
var get_spreadsheet = function(room, callback) {
  
  // retrieve spreadsheet cache
  if (spreadsheetCache[room] != undefined) {
    console.log("found " + room + " in spreadsheet cache.")
    callback(spreadsheetCache[room])
    var cacheDelivered = true
  }

  // define spreadsheet names

  var parts = room.split("/")

  spreadsheetName = parts[0]

  if (parts.length == 1) 
    worksheetName = undefined
  else 
    worksheetName = parts[1]

  //console.log("loading room " + room + " (" + spreadsheetName + "/" + worksheetName +")")

  // retrieve spreadsheet ID cache
  if (spreadsheetIdCache[spreadsheetName] != undefined && spreadsheetIdCache[spreadsheetName][worksheetName] != undefined) {
  	spreadsheetId = spreadsheetIdCache[spreadsheetName][worksheetName].spreadsheetId
  	worksheetId = spreadsheetIdCache[spreadsheetName][worksheetName].worksheetId
  	spreadsheetName = undefined
  	worksheetName = undefined
  }
  else {
  	spreadsheetId = undefined
  	worksheetId = undefined
  }
  
  var useDefaultWorksheet = (worksheetId == undefined && worksheetName == undefined)

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
    
  	// populate cache
  	if (typeof spreadsheetIdCache[spreadsheetName] == "undefined") {
  		spreadsheetIdCache[spreadsheetName] = {} 
  		spreadsheetIdCache[spreadsheetName][spreadsheet.worksheetName] = {spreadsheetId: spreadsheet.spreadsheetId, worksheetId: spreadsheet.worksheetId}
  		console.log("cached spreadsheet IDs for " + spreadsheetName + " / " + spreadsheet.worksheetName + " as " + spreadsheet.spreadsheetId + " / " + spreadsheet.worksheetId)
  	}
  	else if (typeof spreadsheetIdCache[spreadsheetName][spreadsheet.worksheetName] == "undefined") {
  		spreadsheetIdCache[spreadsheetName][spreadsheet.worksheetName] = {spreadsheetId: spreadsheet.spreadsheetId, worksheetId: spreadsheet.worksheetId}
  		console.log("cached spreadsheet IDs for " + spreadsheetName + " / " + spreadsheet.worksheetName + " as " + spreadsheet.spreadsheetId + " / " + spreadsheet.worksheetId)
  	}
    
    // process worksheet
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
      
      // populate cache
      spreadsheetCache[room] = data
      // callback
      if (!cacheDelivered) callback(data)
      
    })
  })
}

/* expose */
module.exports.authorize_create = authorize_create
module.exports.authorize_remove = authorize_remove
module.exports.handle_callback = handle_callback
module.exports.dumpSpreadsheetFromId = dumpSpreadsheetFromId
module.exports.loadRoom = loadRoom


