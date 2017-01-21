'use strict';


// *****************************************************************************
// SDK Modules

const { setTimeout, clearTimeout } = require("sdk/timers");

// *****************************************************************************
// Custom Modules

// App
const { AppConfig } = require('../config');
const { SessionSyncModel } = require('../session-sync-model');

// Utils
const { HTMLCreator } = require('../utils/dom');
const { WindowEvents, GlobalEvents } = require('../utils/global-events');


// *****************************************************************************
// API

/*
 * Session Hotkeys
 */

function SessionHotkeys(document)
{
	var window = document.ownerGlobal;
	
	// Create DomHealper 
	var DomElem = HTMLCreator(document);

	// ------------------------------------------------------------------------
	// Create UI

	var onKeyDown = function(e) 
	{
		switch(e.keyCode)
		{
			// F2
			case 113: {
				WindowEvents.emit(document, 'EditSelectedSession');
				break;
			}
			
			// // UP arrow
			// case 38: {
				// WindowEvents.emit(document, 'SessionList-SelectNext');
				// break;
			// }

			// // DOWN arrow
			// case 38: {
				// WindowEvents.emit(document, 'EditSelectedSession');
				// break;
			// }

		}
	};

	// ------------------------------------------------------------------------
	// Events

	WindowEvents.on(document, 'UIToggledOff', function() {
		window.removeEventListener("keydown", onKeyDown);
	});
	
	WindowEvents.on(document, 'UIToggledOn', function() {
		window.addEventListener("keydown", onKeyDown);
	});

	WindowEvents.on(document, 'InstanceDestroy', function() {
		window.removeEventListener("keydown", onKeyDown);
	});

	// ------------------------------------------------------------------------
	// Public properties

}

// *****************************************************************************
// Public API

exports.SessionHotkeys = SessionHotkeys;
