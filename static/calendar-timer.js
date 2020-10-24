"use strict";

let eventData = [];
let calendarRefreshID = -1;

/******* UI *******/

function toggleFullScreen() {
	// From https://developers.google.com/web/fundamentals/native-hardware/fullscreen
	var doc = window.document;
	var docEl = doc.documentElement;
  
	var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
	var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
  
	if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
	  requestFullScreen.call(docEl);
	}
	else {
	  cancelFullScreen.call(doc);
	}
}

// ***** FETCH AND PROCESS THE DATA

function processData(data) {
	if (data['error']) {
		// Calendar not set, display settings window automatically
		document.querySelector(".settings-form").style = "display:block";
		document.querySelector(".main-grid").style = "display:none";
		return null;
	}
	// Sort data
	data.sort(function(a,b) {
		// https://stackoverflow.com/a/1129270
		if ( a['start-utc-timestamp'] < b['start-utc-timestamp'] ){
			return -1;
			}
			if ( a['start-utc-timestamp'] > b['start-utc-timestamp'] ){
			return 1;
			}
			return 0;
	
	});
	// Display in console
	console.log(data);
	eventData = data;
	// Start the clock
	setInterval(ticktock, 1000);
}

function getData(ical) {
	console.log("Requesting calendar data for "+ical);
    let payload = {};
	if (ical !== null) {
		payload['ical'] = ical;
	}
	let settings = { 
        method: 'POST',
        mode: 'cors', 
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    };
	fetch( "/calendardata", settings )
		.then(function(received) {
			if (received.ok) {
				return received.json()
			}
		})
		.then(processData);
}

// ***** RUN THE CLOCK

function getTimeNowObject() {
	var now = new Date();
	var response = {};
	response.year = now.getFullYear();
	response.month = now.getMonth() + 1;
	response.day = now.getDate();
	response.hour = now.getHours();
	response.minute = now.getMinutes();
	response.second = now.getSeconds();
	response.dayOfWeek = now.getDay();
	response.secondsOfDay = response.second + response.minute*60 + response.hour*3600;
	response.timestamp = now.getTime() / 1000;
	console.log(response);
	return response;
}

function secondsToTimeString(s) {
	function pad( n ) {
		var s = n.toString();
		while (s.length < 2) {
		s = "0" + s;
		}
		return(s);
	}
	return Math.floor(Number(s/3600)) + ":" + pad(Math.floor(Number((s%3600)/60))) + ":" + pad(Math.floor(Number(s%60)));    
}

function timeStringToHHMM(timestring) {
	let parts = timestring.split(":");
	return parts[0]+":"+parts[1];
}

function timeStringToHHMMSS(timestring) {
	let parts = timestring.split(" ");
	return parts[0];
}

