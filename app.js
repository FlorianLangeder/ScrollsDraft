var express = require('express'),
  app = express(),
  http = require('http'),
  request = require('request'),
  server = http.createServer(app),
  io = require('socket.io').listen(server);

io.set('transports', ['htmlfile', 'xhr-polling', 'jsonp-polling']);

// listen for new web clients:
server.listen(63924);

app.use(express.static(__dirname + '/public'));

var activeClients = 0;
var scrollsJSONUrl = 'http://a.scrollsguide.com/scrolls?norules';
var scrollsJSON = require('./public/script/scrolls.json');
loadScrollsJSON();

io.sockets.on('connection', function(socket) {
  activeClients++;
  socket.emit('connected', socket.id);

  socket.on('disconnect', function() {
    if(socket.username !== null && socket.username !== undefined) {
      var room = getRoomFromSocket(socket);
      socket.leave(room.substring(1));

       if (isValid(io.rooms[room])) {
        if(isValid(io.rooms[room]['details'])) {
          if(io.rooms[room]['details'].owner == socket.id) {
            //move all sockets in room to lobby
            var userList = io.sockets.clients(room.substring(1));
            for(var i = 0; i < userList.length; i++) {
              if(userList[i].id != socket.id) {
                rejoinLobby(userList[i]);
              }
            }
            io.sockets. in ('lobby').emit('updateCurUserList', getUserListFromRoom('lobby'));        
          }
        }
      }
      var roomList = generateAllRoomJson();
      io.sockets. in (room.substring(1)).emit('updateCurUserList', getUserListFromRoom(room.substring(1)));
      socket.broadcast.to('lobby').emit('syncRoomList', roomList);
    }
  });

  socket.on('connect syn', function() {
    socket.join('lobby');
    socket.emit('connect ack');
  });

  socket.on('newUser', function(name) {
    newPerson(name, socket);
  });

  socket.on('sendMessage', function(text) {
      var name = socket.username;
      var room = getRoomFromSocket(socket);
      var roomName = room.substring(1);
      if (!isBlank(text) && isValid(text) && isValid(name) && isValid(room) && isValid(roomName)) {  
        socket.broadcast.to(roomName).emit('setMessage', text, name);
      }
  });

  socket.on('createRoom', function(title, packCount, maxPlayer, password) {
      if (isValid(title) && !isBlank(title) && isValid(password) && isValid(packCount) && !isBlank(packCount) && isValid(maxPlayer) && !isBlank(maxPlayer)) {
        createRoom(title, packCount, maxPlayer, password, socket);
      }
  });

  socket.on('startDraft', function() {
    startDraft(socket);
  });

  socket.on('joinRoom', function(id, pw) {
    if(isValid(id) && isValid(pw)) {
      joinRoom(id, socket, pw);
    }
    else {
      socket.emit("error", {
      type: 'openerror',
      msg: "Invalid Roomname. Can't be blank."
    });
    }
  });

  socket.on('scrollClicked', function(imageID) {
    if(isValid(imageID)) {
      socket.picked = true;
      socket.pickedScroll = imageID;
      var room = getRoomFromSocket(socket);
      io.sockets. in (room.substring(1)).emit('scrollClicked', socket.id);
      checkIfEveryoneClicked(room);
    }
  });

  socket.on('backToLobby', function() {
    var room = getRoomFromSocket(socket);
    if(isValid(io.rooms[room]['details'])) {
      if(io.rooms[room]['details'].owner == socket.id) {
        //move all sockets in room to lobby
        var userList = io.sockets.clients(room.substring(1));
        for(var i = 0; i < userList.length; i++) {
          rejoinLobby(userList[i]);
        }
      } else {
        rejoinLobby(socket);
        socket.broadcast.to(room.substring(1)).emit('updateCurUserList', getUserListFromRoom(room.substring(1)));
      }
      var roomList = generateAllRoomJson();
      io.sockets. in ('lobby').emit('updateCurUserList', getUserListFromRoom('lobby'));
      io.sockets. in('lobby').emit('syncRoomList', roomList);
    }
  });
});

