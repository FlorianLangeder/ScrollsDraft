function initDraftInterface(socket) {
	var packList;
	var curPicked;
	var roundCount;

	$('#content').show();

	$('#backToLobbyBtn').on('click', function() {
		socket.emit('backToLobby');
	});

	$('#startDraftBtn').on('click', function() {
		socket.emit('startDraft');
	});

	$('#scrolls').on('mouseover', '.scrollImg', function(e) {
		var imageID = e.target.id;
		showScrollPreview(imageID);
	});

	$('#deckList').on('mouseover', '.scrollImg', function(e) {
		var imageID = e.target.id;
		showScrollPreview(imageID);
	});

	$('#scrolls').on('mouseout', '.scrollImg', function(e) {
		$('#scrollPreview').empty();
	});

	$('#deckList').on('mouseout', '.scrollImg', function(e) {
		$('#scrollPreview').empty();
	});

	$('#scrolls').on('click', '.scrollImg', function(e) {
		imgID = e.target.id;
		$("#scrollRow1>td>img").removeClass("selectedBorder");
		$("#scrollRow2>td>img").removeClass("selectedBorder");
		$(e.target).addClass("selectedBorder");
		curPicked = {"id" : imgID, "image" : e.target.getAttribute("data-image")};
		socket.emit('scrollClicked', imgID);
	});

	socket.on('startDraft', function(packCount) {
		packList = new Array();
		roundCount = packCount;
		curPicked = null;
		$('#backToLobbyBtn').hide();
		$('#startDraftBtn').hide();
	});

	socket.on('finishedDraft', function() {
		updateDeckList();
		$('#scrollRow1').empty();
		$('#scrollRow2').empty();
		$('#scrollPreview').empty();
		generateJSON();
	});

	socket.on('startRound', function(pack, round, direction) {
		$('#scrollPreview').empty();
		updateDeckList();
		showScrolls(pack);
		updateRoundNumber(round);
		updateDirection(direction);
	});

	function showScrollPreview(imageID) {
		var imageHTML = '<img class="scrollPreviewImg" src="'+getFullImageFromID(imageID)+'"</img>'; 
		$('#scrollPreview').html(imageHTML);  
	}

	function showScrolls(pack) {
		$('#scrollRow1').empty();
		$('#scrollRow2').empty();
		for(var i = 0; i < pack.length; i++) {
			var stats = '';
			if(pack[i].kind != 'ENCHANTMENT' && pack[i].kind != 'SPELL') {
				var countdown = pack[i].ac > 0 ? pack[i].ac : '-';
				stats = '<p class="scrollStats">'+pack[i].ap+'/'+ countdown +'/'+pack[i].hp+'</p>';
			}
			var resource = '<img class="resourceImg" src="img/resource_'+pack[i].resource+'.png"></img>';
			var cost = '<p class="scrollCost">'+pack[i].cost+'</p>';
			var count = '<p class="scrollCount"></p>';
			var image = '<td id="list'+pack[i].id+'"><img class="scrollImg" data-image="'+pack[i].image+'" id="'+pack[i].id+'"src="'+getImageFromID(pack[i].image)+'"/>'+cost+resource+stats+count+'</td>';
			if(i < 5) {
				$('#scrollRow1').append(image);
			} else {
				$('#scrollRow2').append(image);
			}
		}
	}

	function updateRoundNumber(curRound) {
		$('#round').text("Round: " + curRound + " / "+ roundCount + " | ");
	}

	function updateDirection(direction) {
		var directionString = direction > 0 ? "up" : "down";
		$('#direction').text(" Current Direction: " + directionString);
	}

	function updateDeckList() {
		if(curPicked !== undefined && curPicked !== null) {
			packList.push(curPicked.id);
			var scrollsCount = $('#deckList').find("img#"+curPicked.id).length;
			if(scrollsCount == 0){
				var listData = getImageWithStatsByID(curPicked.id);
				var image = '<li id="picked'+curPicked.id+'">'+listData+'</li>';
				$('#deckList').append(image);
				$('#deckList').scrollTop($('#deckList')[0].scrollHeight);
			}
			else {
				updatePickedScrollCount(curPicked.id, scrollsCount+1);
			}
		}
	}

	function updatePickedScrollCount(id, count) {
		var listElement = $('#picked'+id);
		$('#picked'+id +" > p.scrollCount").text(count+ "x");
	}

	function getImageWithStatsByID(id) {
		var listItem = $('#list'+id);
		listItem.find('img').removeClass("selectedBorder");
		return listItem.html();
	}

	function generateJSON() {
		var IDList;
		for(var i = 0; i < packList.length; i++) {
			if(i != 0)
				IDList += "," + packList[i];
			else
				IDList = packList[i];
		}
		var today = new Date().toJSON().slice(0,10)
		var deckJSON = '{"deck":"'+ today + '-Draft","author":"'+socket.username+'","types":['+IDList+']}';
		$('#scrolls').hide();
		$('#deckTextField').val(deckJSON);
		$('#deckOutputForm').show();
	}

	function getImageFromID(imageID) {
		return 'http://www.scrollsguide.com/app/low_res/'+imageID+'.png';
	}

	function getFullImageFromID(imageID) {
		return 'http://api.scrolldier.com/view/php/api/scrollimage.php?id='+imageID;
	}
}