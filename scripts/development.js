'use strict';

(function DevelopmentMode()
{
	// ------------------------------------------------------------------------
	// Init

	browser.commands.onCommand.addListener(function(command) {
		if (command == 'session-sync-save-history') {
			for (var i = 0; i < 10; i++) {
				SessionAutoSave.activeSession.update();
			}
		}
	});

	// ------------------------------------------------------------------------
	// Events

})();