function loadScrollsJSON() {
  /*request({
    url: scrollsJSONUrl,
    json: true
  }, function (error, response, body) {
    console.log("error: "+error);
    if (!error && response.statusCode === 200) {
      console.log(body) // Print the json response
    }
  });*/
}

function createRoom(title, packCount, maxPlayer, password, socket) {
  var roomid = 0;
  if (!checkIfRoomAlreadyExists(title) && title != "lobby") {
     //roomid = io.rooms.length + 1;
      roomid = title;
      var oldRoom = getRoomFromSocket(socket).substring(1);
      socket.leave(oldRoom);
      socket.join(roomid);
      io.rooms[('/' + roomid)]['details'] = {
          "id": roomid,
          "title": title,
          "packCount": packCount,
          "maxPlayer": maxPlayer,
          "owner": socket.id,
          "password": password,
          "started": false
      };
      //io.rooms[('/' + roomid)][1].details.owner = socket.username;
      socket.emit('roomJoined', roomid, true);
      socket.broadcast.to(oldRoom).emit('updateCurUserList', getUserListFromRoom(oldRoom));
      io.sockets. in (roomid).emit('updateCurUserList', getUserListFromRoom(roomid));
      socket.broadcast.to('lobby').emit('roomcreated', generateOneRoomJson(roomid));
      roomid++;
  } else {
    socket.emit("error", {
      type: 'openerror',
      msg: 'This room already exists. Please pick another name!'
    });
  }
}

function joinRoom(id, socket, pw) {
  if (isValid(io.rooms[('/' + id)])) {
    if(isValid(io.rooms[('/' + id)]['details'])) {
      if(io.rooms[('/' + id)]['details'].started == false) {
        var roomUserCount = getUserListFromRoom(id).length; 
        if(roomUserCount < io.rooms[('/' + id)]['details'].maxPlayer) {
          if (!io.rooms[('/' + id)]['details'].password || io.rooms[('/' + id)]['details'].password == pw) {
            var oldRoom = getRoomFromSocket(socket).substring(1);
            //Don't join if already in the room
            if(id !== oldRoom) {
              socket.leave(oldRoom);
              socket.join(id);

              socket.emit('roomJoined', id, false);
              socket.broadcast.to(oldRoom).emit('updateCurUserList', getUserListFromRoom(oldRoom));
              io.sockets. in (id).emit('updateCurUserList', getUserListFromRoom(id));
            }
          }
          else {
            socket.emit('wrongPassword', io.rooms[('/' + id)]['details'].owner);
          }
        }
      }
    }
  }
}

function startDraft(socket) {
  var room = getRoomFromSocket(socket);
  if(room != '/lobby' && socket.id == io.rooms[room]['details'].owner) {
    io.rooms[room]['details'].started = true;
    io.rooms[room]['details'].packs = generatePacks(room.substring(1));
    io.rooms[room]['details'].round = 1;
    //switch to "-1" next round
    io.rooms[room]['details'].direction = -1;
    io.sockets. in (room.substring(1)).emit('startDraft', io.rooms[room]['details'].packCount);
    io.sockets. in ('lobby').emit('roomStarted', socket.id);
    var userList = io.sockets.clients(room.substring(1));
    for(var i = 0; i < userList.length; i++) {
      userList[i].curPack = i;
    }
    startRound(room);
  }
}

function finishDraft(room) {
  io.sockets. in (room.substring(1)).emit('finishedDraft');
}

function startRound(room) {
  var round = io.rooms[room]['details'].round;
  var direction = io.rooms[room]['details'].direction;

  var userList = io.sockets.clients(room.substring(1));
  var socket;
  for(var i = 0; i < userList.length; i++) {
    socket = userList[i];
    socket.emit('startRound', io.rooms[room]['details'].packs[socket.curPack][round-1], round, direction);
  }
  var nameList = getUserListFromRoom(room.substring(1));
  io.sockets. in (room.substring(1)).emit('updateCurUserList', nameList);
}

function nextRound(room) {
  var packCount = io.rooms[room]['details'].packCount;
  var curRound = ++io.rooms[room]['details'].round;

  if(io.rooms[room]['details'].direction > 0) {
    io.rooms[room]['details'].direction = -1;
  }
  else {
    io.rooms[room]['details'].direction = 1;
  }

  if(curRound <= packCount){
    startRound(room);
  } 
  else {
    finishDraft(room);
  }
}

