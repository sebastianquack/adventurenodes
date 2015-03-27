var socket

var ifrm = null
/* let's go! */

$(document).ready(function() {

  // set up sockets
  socket = io.connect(window.location.origin)
  
  // update node list when notified by server
  socket.on('update-node-list', function(data) { 
    $('#adventure-nodes-list').html('')
    data.forEach(function(entry) {
      $('#adventure-nodes-list').append(
        "<li>" + entry.title +
        " <a href='/play/" + entry.title + "'>play</a> " +
        " <a href='/embed/" + entry.title + "'>embed</a> " +
        " <a target='_blank' href='" + entry.driveLink + "'>edit</a>" +
        " <a class='remove-link' href='/manage/remove/"+ entry.driveId + "'>remove</a>"+
        "</li>"
      )
    })
    
    $('a.remove-link').click(function(e) {
      var r = confirm("This will permanently remove the node from the list but leave the google spreadsheet intact. Only works if you have access to the spreadsheet. Proceed?");
      if (r == true) {
          return true
      } else {
          e.preventDefault()
      }
    })

  })


  // make input field blank when first clicked
  $('#node-title').click(function() {
    if($('#node-title').val() == 'title') {
      $('#node-title').val('')
    } 
    $('#notice').fadeOut()
  })

  // submit a new title to create a node
  $('#create-node').click(function() {
    if($('#node-title').val() != '' && $('#node-title').val() != 'title') {
      window.location = "/manage/create?title=" + $('#node-title').val()      
    }    
  })

  /* manage details */

  $('#width').val(300) // default values
  $('#height').val(400) // default values

  $('#generate-embed').on('click', function(event) {

    if(ifrm) {
      ifrm.parentNode.removeChild(ifrm)
      ifrm = null  
    }
    
    // create the iframe
    ifrm = document.createElement("iframe")
    
    var path = window.location.pathname.split('/')
    if(path.length > 1) {
      node_title = "/play/" + path[path.length - 1]
    } else {
      node_title = ""
    }
    
    var url = location.protocol + '//' + location.hostname + (location.port ? ':'+location.port : '') + node_title
    ifrm.setAttribute("src", url)
    ifrm.frameBorder = "0"
    width = $('#width').val().trim()
    if(width[width.length - 1] == "%") { 
      ifrm.style.width = $('#width').val()
    } else {
      ifrm.style.width = $('#width').val()+"px"      
    }
    ifrm.style.height = $('#height').val()+"px"
    $('#iframe_container').append(ifrm)
    
    var text = document.createTextNode(ifrm.outerHTML);    
    $('#embed-code').html('').append(text);        
  })

  $('#generate-embed').trigger('click')

})









