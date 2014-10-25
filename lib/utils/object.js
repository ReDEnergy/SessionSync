'use strict';

function copyProperties(source, destination) {
	for (var prop in source) {
	    if (source.hasOwnProperty(prop)) {
	        destination[prop] = source[prop];
	    }
	}
}


// *****************************************************************************
// Public API
exports.copyProperties = copyProperties;