function checkIfEveryoneClicked(room) {
  var userList = io.sockets.clients(room.substring(1));
  for(var i = 0; i < userList.length; i++) {
    if(!userList[i].picked) {
      return;
    }
  }
  removeScrollsFromPack(room, userList);

  if(roundIsFinished(room, userList.length)) {
    nextRound(room);
  }
  else {
    switchPacks(room, userList);
  }
}

function switchPacks(room, userList) {
  var direction = io.rooms[room]['details'].direction;

  for(var i = 0; i < userList.length; i++) {
    //TODO: switch between +1 and -1 
    curPack = userList[i].curPack + direction;
    if(curPack >= userList.length) {
      curPack -= userList.length;
    } 
    else if(curPack < 0) {
      curPack += userList.length;
    }
    userList[i].curPack = curPack;
  }
  startRound(room);
}


function roundIsFinished(room, playerCount) {
  var round = io.rooms[room]['details'].round;
  var pack;
  for(var i = 0; i < playerCount; i++) {
   pack = io.rooms[room]['details'].packs[i][round-1];
   if(pack.length > 0){
    return false;
   }
  }
  return true;
}

function alreadyPicked(socket) {
  if(socket.picked)
    return true;
  else
    return false;
}

function generatePacks(room) {
  var playerCount = getUserListFromRoom(room).length;
  var packCount = io.rooms[('/' + room)]['details'].packCount;
  var packList = new Array(playerCount);
  for(var i = 0; i < playerCount; i++) {
    packList[i] = new Array(packCount);
    for(var q = 0; q < packCount; q++) {
      packList[i][q] = generatePack();
    }
  }
  return packList;
}

function generatePack() {
  var pack = [];

  //common = 0
  var commonScrolls = getScrollsByRarity('0');
  for(var i = 0; i < 7; i++) {
    var randomIndex = Math.floor(Math.random() * commonScrolls.length);
    var resource = getResource(commonScrolls[randomIndex]);
    pack.push({"id" : commonScrolls[randomIndex].id, "image" : commonScrolls[randomIndex].image,
              "name" : commonScrolls[randomIndex].name, "resource" : resource.resource, "cost" : resource.cost, 
              "ap": commonScrolls[randomIndex].ap, "ac": commonScrolls[randomIndex].ac, "hp": commonScrolls[randomIndex].hp, "kind":commonScrolls[randomIndex].kind});
  }

  //uncommon = 1
  var uncommonScrolls = getScrollsByRarity('1');
  for(var i = 0; i < 2; i++) {
    var randomIndex = Math.floor(Math.random() * uncommonScrolls.length);
    var resource = getResource(uncommonScrolls[randomIndex]);
    pack.push({"id" : uncommonScrolls[randomIndex].id, "image" : uncommonScrolls[randomIndex].image,
              "name" : uncommonScrolls[randomIndex].name, "resource" : resource.resource, "cost" : resource.cost, 
              "ap": uncommonScrolls[randomIndex].ap, "ac": uncommonScrolls[randomIndex].ac, "hp": uncommonScrolls[randomIndex].hp, "kind":uncommonScrolls[randomIndex].kind});
  }

  //rare = 2
  var rareScrolls = getScrollsByRarity('2');
  var randomIndex = Math.floor(Math.random() * rareScrolls.length);
  var resource = getResource(rareScrolls[randomIndex]);
  pack.push({"id" : rareScrolls[randomIndex].id, "image" : rareScrolls[randomIndex].image,
            "name" : rareScrolls[randomIndex].name, "resource" : resource.resource, "cost" : resource.cost, 
            "ap": rareScrolls[randomIndex].ap, "ac": rareScrolls[randomIndex].ac, "hp": rareScrolls[randomIndex].hp, "kind":rareScrolls[randomIndex].kind});
  return pack;
}

