 /* variable declarations */ 

var socket
var touchDevice = false

/* function declarations */

// type command in input field and submit to server
var autoTyping = false
function autoType(text, menuFlag, menuValue) {
  if (autoTyping) return
  else autoTyping = true
  scrollInput()
  var delay=90

  var type = function(text,delay) {
    character = text.substr(0,1)
    remaining = text.substr(1)
    elem = $('#input-command')
    elem.val(elem.val() + character)
    elem.trigger("keypress")
    if (remaining != "") setTimeout(function () {type(remaining,delay)}, delay)
  }
  type(text,delay)

  if(menuFlag == true) {
    setTimeout(function() { submitMenuCommand(menuValue); autoTyping = false; }, delay*(text.length+5))
  } else {
    setTimeout(function() { submitCommand(); autoTyping = false; }, delay*(text.length+5))
  }
}

// submit a command to the server and clear input field 
function submitCommand() {
  val = $('#input-command').val()
  if (val.trim()=="") return
  
  switch(val.trim()) {
    case "clear":
      clearChat()    
      break
    case "logout":
      $.cookie('an_uuid', uuid.v1(), { expires: 31 }) // create new uuid
      location.reload()
      break
    default:
      socket.emit('player-action', { uuid: $.cookie('an_uuid'), input: val })
  }
  $('#input-command').val('')
  updateInput()
}

// submit a menu command to the server and clear input field 
function submitMenuCommand(val) {
  socket.emit('player-action', { uuid: $.cookie('an_uuid'), input: val, menu: true })
  $('#input-command').val('')
  updateInput()
}

// fill fake input with text, set cursor element
splitCursor = function (text, position) {
  begin = text.substr(0,position)
  cursor = text.substr(position,1)
  end = text.substr(position+1) + " "
  return '<span>'+begin+'</span><span id="cursor">'+cursor+'</span><span>'+end+'</span>'
}

// update fake input
updateInput = function() {  
  $('#input-fake').html(splitCursor($('#input-command').val(), $('#input-command').getCursorPosition()))
  if(!touchDevice) {
    $('#input-command').focus()
  } 
  if ($('#input-command').val().length >= 1) $('#input').addClass('chars')
  else $('#input').removeClass('chars')
}


// fast scroll to input
var fastScroll = false
scrollInput = function() {
  
    var offset_y = $("#chat")[0].scrollHeight - $("#chat").innerHeight()
    var delta_y = offset_y-$("#chat").scrollTop()
    if (fastScroll || delta_y <= 2) return
    var duration = delta_y * 3
    duration = Math.max(Math.min(duration, 800), 200)
    $('#chat').stop().animate({
        scrollTop: offset_y
    },{
        duration: duration,
        queue: false,
        start: function() { fastScroll = true },
        always: function() { fastScroll = false },
        complete: fillCommandGaps,
        easing: "swing"
    })

}

var fillCommandGaps = function() {
  $("#chat section:not(:last-child)").addClass("done")
}

var clearChat = function() {
  $('#chat section p.incoming').remove()
  resetLog()
}

var resetLog = function() {
  $('#action-log-close').hide()
  $('#action-log').html('')
  $('#action-log-more').attr('data-limit', '')
  $('#action-log-more').html('see more history')
  $('#action-log-more').removeClass('end')
  $('#action-log-more').hide()
  $('#action-log-open').show()
}

var openLog = function() {
  if($('#action-log').css("display", "none")) {
    $('#action-log-open').hide()
    $('#action-log-more').show()
    $('#action-log-close').show()
    $('#action-log').show()    
    $('#chat').scrollTop($('#action-log').innerHeight())
  }    
}

var updateLog = function() {
  socket.emit('log-load', { uuid: $.cookie('an_uuid'), limit: $('#action-log-more').attr('data-limit') })
}

