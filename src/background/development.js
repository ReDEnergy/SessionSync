'use strict';

import { SessionAutoSave } from './session-history';

export function initDevelopment() {
	// ------------------------------------------------------------------------
	// Init

	try {
		if (typeof browser !== 'undefined' && browser.commands && browser.commands.onCommand) {
			browser.commands.onCommand.addListener(function (command) {
				if (command == 'session-sync-save-history') {
					for (var i = 0; i < 10; i++) {
						SessionAutoSave.activeSession.update();
					}
				}
			});
		}
	} catch (err) {
		console.warn('browser.commands.onCommand.addListener failed in development.js', err);
	}

	// ------------------------------------------------------------------------
	// Events
}
