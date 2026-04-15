'use strict';

// *****************************************************************************
// Custom Modules

import { WindowEvents } from './global-events';

// *****************************************************************************
// API

export const DragContext = (function DragContext() {
	var context = null;

	function setContext(ctx) {
		context = ctx;
		if (typeof document !== 'undefined') {
			WindowEvents.emit(document, 'TrashCan-Droppable', ctx != null);
		}
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
