'use strict';

export function copyProperties(source, destination) {
	for (var prop in source) {
		if (Object.prototype.hasOwnProperty.call(source, prop)) {
			destination[prop] = source[prop];
		}
	}
}

// Test if object is a valid javascript function
// Returns the same object if true or a new function otherwise
export function getValidFunction(object) {
	var value = (typeof object === 'function' ? object : function () { });
	return value;
}

export function LimitCounter(limit, callback) {
	var func = getValidFunction(callback);
	var counted = 0;
	var triggered = false;

	function checkLimit() {
		if (!triggered && counted >= limit) {
			triggered = true;
			func();
		}
	}

	this.advance = function advance() {
		counted++;
		checkLimit();
	};

	this.offsetLimit = function offsetLimit(offset) {
		limit += offset;
		if (limit > 0) {
			checkLimit();
		}
	};
}