/* let's go! */
$(document).ready(function() {

  touchDevice = 'ontouchstart' in window || !!navigator.msMaxTouchPoints; // detect touch device

  // local player object
  player = {}

  // set up sockets
  socket = io.connect(window.location.origin)
  
  // check for cookie
  if(!$.cookie('an_uuid')) {
    $.cookie('an_uuid', uuid.v1(), { expires: 31 }) // create new uuid
  }
  
  // check url to see if player is targeting specific node
  var target_node = null
  var path = window.location.pathname.split('/')
  if(path.length > 1) {
      target_node = path[path.length - 1]
      $('#node-title').html(target_node)
  }
  
  // send cookie to server for check 
  socket.on('connect', function() { 
    socket.emit('player-action', { uuid: $.cookie('an_uuid'), firstPlayerAction: true, target_node: target_node })
  })
  
  /* events */

  var everPushedSomething = false
  $(window).on("popstate", function() {
    if(everPushedSomething) { // ignore initial event fire on page load
      location.reload() // currently just does a hard reload - ideally solve via sockets
    }
  })

  // a chat item comes in from the server
  socket.on('chat-update', function (data) {

    if(data.player_state == "world") {
      $('#action-log-container').show()
    }
    
    if (data.player_room != null && player.currentRoom != data.player_room) { // player entered a room
      clearChat()
      $('#chat').append($('<section>'))
      var subnode = ""
      if(data.player_room.split("/").length == 2)
        subnode = ": " + data.player_room.split("/")[1]
      $('#node-title').html(data.player_room.split("/")[0] + subnode)
    }

    var previousRoom = player.currentRoom // save room for later
    player = {
      name:         (data.player_name != null) ? data.player_name : player.name,
      currentRoom:  (data.player_room != null) ? data.player_room : player.currentRoom,
      state:        (data.player_state != null) ? data.player_state : player.state,
    }

    // interpret special format commands
    var d = new Date()
    var dateString = d.getDate()+"."+(d.getMonth()+1)+"."+d.getFullYear()+", "+d.getHours()+":"+("00" + d.getMinutes()).slice(-2)
    data.value = data.value.replace("\\time", dateString)
    
    if(data.value.indexOf("\clear") != -1) {
      data.value = data.value.replace("\\clear", "")
      clearChat()
    }
    
    // add text
    if(data.sender_name == "System") {
      newElem = $('<p>' + data.value + '</p>')
    } else {
      console.log(data)
      if(data.sender_uuid == $.cookie('an_uuid')) 
        newElem = $('<p data-sender="You">' + data.value + '</p>')
      else
        newElem = $('<p data-sender="'+data.sender_name+'">' + data.value + '</p>')
    }
    if (data.type != undefined) newElem = newElem.addClass(data.type)
    newElem = newElem.addClass("incoming")
    newElem = $('#chat section:last-child').append(newElem)

    // move input field to bottom and update data
    $('#chat section:last-child').append($("#input").detach())
    $("#input").attr("data-sender", player.name)
    $("#input").attr("data-state", player.state)
    $("#input-command").focus()
    updateInput()
    
    // scroll up to fit new item
    var delta_y = $("#chat")[0].scrollHeight -$("#chat").innerHeight()-$("#chat").scrollTop()
    $('#chat').stop().animate( {
		    scrollTop: $("#chat")[0].scrollHeight - $("#chat").innerHeight()
      }, {
	      duration: delta_y*50, //$("ul#chat p:last-child").height()*100,
        queue: true,
        easing: "easeOutSine",
        start: function() {
          // user scroll breaks slow scroll
          $("#chat").bind("mousedown.scroll DOMMouseScroll.scroll mousewheel.scroll keypress.scroll", function(e){
            $('#chat').stop()
            $('#chat').unbind("mousedown.scroll DOMMouseScroll.scroll mousewheel.scroll keypress.scroll")
          });
        },
        complete: fillCommandGaps,
        always: function(){}
    })
    
    // update the current node links to drive
    if(data.nodeLink) {
      $('#edit-link').css("display", "block")
      $('#edit-link').attr("href", data.nodeLink)
    } else {
      $('#edit-link').hide()
    }
    
    if(previousRoom) {
      // update location bar in browser
      if(player.currentRoom.split("/")[0] != previousRoom.split("/")[0]) {
        var newPath = '/play/' + player.currentRoom.split("/")[0]
        console.log("pushState: " + newPath)
        history.pushState(null, null, newPath)
        everPushedSomething = true
      }
      // update title
      if(player.currentRoom != previousRoom) {
        if(player.currentRoom.split("/").length == 2)
          subnode = ": " + player.currentRoom.split("/")[1]
        $('#node-title').html(player.currentRoom.split("/")[0] + subnode)
      }
    }
    
  })

  // focus input field
  if(!touchDevice) {
    $('body').not("b[data-command], #input-command").on("keypress click focus resize load", function(event){
      if(event.target.id != "action-log-open" && event.target.id != "action-log-more") {
        scrollInput()
        $('#input-command').focus()
      }
    })
  } else {
    $('#input').on("click", function(event){
      $('#input-command').focus()
      setInterval(scrollInput, 500) // add delay while software keyboard opens on touch devices
    })
  }

  $('#input-command').on("keypress keyup keydown", updateInput)
  
  // toggle navigation
  $('.navbar-toggle').click( function(){
    $(this).parent().toggleClass('show');
  });
    
  if(self==top) {
  	$(".fullscreen-toggle").hide()    
  }
    
  // user clicks on menu
  $("body").on("click","*[data-menu]", null, function() { 
    $('nav').removeClass('show');
    if(player.state == "welcome" || player.state == "bot" || player.state == "chat") {
      submitMenuCommand($(this).data("menu"))      
    } else {
      autoType($(this).data("menu"), true, $(this).data("menu"))      
    }
  })
  
  // user clicks on command
  $("body").on("click","b[data-command]", null, function() { 
    scrollInput()
    autoType($(this).data("command"))
  })

  // user hits enter in console
  $('#input-command').on("keypress", function(e) {
    if (e.keyCode == 13) {       
      submitCommand()
    }
  })
  
  // user opens logs
  $('#action-log-open').click(function(event) {
    if($('#action-log').html() == '') {
      updateLog()
    } else {
      openLog()
    }
  })

  // user wants to load more loog data  
  $('#action-log-more').click(function(event) {
    if(!$(event.target).hasClass('end')) updateLog()
  })

  // user clicks log close button
  $('#action-log-close').click(function() {
    $('#action-log').slideToggle()        
    $('#action-log-more').hide()
    $('#action-log-close').hide()
    $('#action-log-open').show()
  })

  // data from log comes in
  socket.on('log-update', function (data) {
    //console.log(data)
    if(data)
      if(data.length > 0) {
        $('#action-log-open').hide()
        $('#action-log-more').attr('data-limit', data[data.length - 1].time)
        $('#action-log-more').show()
        $('#action-log-close').show()
        var add = ""
        data.reverse()
        data.forEach(function (action) {
          var timestamp = "  <span class='timestamp'>" + jQuery.format.prettyDate(new Date(action.time)) +  "</span>"
          if(action.direct) {
            if(action.player_uuid == $.cookie('an_uuid')) 
              add += '<p data-sender="You">' + action.input + timestamp + '</p>'
            else
              add += '<p data-sender="' + action.player_name + '">' + action.input + timestamp + '</p>'
          }
          else {
            if(action.player_uuid == $.cookie('an_uuid'))
              add += "<p>" + action.response + timestamp + "</p>"
            else 
              add += "<p>" + action.announcement + timestamp + "</p>"
          }
          
        })
        if(data.length < 10) {
          $('#action-log-more').html("the beginning of time")
          $('#action-log-more').addClass("end")
        }
        var before = $('#action-log').innerHeight()
        $('#action-log').prepend(add)
        var after = $('#action-log').innerHeight()
        var delta = after - before
        $('#action-log').show()
        $('#chat').scrollTop(delta)
      }
    else {
      $('#action-log-more').show()
      $('#action-log-open').hide()
      $('#action-log-more').html("the beginning of time")        
      $('#action-log-more').addClass("end")
    }
    
  })
  
  /* menu events */
    
  // user clicks fullscreen button
  $('.fullscreen-toggle').click(function() {
    var play_url = location.protocol + '//' + location.hostname + (location.port ? ':'+location.port : '')
    if(target_node) {
      play_url += '/' + target_node
    } 
    window.open(play_url)
  })

  // user clicks embed link
  $('#embed-link').click(function() {
    var embed_url = location.protocol + '//' + location.hostname + (location.port ? ':'+location.port : '') + '/embed'
    if(target_node) {
      embed_url += '/' + target_node
    } 
    window.location = embed_url
  })

  // user clicks edit link
  $('#edit-link').click(function() {
    $('nav').removeClass('show');
  })

  // user clicks manage link
  $('#manage-link').click(function() {
    var manage_url = location.protocol + '//' + location.hostname + (location.port ? ':'+location.port : '') + '/'
    window.location = manage_url
  })

  /* cursor effects */

  // blink cursor
  setInterval(function(){ $("#cursor").toggleClass("inverted")}, 650);

  // detect cursor position in <input>
  (function($) {
      $.fn.getCursorPosition = function() {
          var input = this.get(0);
          if (!input) return; // No (input) element found
          if ('selectionStart' in input) {
              // Standard-compliant browsers
              return input.selectionStart;
          } else if (document.selection) {
              // IE
              input.focus();
              var sel = document.selection.createRange();
              var selLen = document.selection.createRange().text.length;
              sel.moveStart('character', -input.value.length);
              return sel.text.length - selLen;
          }
      }

  })(jQuery);

})


