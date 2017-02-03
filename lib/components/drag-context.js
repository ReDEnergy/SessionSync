'use strict';

// *****************************************************************************
// Custom Modules

const { WindowEvents, GlobalEvents } = require('../utils/global-events');

// *****************************************************************************
// API

var DragContext = (function DragContext() {

	var context = null;

	function setContext(ctx) {
		context = ctx;
		WindowEvents.emitLocal('TrashCan-Droppable', ctx != null);
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

