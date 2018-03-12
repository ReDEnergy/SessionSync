define(function(require, exports) {
	'use strict';

	function copyProperties(source, destination) {
		for (var prop in source) {
			if (source.hasOwnProperty(prop)) {
				destination[prop] = source[prop];
			}
		}
	}

	// Test if object is a valid javascript function
	// Returns the same object if true or a new function otherwise
	function getValidFunction(object)
	{
		var value = (typeof object === 'function' ? object : function () {});
		return value;
	}

	function LimitCounter(limit, callback)
	{
		var func = getValidFunction(callback);
		var counted = 0;
		var triggered = false;

		function checkLimit() {
			if (!triggered && counted >= limit)
			{
				triggered = true;
				func();
			}
		}

		this.advance = function advance() {
			counted++;
			checkLimit();
			// console.log(counted, limit);
		}.bind(this);

		this.offsetLimit = function offsetLimit(offset) {
			limit += offset;
			if (limit > 0) {
				checkLimit();
			}
		};
	}

	// ------------------------------------------------------------------------
	// Public API

	exports.LimitCounter = LimitCounter;
	exports.copyProperties = copyProperties;
	exports.getValidFunction = getValidFunction;
});