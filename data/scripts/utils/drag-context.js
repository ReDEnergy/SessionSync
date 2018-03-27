define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	const { WindowEvents } = require('./global-events');

	// *****************************************************************************
	// API

	var DragContext = (function DragContext() {

		var context = null;

		function setContext(ctx) {
			context = ctx;
			WindowEvents.emit(document, 'TrashCan-Droppable', ctx != null);
		}

		function getContext() {
			return context;
		}

		function hasContext() {
			return context != null;
		}

		function clearContext() {
			setContext(null);
		}

		return {
			hasContext: hasContext,
			clearContext: clearContext,
			setContext: setContext,
			getContext: getContext
		};
	})();


	// *****************************************************************************
	// Public API
	exports.DragContext = DragContext;

});