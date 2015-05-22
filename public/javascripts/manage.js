var socket
var ifrm = null

var loadDetailView = function(target) {
  closeDetailViews()
  $('a.open-details').removeClass("disabled")
  $(target).addClass("disabled")
  node_id = $(target).data('id')
  console.log(node_id)
  $.get('/node/' + node_id, function(data) {
    showDetailView($(target).parent(), data, node_id)
  })
}

var closeDetailViews = function() {
  $('div.node-details').remove()  
  $('a.open-details').removeClass("disabled")
}

var showDetailView = function(target, data, id) {
  var details = "<div class='node-details' data-id='"+id+"'>"
  + data
  + "<button class='open-edit' data-id='"+id+"' href='#'>edit</button> " 
  + "<a class='close-details' href='#'>close</a>"
  + "</div>"
  $(target).append(details)
  setupDetailEvents()
}

var loadEditView = function(target) {
  node_id = $(target).data('id')
  console.log(node_id)
  $.get('/node/' + node_id + "?edit=1", function(data) {
    showEditView($(target).parent().parent(), data, node_id)
  })
}

var showEditView = function(target, data, id) {
  $('div.node-details').hide()
  var edit_form = "<div class='node-edit' data-id='"+id+"'>"
  + data
  + (id!="new"? "<p><a href='/manage/remove/"+id+"' class='remove-link'>remove node</a></p>" : "")
  + "<button class='submit-edit'>submit</button> "
  + "<button class='cancel-edit'>cancel</button>" 
  + "</div>"
  $(target).append(edit_form)
  setupDetailEvents()
}

var closeEditView = function() {
  $('div.node-edit').remove()  
  $('div.node-details').show()  
}

var setupDetailEvents = function() {
  
  $('.close-details').off().click(function(e) {
    e.preventDefault()
    closeDetailViews()  
  })
  
  $('.open-edit').off().click(function(e) {
    e.preventDefault()
    loadEditView(e.target)
  })
  
  $('.cancel-edit').off().click(function(e) {
    e.preventDefault()
    $('.node-edit').removeClass("disabled")
    closeEditView()
  })
  
  // submit the form
  $('.submit-edit').off().click(function(e) {
    e.preventDefault()
    var node_id = $(e.target).parent().data('id')
    var body = {
      title: $('input.node-title').val(),
      description: $('input.node-description').val(),      
      author: $('input.node-author').val(),
      playMode: $('select.node-playMode').val(),
      published: $('select.node-published').val(),
      colors_links: $('input.node-colors-links').val(),
      colors_borders: $('input.node-colors-borders').val(),
      colors_highlights: $('input.node-colors-highlights').val(),
      driveLink: $('input.node-driveLink').val(),
      exampleId: $('select.node-exampleId').val()
    }
    
    if(node_id == "new") {
      window.location = "/node/create?" + $.param(body)
    } else {    
      $.post('/node/' + node_id, body, function(data) {
        var container = $(e.target).parent().parent()
        $('div.node-details').remove()
        $('div.node-edit').remove()
        showDetailView(container, data, node_id)
      })
    }
  })
  
  // setup remove events in node list
  $('a.remove-link').off().click(function(e) {
    var r = confirm("This will permanently remove the node from the list but leave the google spreadsheet intact. Only works if you have access to the spreadsheet. Proceed?");
    if (r == true) {
        return true
    } else {
        e.preventDefault()
    }
  })
  
}

$(document).ready(function() {
  
  // reset url path
  history.pushState(null, null, "")
    
  // load nodes created by user
  $('#load-created-nodes').click(function() {
    window.location = "/manage/load_created"
  })
    
  // setup detail open events
  $('a.open-details').click(function(e) {
    e.preventDefault()
    loadDetailView(e.target)
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
    $.get('/node/new/', function(data) {
      showEditView($('.new-node'), data, "new")
    })
    
  })

  // embed functions

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









