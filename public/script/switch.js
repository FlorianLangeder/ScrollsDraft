var socket;

function execjs() {
  socket = io.connect('http://draft.flo-lan.com:63924', {'sync disconnect on unload': true });
  socket.on('connected', function(id) {
  	socket.id = id;
  	lobby(socket);
  	initChat(socket);
  	launchNameDialog();
  });
}

function launchNameDialog() {
	bootbox.prompt("What is your name?", function(result) {                
	  	if (result === null) {                                             
	    	//Example.show("Prompt dismissed");                              
	  	} else {
	    	socket.emit('newUser', result);                      
	  	}
	});
}