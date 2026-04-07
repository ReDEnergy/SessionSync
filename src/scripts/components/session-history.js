'use strict';

// *****************************************************************************
// Custom Modules

import { WindowEvents, GlobalEvents } from '../utils/global-events';

// *****************************************************************************
// API

export const SessionHistory = (function SessionHistory() {
	var storageKey = {
		config: 'history.config',
		active: 'history.active',
		list: 'history.sessions'
	};

	var sessions = [];

	var init = function init() {
		if (typeof browser !== 'undefined' && browser.storage) {
			browser.storage.local.get(storageKey.list).then(function (obj) {
				if (obj[storageKey.list]) {
					sessions = obj[storageKey.list];
				}
			});
		}
	};

	var getFullHistory = function getFullHistory(callback) {
		if (typeof browser !== 'undefined' && browser.storage) {
			browser.storage.local.get(storageKey.active).then(function (obj) {
				callback(sessions, obj[storageKey.active]);
			});
		}
	};

	var getHistorySession = function getHistorySession(index, callback) {
		if (index >= 0 && index < sessions.length) {
			callback(sessions[index]);
		}
		else if (typeof browser !== 'undefined' && browser.storage) {
			browser.storage.local.get(storageKey.active).then(function (obj) {
				callback(obj[storageKey.active]);
			});
		}
	};

	var getConfig = function getConfig(callback) {
		if (typeof browser !== 'undefined' && browser.storage) {
			browser.storage.local.get(storageKey.config).then(function (obj) {
				callback(obj[storageKey.config]);
			});
		}
	};

	var updateConfig = function updateConfig(info) {
		if (typeof browser !== 'undefined' && browser.storage) {
			browser.storage.local.set({ [storageKey.config]: info });
		}
	};

	var updateSessions = function updateSessions(sessions) {
		if (typeof browser !== 'undefined' && browser.storage) {
			browser.storage.local.set({ [storageKey.list]: sessions })
				.then(function () {
					WindowEvents.emit(document, 'ShowHistoryList');
				});
		}
	};

	var onStorageChanged = function onStorageChanged(object) {
		if (object[storageKey.list]) {
			init();
		}
	};

	GlobalEvents.on('HistorySessionDelete', function (index) {
		if (index == -1) {
			if (typeof browser !== 'undefined' && browser.runtime) {
				browser.runtime.sendMessage({ event: 'history.deleteActive' });
			}
		}
		else {
			getFullHistory(function (sessions) {
				if (index >= 0 && index < sessions.length) {
					sessions.splice(index, 1);
					updateSessions(sessions);
				}
			});
		}
	});

	GlobalEvents.on('HistorySessionDeleteAll', function () {
		sessions = [];
		updateSessions(sessions);
	});

	if (typeof browser !== 'undefined' && browser.storage) {
		try {
			browser.storage.onChanged.addListener(onStorageChanged);
		} catch (e) {
			console.warn('browser.storage.onChanged.addListener failed', e);
		}
	}

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
