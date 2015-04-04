var socket

var ifrm = null
/* let's go! */

$(document).ready(function() {
  
  // reset url path
  history.pushState(null, null, "")
    
  // load nodes created by user
  $('#load-created-nodes').click(function() {
    window.location = "/manage/load_created"
  })
    
  // setup remove events in node list
  $('a.remove-link').click(function(e) {
    var r = confirm("This will permanently remove the node from the list but leave the google spreadsheet intact. Only works if you have access to the spreadsheet. Proceed?");
    if (r == true) {
        return true
    } else {
        e.preventDefault()
    }
  })

  // make input field blank when first clicked
  $('#node-title').click(function() {
    if($('#node-title').val() == 'title') {
      $('#node-title').val('')
    } 
    $('#notice').fadeOut()
  })

  $('#sheet-id').click(function() {
    if($('#sheet-id').val() == 'google spreadsheet id') {
      $('#sheet-id').val('')
    } 
  })

  // submit a new title to create a node
  $('#create-node').click(function() {
    if($('#node-title').val() != 'title') {
      var title = $('#node-title').val()
    }
    if($('#sheet-id').val() != 'google spreadsheet id') {
      var sheet_id = $('#sheet-id').val()
    }
    
    if($('#node-title').val() != '' && $('#node-title').val() != 'title') {
      window.location = "/manage/create?title=" + title 
      + "&example_id=" + $('#node-base').find(':selected').data('id')
      + "&sheet_id=" + sheet_id
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









