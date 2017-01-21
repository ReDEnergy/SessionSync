'use strict';

// *****************************************************************************
// Custom Modules


// *****************************************************************************
// API

var DragContext = (function DragContext() {

	var context = null;

	function setContext(ctx) {
		context = ctx;
	}

	function getContext() {
		return context;
	}	

	return {
		setContext: setContext,
		getContext: getContext
	};
})();


// *****************************************************************************
// Public API
exports.DragContext = DragContext;

