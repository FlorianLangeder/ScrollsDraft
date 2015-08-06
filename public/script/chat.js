function initChat(socket) {
  $('#postmsg').on('click', function() {
    if(socket.username != null && !isBlank(socket.username)) {
      var text = $('#msgInput').val();
      if (validText(text)) {
        setText(text, socket.username);
        socket.emit('sendMessage', text);
      }
      $('#msgInput').val('');
    }
    else {
      launchNameDialog();
    }
  });

  $('#msgInput').on("keypress", function(e) {
    if (e.keyCode === 13) {
      $('#postmsg').click();
    }
  });

  socket.on('setMessage', function(text, user) {
    if(socket.username != null && !isBlank(socket.username)) {
      setText(text, user);
    }
  });

  socket.on('updateCurUserList', function(userList) {
   updateCurUserList(userList);
  });

  socket.on('scrollClicked', function(id) {
    var sender = id;
    $('#'+id).text('*');
  });

  /*socket.on('sendTotalPlayerList', function(list) {
    var string = [];
    $.each(list, function(key, val) {
      string.push(val.name);
    });
    setText(string.join(','),'Server');
  });*/
}

function updateCurUserList(userList) {
  $('#userList').empty();
  $.each(userList, function(key, val) {
    if(val.id == socket.id) {
      $('#userList').append('<span class="highlightedName">'+val.name +'</span><span id="'+val.id+'"></span><br>');
    }else {
      $('#userList').append('<span >'+val.name +'</span><span id="'+val.id+'"></span><br>');
    }
  }); 
}

function joinChatRoom(name) {
  var $msg = $('<div>');
  $msg.append($('<span>').text(getTime()+" "));
  $msg.append($('<span>').text('Joined: '+name));
  $('#chatlog').append($msg);
}

function setText(text, user) {
  var $msg = $('<div>');
  $msg.append($('<span>').text(getTime()+" "));
  $msg.append($('<span>').text(user+": "));
  $msg.append($('<span style="max-width: 100%; word-wrap: break-word;">').text(text+""));
  $('#chatlog').append($msg);
  var heightoffset = $('#generalInfo').height() + $('.tab').height();
  $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
}

function validText(str) {
  if (isBlank(str))
    return false;

  return true;
}

function isBlank(str) {
  return (!str || /^\s*$/.test(str));
}

function getTime() {
  var now = new Date();
  var hour = now.getHours();
  var minute = now.getMinutes();
  var second = now.getSeconds();
  if (hour.toString().length == 1) {
    var hour = '0' + hour;
  }
  if (minute.toString().length == 1) {
    var minute = '0' + minute;
  }
  if (second.toString().length == 1) {
    var second = '0' + second;
  }
  return hour + ":" + minute + ":" + second;
}