'use strict';

var BrowserSession = function BrowserSession()
{
	this.timer;
	this.active = true;
	this.tabCount = 0;
	this.startTime = (new Date()).getTime();
	this.lastSave = this.startTime;
	this.windows = { };
};

var WindowSession = function WindowSession(id)
{
	this.id = id;
	this.tabs = [];
	this.active = true;
	this.saveTime = (new Date()).getTime();
};

BrowserSession.prototype.update = function update()
{
	// Prepare session information
	browser.windows.getAll({
		populate: true,
		windowTypes: ['normal']
	})
	.then(function (mozWindows) {
		var tabCount = 0;

		for (var key in this.windows)
		{
			this.windows[key].active = false;
		}

		for (let mozWindow of mozWindows)
		{
			if (mozWindow.incognito == false)
			{
				var windowInfo = new WindowSession(mozWindow.id);

				// Add window tabs
				for (var i in mozWindow.tabs)
				{
					var tab = mozWindow.tabs[i];
					var info = SessionManagement.getTabInfo(tab.url);
					var sessionTab = {
						title: tab.title,
						url: info.url,
						favIconUrl: info.lazyLoading ? info.favIconUrl : tab.favIconUrl,
						pinned: tab.pinned,
					};
					tabCount++;
					windowInfo.tabs[tab.index] = sessionTab;
				}

				this.windows[mozWindow.id] = windowInfo;
			}
		}

		// Update internal storage
		this.lastSave = (new Date()).getTime();
		this.tabCount = tabCount;

		// Save new session
		browser.storage.local.set({ 'history.active' : this});

	}.bind(this));
};

BrowserSession.prototype.start = function start(updateInterval)
{
	if (this.timer == undefined) {
		// console.log('Session auto-save: start');
		this.timer = setInterval(this.update.bind(this), updateInterval * 1000);
		this.update();
	}
};

BrowserSession.prototype.stop = function stop()
{
	if (this.timer != undefined) {
		// console.log('Session auto-save: stop');
		clearInterval(this.timer);
		this.timer = undefined;
	}
};

BrowserSession.prototype.resetInterval = function resetInterval(updateInterval)
{
	if (this.timer != undefined) {
		// console.log('Session auto-save: reset interval');
		this.stop();
		this.start(updateInterval);
	}
};

BrowserSession.prototype.setConfig = function setConfig(config)
{
	this.resetInterval(config.interval);
	config.enabled ? this.start(config.interval) : this.stop();
};

var SessionAutoSave = (function SessionAutoSave()
{
	// ------------------------------------------------------------------------
	// Init

	var activeSession = new BrowserSession();
	var sessions = [];
	var sessionsKey = 'history.sessions';
	var activeSessionKey = 'history.active';

	var config = {
		key: 'history.config',
		enabled: true,
		interval: 15,
		saveBuffer: 3,
		savingSlots: 10,
		expireTimeHours: 48,	// hours
	};

	browser.storage.local.get(config.key)
	.then(function onSuccess(obj) {
		if (obj[config.key])
		{
			config = obj[config.key];
			init();
		}
		else
		{
			browser.storage.local.set({
				[config.key] : config
			}).then(init);
		}

	}, function onError() {
		init();
	});

	var upgradeStorage = function upgradeStorage()
	{
		for (var i = 0; i < sessions.length; i++)
		{
			// New storage works with WindowSession objects
			if (Array.isArray(sessions[i].windows[0]) == true)
			{
				for (var j = 0; j < sessions[i].windows.length; j++) {
					var session = new WindowSession(0);
					session.state = 'history';
					session.saveTime = sessions[i].lastSave;
					session.tabs = sessions[i].windows[j];
					sessions[i].windows[j] = session;
				}
			}
		}
	};

	var updateStorage = function updateStorage()
	{
		var removeCount = sessions.length - config.savingSlots;
		if (removeCount <= 0)
			return;

		var expireTime = new Date(new Date() - config.expireTimeHours * 3600 * 1000);

		var list = [];

		// compact free space and delete expired sessions
		sessions.forEach(function (session) {
			if (removeCount > 0) {
				removeCount--;
				if (session.lastSave < expireTime) {
					return;
				}
				list.push(session);
			}
			else {
				list.push(session);
			}
		});

		// get session list
		sessions = list;
	};

	var init = function init()
	{
		browser.storage.onChanged.addListener(onConfigChanged);

		browser.storage.local.get([activeSessionKey, sessionsKey])
		.then(function(obj) {

			if (obj[sessionsKey]) {
				sessions = obj[sessionsKey];
				updateStorage();
			}

			if (obj[activeSessionKey]) {
				obj[activeSessionKey].windows = Object.values(obj[activeSessionKey].windows);
				delete obj[activeSessionKey].active;
				sessions.push(obj[activeSessionKey]);
			}

			upgradeStorage();

			browser.storage.local.set({ [sessionsKey] : sessions});

			activeSession.setConfig(config);
		});
	};

	// ------------------------------------------------------------------------
	// Events

	var onConfigChanged = function onConfigChanged(object)
	{
		if (object[config.key]) {
			config = object[config.key].newValue;
			activeSession.setConfig(config);
		}
	};

	// ------------------------------------------------------------------------
	// Public API

	return {
		activeSession : activeSession
	};

})();