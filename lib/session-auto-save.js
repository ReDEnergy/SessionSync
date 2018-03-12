'use strict';

// *****************************************************************************
// SDK Modules

const { browserWindows } = require("sdk/windows");
const privateBrowsing = require("sdk/private-browsing")
const { getFavicon } = require("sdk/places/favicon");
const { modelFor } = require("sdk/model/core");
const clipboard = require("sdk/clipboard");
const tabs = require("sdk/tabs");
const timers = require("sdk/timers");

// *****************************************************************************
// Custom Modules

// App
const { AppConfig } = require('./config');
const { SessionTab, SessionWindow } = require('./session-bookmark');
const { SessionSyncModel } = require('./session-sync-model');

// Utils
const { HTMLCreator } = require('./utils/dom');
const { WindowEvents, GlobalEvents } = require('./utils/global-events');
const { BookmarkManager } = require('./session/bookmarks');

// Components
const { SessionManager } = require('./session/management');

// *****************************************************************************
// API

/*
 * SessionAutoSave
 */

var BrowserSession = function BrowserSession()
{
	this.timer;
	this.tabCount = 0;
	this.startTime = (new Date()).getTime();
	this.lastSave = this.startTime;
	this.sessions = [];
	this.onUpdate = function () {};
};

BrowserSession.prototype.update = function update()
{
	// Prepare session information
	var tabCount = 0;
	var sessions = [];
	for (let mozWindow of browserWindows)
	{
		if (!privateBrowsing.isPrivate(mozWindow))
		{
			var tabs = [];

			// Add window tabs
			for (var i in mozWindow.tabs)
			{
				var tab = mozWindow.tabs[i];
				var sessionTab = {
					title: tab.title,
					url: SessionManager.getTabURL(tab),
					isPinned: tab.isPinned,
				};
				tabCount++;
				tabs[tab.index] = sessionTab;
			}

			sessions.push(tabs);
		}
	}

	// Update internal storage
	this.lastSave = (new Date()).getTime();
	this.tabCount = tabCount;
	this.sessions = sessions;
	this.onUpdate();
};

BrowserSession.prototype.start = function start() {
	if (this.timer == undefined) {
		// console.log('Session auto-save: start');
		this.timer = timers.setInterval(this.update.bind(this), AppConfig.storage.autoSave.interval * 1000);
		this.update();
	}
};

BrowserSession.prototype.stop = function stop() {
	if (this.timer != undefined) {
		// console.log('Session auto-save: stop');
		timers.clearInterval(this.timer);
		this.timer = undefined;
	}
};

BrowserSession.prototype.resetInterval = function resetInterval() {
	if (this.timer != undefined) {
		// console.log('Session auto-save: reset interval');
		this.stop();
		this.start();
	}
};


/*
 * SessionAutoSave
 */

var SessionAutoSave = (function SessionAutoSave(document)
{
	// ------------------------------------------------------------------------
	// Init

	var autoSave = AppConfig.storage.autoSave;

	// Create a new session
	var activeSession = new BrowserSession();
	activeSession.onUpdate = function() {
		autoSave.sessions[autoSave.sessions.length - 1] = {
			tabCount: activeSession.tabCount,
			startDate: activeSession.startTime,
			lastSave: activeSession.lastSave,
			sessions: activeSession.sessions,
		};
	};

	function updateStorage()
	{
		var expireTime = new Date(new Date() - autoSave.expireTimeHours * 3600 * 1000);

		var sessions = [];

		// compact free space and delete expired sessions
		for (let session of autoSave.sessions) {
			if (session && session.tabCount) {
				if (autoSave.expireTimeHours > 0)
				{
					if (session.lastSave < expireTime) {
						continue;
					}
				}
				sessions.push(session);
			}
		}

		// get session list
		autoSave.sessions = sessions.slice(-(autoSave.savingSlots - 1));
		autoSave.sessions[autoSave.sessions.length] = undefined;
	}

	var updateState = function updateState()
	{
		autoSave.enabled ? activeSession.start() : activeSession.stop();
	};

	// ------------------------------------------------------------------------
	// Events

	GlobalEvents.on('cfg.autoSave.enabled', updateState);
	GlobalEvents.on('cfg.autoSave.interval', function() {
		activeSession.resetInterval();
	});

	GlobalEvents.on('AddonDisabled', function() {
		activeSession.stop();
	});

	GlobalEvents.on('HistorySessionDelete', function(index) {
		if (index >= 0 && index < autoSave.sessions.length) {
			if (index == autoSave.sessions.length - 1) {
				autoSave.sessions[index] = undefined;
			} else {
				autoSave.sessions.splice(index, 1);
			}
			GlobalEvents.emit('UpdateHistoryList');
		}
	});

	GlobalEvents.on('HistorySessionDeleteAll', function(index) {
		autoSave.sessions = [undefined];
		GlobalEvents.emit('UpdateHistoryList');
	});

	// ------------------------------------------------------------------------
	// Init code

	updateStorage();
	updateState();

})();

// *****************************************************************************
// Public API

exports.SessionAutoSave = SessionAutoSave;