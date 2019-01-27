'use strict';

var BrowserSession = function BrowserSession()
{
	this.timer;
	this.tabCount = 0;
	this.startTime = (new Date()).getTime();
	this.lastSave = this.startTime;
	this.updateInterval = 15;
	this.windows = [];
	this.onUpdate = function () {};
};

BrowserSession.prototype.update = function update()
{
	// Prepare session information
	browser.windows.getAll({
		populate: true,
		windowTypes: ['normal']
	})
	.then(function (windows) {
		var sessions = [];
		var tabCount = 0;

		for (let mozWindow of windows)
		{
			if (mozWindow.incognito == false)
			{
				var tabs = [];

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
					tabs[tab.index] = sessionTab;
				}

				sessions.push(tabs);
			}
		}

		// Update internal storage
		this.lastSave = (new Date()).getTime();
		this.tabCount = tabCount;
		this.windows = sessions;
		this.onUpdate();

		// console.log(this);

	}.bind(this));
};

BrowserSession.prototype.start = function start()
{
	if (this.timer == undefined) {
		// console.log('Session auto-save: start');
		this.timer = setInterval(this.update.bind(this), this.updateInterval * 1000);
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
	this.updateInterval = updateInterval;
	if (this.timer != undefined) {
		// console.log('Session auto-save: reset interval');
		this.stop();
		this.start();
	}
};

(function SessionAutoSave()
{
	// ------------------------------------------------------------------------
	// Init

	var activeSession = new BrowserSession();
	var sessions = [];
	var sessionsKey = 'history.sessions';

	var config = {
		key: 'history.config',
		enabled: true,
		interval: 15,
		savingSlots: 10,
		expireTimeHours: 48,	// hours
	};

	browser.storage.local.get(config.key).then(function (obj) {
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
	});

	var init = function init()
	{
		browser.storage.local.get(sessionsKey).then(function (obj) {
			if (obj[sessionsKey]) {
				sessions = obj[sessionsKey];
			}

			updateStorage();

			activeSession.resetInterval(config.interval);
			activeSession.onUpdate = updateTrackedSession;

			updateState();

			browser.storage.onChanged.addListener(function onChange(object) {
				if (object[config.key]) {
					config = object[config.key].newValue;

					activeSession.resetInterval(config.interval);
					config.enabled ? activeSession.start() : activeSession.stop();
				}
				if (object[sessionsKey]) {
					sessions = object[sessionsKey].newValue;
				}
			});
		});
	};

	// ------------------------------------------------------------------------
	// Events

	var updateTrackedSession = function updateTrackedSession()
	{
		sessions[sessions.length ? (sessions.length - 1) : 0] = {
			tabCount: activeSession.tabCount,
			startDate: activeSession.startTime,
			lastSave: activeSession.lastSave,
			windows: activeSession.windows,
			active: true,
		};

		browser.storage.local.set({ [sessionsKey] : sessions});
	};

	var updateStorage = function updateStorage()
	{
		var expireTime = new Date(new Date() - config.expireTimeHours * 3600 * 1000);

		var list = [];

		// compact free space and delete expired sessions
		sessions.forEach(function (session) {
			if (session && session.tabCount) {
				delete session.active;
				if (config.expireTimeHours > 0)
				{
					if (session.lastSave < expireTime) {
						return;
					}
				}
				list.push(session);
			}
		});

		// get session list
		sessions = list.slice(-(config.savingSlots - 1));
		sessions[list.length] = undefined;
	};

	var updateState = function updateState()
	{
		config.enabled ? activeSession.start() : activeSession.stop();
	};

})();