define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	const { AppConfig } = require('../config');
	const { WindowEvents, GlobalEvents } = require('../utils/global-events');

	// *****************************************************************************
	// API

	var SessionHistory = (function SessionHistory()
	{
		var storageKey = {
			config: 'history.config',
			active: 'history.active',
			list: 'history.sessions'
		};

		var sessions = [];

		var init = function init()
		{
			browser.storage.local.get(storageKey.list).then(function (obj) {
				if(obj[storageKey.list]) {
					sessions = obj[storageKey.list];
				}
			});
		};

		var getFullHistory = function getFullHistory(callback)
		{
			browser.storage.local.get(storageKey.active).then(function (obj) {
				callback(sessions, obj[storageKey.active]);
			});
		};

		var getHistorySession = function getHistorySession(index, callback) {
			if (index >=0 && index < sessions.length) {
				callback(sessions[index]);
			}
			else {
				browser.storage.local.get(storageKey.active).then(function (obj) {
					callback(obj[storageKey.active]);
				});
			}
		};

		var getConfig = function getConfig(callback)
		{
			browser.storage.local.get(storageKey.config).then(function (obj) {
				callback(obj[storageKey.config]);
			});
		};

		var updateConfig = function updateConfig(info)
		{
			browser.storage.local.set({ [storageKey.config] : info});
		};

		var updateSessions = function updateSessions(sessions)
		{
			browser.storage.local.set({ [storageKey.list] : sessions})
			.then(function () {
				WindowEvents.emit(document, 'ShowHistoryList');
			});
		};

		GlobalEvents.on('HistorySessionDelete', function(index)
		{
			getFullHistory(function (sessions) {
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
			init: init,
			getConfig: getConfig,
			getFullHistory: getFullHistory,
			getHistorySession: getHistorySession,
			updateConfig: updateConfig
		};

	})();

	// *****************************************************************************
	// Public API

	exports.SessionHistory = SessionHistory;
});