define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	const { AppConfig } = require('../config');
	const { HTMLCreator } = require('../utils/dom');
	const { WindowEvents } = require('../utils/global-events');

	// *****************************************************************************
	// API

	/*
	* Session Hotkeys
	*/

	function OverlaySystem(document)
	{
		// Create DomHealper
		var DomElem = HTMLCreator(document);

		// ------------------------------------------------------------------------
		// Create UI

		var overlay = DomElem('div', { id : 'overlay' });

		// ------------------------------------------------------------------------
		// Events

		var state = false;

		function setState(options) {
			if (AppConfig.isPanel()) {
				state = options.state;
				overlay.setAttribute('state', state);

				if (options.zIndex) {
					overlay.style.zIndex = options.zIndex;
				}

				if (state == false) {
					overlay.removeAttribute('style');
				}
			}
		}

		function autoHide() {
			if (state == true)
				setState(false);
		}

		document.addEventListener('click', autoHide);

		WindowEvents.on(document, 'OverlaySystem', setState);

		// ------------------------------------------------------------------------
		// Public properties

		this.DOMRoot = overlay;
	}

	// *****************************************************************************
	// Public API

	exports.OverlaySystem = OverlaySystem;
});