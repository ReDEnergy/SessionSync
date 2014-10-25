'use strict';

// SDK Modules
var EventDestroyer = (function EventDestroyer() {

	var map = new Map();

	function add(object, topic, func) {
		var list = map.get(object);
		if (list === undefined) {
			list = [];
			map.set(object, list);
		}
		list.push([topic, func]);
	}

	function execute(object) {
		var list = map.get(object);
		// console.log(list);
		if (list instanceof Array) {
			list.forEach(function(event) {
				object.removeEventListener(event[0], event[1]);
			});
			map.delete(object);
		}
	}

	return {
		add : add,
		execute : execute
	};
})();


// *****************************************************************************
// Public API
exports.EventDestroyer = EventDestroyer;