function ticktock() {
	// Executed several times per second
	let now = new Date();
	let eventNumber = 0;
	let timestamp = now.getTime()/1000;
	// Debugging - fake the time
	// timestamp += 18*60*60 + 5*60;
	let months = ["Jan","Feb","Mar","Apr","May","June","July","Aug","Sept","Oct","Nov","Dec"];
	document.querySelector(".clock-date").innerHTML = now.getDate() + " " + months[now.getMonth()];
	document.querySelector(".clock-time").innerHTML = timeStringToHHMMSS(now.toLocaleTimeString());
	while (eventNumber < eventData.length-1 && eventData[eventNumber]['finish-utc-timestamp'] < timestamp) {
		eventNumber++;
	}
	if (eventData[eventNumber]['start-utc-timestamp'] <= timestamp && eventData[eventNumber]['finish-utc-timestamp'] >= timestamp) {
		// Current session
		console.log("Current event: ",eventData[eventNumber]);
		let secondsRemaining = eventData[eventNumber]['finish-utc-timestamp'] - timestamp;
		let startDateTime = new Date(eventData[eventNumber]['start-utc-timestamp'] * 1000);
		let finishDateTime = new Date(eventData[eventNumber]['finish-utc-timestamp'] * 1000);
		document.querySelector(".now-subject").innerHTML = eventData[eventNumber]['label'];
		document.querySelector(".now-start").innerHTML = timeStringToHHMM(startDateTime.toLocaleTimeString());
		document.querySelector(".now-finish").innerHTML = timeStringToHHMM(finishDateTime.toLocaleTimeString());
		document.querySelector(".now-remaining").innerHTML = Math.floor(secondsRemaining / 60) + 1;
	} else if (eventNumber < eventData.length-1) {
		// Between sessions, still more to come though
		document.querySelector(".now-subject").innerHTML = 'unscheduled';
		document.querySelector(".now-start").innerHTML = '';
		document.querySelector(".now-finish").innerHTML = '';
		document.querySelector(".now-remaining").innerHTML = '';
		eventNumber--;
	}
	if (eventNumber < eventData.length-1) {
		// Next session
		eventNumber++;
		console.log("Next event: ",eventData[eventNumber]);
		let startDateTime2 = new Date(eventData[eventNumber]['start-utc-timestamp'] * 1000);
		let finishDateTime2 = new Date(eventData[eventNumber]['finish-utc-timestamp'] * 1000);
		document.querySelector(".next-subject").innerHTML = eventData[eventNumber]['label'];
		document.querySelector(".next-start").innerHTML = timeStringToHHMM(startDateTime2.toLocaleTimeString());
		document.querySelector(".next-finish").innerHTML = timeStringToHHMM(finishDateTime2.toLocaleTimeString());
		// If we are in unscheduled time, show the minutes until the next event
		if (document.querySelector(".now-subject").innerHTML == 'unscheduled') {
			let secondsRemaining = eventData[eventNumber]['start-utc-timestamp'] - timestamp;
			document.querySelector(".now-remaining").innerHTML = Math.floor(secondsRemaining / 60) + 1
		}
	} else {
		document.querySelector(".next-subject").innerHTML = "";
		document.querySelector(".next-start").innerHTML = "";
		document.querySelector(".next-finish").innerHTML = "";
	}
	if (eventNumber < eventData.length-1) {
		// Next next session
		eventNumber++;
		console.log("Next2 event: ",eventData[eventNumber]);
		let startDateTime3 = new Date(eventData[eventNumber]['start-utc-timestamp'] * 1000);
		let finishDateTime3 = new Date(eventData[eventNumber]['finish-utc-timestamp'] * 1000);
		document.querySelector(".next2-subject").innerHTML = eventData[eventNumber]['label'];
		document.querySelector(".next2-start").innerHTML = timeStringToHHMM(startDateTime3.toLocaleTimeString());
		document.querySelector(".next2-finish").innerHTML = timeStringToHHMM(finishDateTime3.toLocaleTimeString());
	} else {
		document.querySelector(".next2-subject").innerHTML = "";
		document.querySelector(".next2-start").innerHTML = "";
		document.querySelector(".next2-finish").innerHTML = "";
	}
}

/***** MAIN *****/
if (localStorage['ical'] !== null) {
	getData(localStorage['ical']);
	// Update calendar data every 10 minutes if not already doing so
	if (calendarRefreshID > -1) {
		calendarRefreshID = setInterval(function() { getData(); }, 10*60*1000);
	}
}
document.querySelector("#save-settings").addEventListener("click", function() {
	localStorage["ical"] = document.querySelector("#ical").value;
	document.querySelector(".settings-form").style = "display:none";
	document.querySelector(".main-grid").style = "display:grid";
	getData(document.querySelector("#ical").value);
	// Update calendar data every 10 minutes if not already doing so
	if (calendarRefreshID > -1) {
		calendarRefreshID = setInterval(function() { getData(); }, 10*60*1000);
	}
});
document.querySelector("#settings-button").addEventListener("click", function() {
	document.querySelector(".settings-form").style = "display:block";
	document.querySelector(".main-grid").style = "display:none";
});
document.querySelector("#fullscreen-button").addEventListener("click", toggleFullScreen);

