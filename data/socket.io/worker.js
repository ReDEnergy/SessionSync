'use strict';

var socket = io.connect('http://localhost:8888');

socket.on('connect', function() {
	
	socket.on('update', function(data) {
		test.value = updateCount++; 
		var evt = document.createEvent("HTMLEvents");
		evt.initEvent("change", false, true);
		test.dispatchEvent(evt);
	});
	
	var test = document.getElementById('test');
	var updateCount = 0;

	socket.on('disconnect', function() {
		console.log('Socket Disconnected');
	});
});