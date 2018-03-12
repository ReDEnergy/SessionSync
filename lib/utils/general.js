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

// *****************************************************************************
// Public API
exports.copyProperties = copyProperties;
exports.getValidFunction = getValidFunction;