'use strict';

console.log("Worker Attached!");

var test = document.getElementById('test');

test.addEventListener('change', function () {
	self.port.emit('update', null);
});