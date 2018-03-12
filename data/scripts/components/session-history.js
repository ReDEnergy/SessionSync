define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	const { WindowEvents, GlobalEvents } = require('../utils/global-events');

	// *****************************************************************************
	// API

	var SessionHistory = (function SessionHistory()
	{
		var configKey = 'history.config';
		var sessionsKey = 'history.sessions';

		var getHistory = function getHistory(callback)
		{
			if (typeof browser === 'object' ) {
				browser.storage.local.get(sessionsKey).then(function (obj) {
					if(obj[sessionsKey]) {
						callback(obj[sessionsKey]);
					}
				});
			}
		};

		var getConfig = function getConfig(callback)
		{
			if (typeof browser === 'object' ) {
				browser.storage.local.get(configKey).then(function (obj) {
					callback(obj[configKey]);
				});
			}
		};

		var updateConfig = function updateConfig(info)
		{
			browser.storage.local.set({ [configKey] : info});
		};

		var updateSessions = function updateSessions(sessions)
		{
			browser.storage.local.set({ [sessionsKey] : sessions})
			.then(function () {
				WindowEvents.emit(document, 'ShowHistoryList');
			});
		}

		GlobalEvents.on('HistorySessionDelete', function(index)
		{
			getHistory(function (sessions) {
				if (index >= 0 && index < sessions.length) {
					if (index == sessions.length - 1)
					{
						sessions[index] = undefined;
					}
					else
					{
						sessions.splice(index, 1);
					}
					updateSessions(sessions);
				}
			});
		});

		GlobalEvents.on('HistorySessionDeleteAll', function() {
			updateSessions([]);
		});

		// ------------------------------------------------------------------------
		// Public API

		return {
			getConfig: getConfig,
			getHistory: getHistory,
			updateConfig: updateConfig
		};

	})();

	// *****************************************************************************
	// Public API

	exports.SessionHistory = SessionHistory;
});