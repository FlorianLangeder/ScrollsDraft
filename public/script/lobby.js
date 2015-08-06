function lobby(socket) {
	var opengames = [];
 	var myName = "";

 	$('#createRoom').on('click', function(e) {
    	var roomID = $('#roomNameInput').val();
    	var packCount = $('#packCountInput').val();
    	var maxPlayer = $('#maxPlayerInput').val();
    	var password = $('#passwordInput').val();

       	if(isBlank(roomID)) {
  			roomID = $('#roomNameInput').attr('placeholder');
  		}
  		if(isBlank(packCount)) {
  			packCount = $('#packCountInput').attr('placeholder');
  		}
  		if(isBlank(maxPlayer)) {
  			maxPlayer = $('#maxPlayerInput').attr('placeholder');
  		}
    	if(validText(roomID)) {
      		socket.emit('createRoom', roomID, packCount, maxPlayer, password);
    	}
  	});

  	$('#roomList').on('click', '.joinRoomBtn', function(e) {
  		var roomID = e.target.id;
  		var roomName = $('#'+e.target.id).text();
  		if(validText(roomID)) {
  			var password = $('#pwd'+roomID).val();
  			if(password == null) {
  				password = ' ';
  			}
      		socket.emit('joinRoom', roomName, password);
    	}
  	});

  	$('#roomList').on('focus', '.passwordJoinInput', function(e) {
  		$('#'+e.target.id).removeClass('error');
  	});

 	socket.emit('connect syn');

 	socket.on('connect ack', function() {
 		switchToLobbyView();
	    socket.on('roomcreated', function(newRoom) {
	      opengames.push(newRoom);
	      addRoom(newRoom);
	    });

	    socket.on('name', function(name, id) {
	      myname = name;
	      socket.username = name;
	      localStorage.id = id;
	      $('#roomNameInput').attr('placeholder',myname+"'s game");
	      initDraftInterface(socket);
	    });

	    socket.on('roomJoined', function(name, isOwner) {
	    	joinChatRoom(name);
	    	switchToRoomView(isOwner);
	    	$('#roomName').text(name+" | ");
	    });
	    socket.on('error', showerror);

	    socket.on('syncRoomList', function(rooms) {
	 		$('#roomList').empty();
	 		$.each(rooms, function(key, val) {
	    		addRoom(val);
	  		}); 
 		});

 		socket.on('backToLobby', function() {
 			joinChatRoom('lobby');
 			switchToLobbyView();
 		});

 		socket.on('roomStarted', function(roomID) {
 			disableRoom(roomID);
 		});

 		socket.on('wrongPassword', function(roomID) {
 			$('#pwd'+roomID).addClass('error');
 		});
 	});

 	function addRoom(room) {
 		var roomElement;
 		var passwordField = '';
 		if(room.needpw) {
 			passwordField = '<input class="passwordJoinInput" type="text" id="pwd'+room.owner+'"></input>';
 		}

 		if(room.started){
 			roomElement = '<li><button class="joinRoomBtn disabledRoom" id="'+room.owner + '">'+room.title+'</button></li>';
 		} else {
 			roomElement = '<li><button class="joinRoomBtn" id="'+room.owner + '">'+room.title+'</button>'+passwordField+'</li>';
 		}
 		$('#roomList').append(roomElement);
 	}

 	function disableRoom(roomID) {
 		$("#roomList>li>#"+roomID).addClass("disabledRoom");
 	}

 	function switchToRoomView(isOwner) {
 		if(isOwner) {
 			$('#startDraftBtn').show();
 		} else {
 			$('#startDraftBtn').hide();
 		}
		$('#generalLobby').hide();
 		$('#roomLobby').show();
 	}

 	function switchToLobbyView() {
 		$('#scrollRow1').empty();
		$('#scrollRow2').empty();
		$('#scrollPreview').empty();
 		$('#deckList').empty();
 		$('#generalLobby').show();
 		$('#roomLobby').hide();
 	}

 	function showerror(error) {
	    alert(error.msg);
		if(error.type == "nameerror") {
			launchNameDialog();
		}
	}
}