function getResource(scroll) {
  if(scroll.costenergy > 0) {
    return {"resource": "energy", "cost": scroll.costenergy};
  }
  else if(scroll.costorder > 0) {
    return {"resource": "order", "cost": scroll.costorder};
  }
  else if(scroll.costdecay > 0) {
    return {"resource": "decay", "cost": scroll.costdecay};
  }

  return {"resource": "growth", "cost": scroll.costgrowth};
}

function removeScrollsFromPack(room, userList) {
  var round = io.rooms[room]['details'].round;
      
  for(var i = 0; i < userList.length; i++) {
      removeScrollFromPack(userList, i, round, room)
      userList[i].picked = false;
      userList[i].pickedScroll = null;
    }
}

function removeScrollFromPack(userList, user, round, room) {
   if (isValid(io.rooms[room])) {
    if(isValid(io.rooms[room]['details'].packs)) {
      var pack = io.rooms[room]['details'].packs[userList[user].curPack][round-1];
      for(var p = 0; p < pack.length; p++) {
        if(pack[p].id == userList[user].pickedScroll) {
          io.rooms[room]['details'].packs[userList[user].curPack][round-1].splice(p, 1);
          return;
        }
      }
    }
  }
}

function getScrollsByRarity(rarity) {
  return scrollsJSON.filter(
    function(json) {
      return json.rarity == rarity;
    }
  );
}

function rejoinLobby(socket) {
  var oldRoom = getRoomFromSocket(socket).substring(1);
  socket.leave(oldRoom);
  socket.join('lobby');

  socket.emit('backToLobby');
}

function newPerson(name, socket) {
    if (!socket.username) {
      if (!name) {
        socket.emit("error", {
          type: 'nameerror',
          msg: 'You have to enter a name!'
        });
      } else if (name.length > 45) {
        socket.emit("error", {
          type: 'nameerror',
         msg: 'The maximum length of the name is 45 letters!'
        });
      } else {     
          socket.username = name;
          socket.emit('name', name, socket.id);
         //userList['lobby'][userList['lobby'].length] = {'socketID' : socket.id, 'userName' : name};
          io.sockets. in ('lobby').emit('updateCurUserList', getUserListFromRoom('lobby'));
          io.sockets. in ('lobby').emit('syncRoomList', generateAllRoomJson());
        }
    }
}

function getRoomFromSocket(socket) {
  var rooms = io.sockets.manager.roomClients[socket.id];
  for (var key in rooms) {
    if (key.charAt(0) == '/') {
      return key;
    }
  }
}

function generateOneRoomJson(roomid) {
  var retjson = JSON.parse(JSON.stringify(io.rooms[('/' + roomid)]['details']));
  if (retjson.password) {
    retjson.needpw = true;
  }
  delete retjson['password'];
  return retjson;
}

function generateAllRoomJson() {
  var roomList = JSON.parse(JSON.stringify(io.rooms));
  var rooms = [];
  for(key in io.rooms) {
    if(isValid(io.rooms[key]['details']) && !isBlank(key)) {
      var retjson = JSON.parse(JSON.stringify(io.rooms[key]['details']));
      if(isValid(retjson)) {
        if(!isBlank(retjson.title) && retjson.title != '/lobby') {
          if (retjson.password) {
            retjson.needpw = true;
          }
          delete retjson['password'];
          rooms.push(retjson);
        }
      }
    }
  }
  return rooms;
}

function checkIfRoomAlreadyExists(id) {
  var rooms = generateAllRoomJson();
  var exists = false;
  for(var i = 0; i < rooms.length; i++) {
    console.log('room: '+rooms[i].id);
    if(rooms[i].id === id) {
      exists = true;
      break;
    }
  }
  return exists;
}

function getUserListFromRoom(room) {
  var clients = io.sockets.clients(room);
  var nameList = [];
  for(var i = 0; i < clients.length; i++) {
    if(clients[i].username !== null && clients[i].username !== undefined)
      nameList.push({"id": clients[i].id, "name": clients[i].username});
  }
  return nameList;
}

//For checking if a string is blank, null or undefined
function isBlank(str) {
  return (!str || /^\s*$/.test(str) || typeof str !== "string");
}

function isValid(par) {
  return typeof par !== "undefined" && par !== null;
}