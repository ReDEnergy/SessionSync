'use strict';

// *****************************************************************************
// Custom Modules

// Utils
import { WindowEvents } from '../utils/global-events';

// *****************************************************************************
// API

/*
* Session Hotkeys
*/

export function SessionHotkeys() {
	// ------------------------------------------------------------------------
	// Events

	var onKeyDown = function (e) {
		switch (e.keyCode) {
			// Key: F1
			case 112: {
				WindowEvents.emit(document, 'SessionScrollToSelected');
				break;
			}

			// Key: F2
			case 113: {
				WindowEvents.emit(document, 'EditSelectedSession');
				break;
			}

			// Key: F3
			case 114: {
				e.preventDefault();
				WindowEvents.emit(document, 'FocusSessionFilter');
				break;
			}

			// Key: F6
			case 117: {
				e.preventDefault();
				WindowEvents.emit(document, 'DeleteHistorySessions');
				break;
			}

			// Key: CTRL + F
			case 70: {
				if (e.ctrlKey == true && e.shiftKey == false && e.altKey == false) {
					e.preventDefault();
					WindowEvents.emit(document, 'FocusSessionFilter');
				}
				break;
			}
		}
	};

	// ------------------------------------------------------------------------
	// Events

	document.addEventListener('keydown', onKeyDown);

	// ------------------------------------------------------------------------
	// Public properties

}