'use strict';

const storageKey = {
	config: 'history.config',
	active: 'history.active',
	list: 'history.sessions'
};

function BrowserSession() {
	this.timer = undefined;
	this.active = true;
	this.tabCount = 0;
	this.startTime = new Date().getTime();
	this.lastSave = this.startTime;
	this.windows = {};
}

function WindowSession(id) {
	this.id = id;
	this.tabs = [];
	this.active = true;
	this.saveTime = new Date().getTime();
}

BrowserSession.prototype.update = async function update() {
	if (typeof browser === 'undefined' || !browser.windows) return;

	// Prepare session information
	try {
		const mozWindows = await browser.windows.getAll({
			populate: true,
			windowTypes: ['normal']
		});

		let groupMap = new Map();
		if (browser.tabGroups) {
			try {
				const groups = await browser.tabGroups.query({});
				groups.forEach((g) => groupMap.set(g.id, g));
			} catch (e) {
				console.error('Error fetching groups in history update', e);
			}
		}

		var tabCount = 0;

		for (var key in this.windows) {
			this.windows[key].active = false;
		}

		for (let mozWindow of mozWindows) {
			if (mozWindow.incognito && this.config && this.config.savePrivate == false) {
				delete this.windows[mozWindow.id];
				continue;
			}

			var windowInfo = new WindowSession(mozWindow.id);

			// Add window tabs
			for (var i in mozWindow.tabs) {
				var tab = mozWindow.tabs[i];
				var group = groupMap.get(tab.groupId);
				var sessionTab = {
					title: tab.title,
					url: tab.url,
					pinned: tab.pinned,
					cookieStoreId: tab.cookieStoreId,
					groupId: tab.groupId,
					groupTitle: group ? group.title : undefined,
					groupColor: group ? group.color : undefined
				};
				tabCount++;
				windowInfo.tabs[tab.index] = sessionTab;
			}

			this.windows[mozWindow.id] = windowInfo;
		}

		// Update internal storage
		this.lastSave = new Date().getTime();
		this.tabCount = tabCount;

		// Save new session
		if (browser.storage && browser.storage.local) {
			browser.storage.local.set({ [storageKey.active]: this });
		}
	} catch (err) {
		console.error('Error in BrowserSession.update', err);
	}
};

BrowserSession.prototype.clear = function clear() {
	// Save new session
	this.windows = {};
	if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
		browser.storage.local.set({ [storageKey.active]: this });
	}
};

BrowserSession.prototype.start = function start(updateInterval) {
	if (this.timer == undefined) {
		// console.log('Session auto-save: start');
		this.timer = setInterval(this.update.bind(this), updateInterval * 1000);
		this.update();
	}
};

BrowserSession.prototype.stop = function stop() {
	if (this.timer != undefined) {
		// console.log('Session auto-save: stop');
		clearInterval(this.timer);
		this.timer = undefined;
	}
};

BrowserSession.prototype.resetInterval = function resetInterval(updateInterval) {
	if (this.timer != undefined) {
		// console.log('Session auto-save: reset interval');
		this.stop();
		this.start(updateInterval);
	}
};

BrowserSession.prototype.setConfig = function setConfig(conf) {
	this.config = conf;
	this.resetInterval(conf.interval);
	conf.enabled ? this.start(conf.interval) : this.stop();
};

let activeSession = new BrowserSession();
let sessions = [];
let config = {
	enabled: false,
	interval: 15,
	saveBuffer: 3,
	savingSlots: 20,
	expireTimeHours: 48, // hours
	savePrivate: false
};

const upgradeStorage = function upgradeStorage() {
	for (var i = 0; i < sessions.length; i++) {
		// New storage works with WindowSession objects
		if (sessions[i] != undefined && Array.isArray(sessions[i].windows[0]) == true) {
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

const updateStorage = function updateStorage() {
	upgradeStorage();

	var removeCount = Math.max(sessions.length - config.savingSlots, 0);
	var expireTime = new Date(new Date() - config.expireTimeHours * 3600 * 1000);

	var list = [];
	// console.log('To remove', removeCount);

	// compact free space and delete expired sessions
	sessions.forEach(function (session) {
		if (session != undefined && (removeCount <= 0 || session.lastSave > expireTime)) {
			list.push(session);
		} else {
			if (removeCount > 0) removeCount--;
		}
	});

	if (removeCount > 0) {
		list = list.slice(removeCount);
	}

	// update session list
	sessions = list;
};

const saveSessionsList = function saveSessionsList() {
	if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
		browser.storage.local.set({ [storageKey.list]: sessions });
	}
};

const internalInit = function internalInit() {
	if (typeof browser === 'undefined' || !browser.storage || !browser.storage.local) return;

	browser.storage.local.get([storageKey.list]).then(function (obj) {
		if (obj[storageKey.list]) {
			sessions = obj[storageKey.list];
			updateStorage();
		}

		// console.log(sessions);
		saveSessionsList();

		browser.storage.local.get([storageKey.active]).then(function (data) {
			var session = data[storageKey.active];
			if (session) {
				session.windows = Object.values(session.windows);
				delete session.active;
				sessions.push(session);
				saveSessionsList();
			}
		});

		activeSession.setConfig(config);
	});
};

const onConfigChanged = function onConfigChanged(object) {
	if (object[storageKey.config]) {
		config = object[storageKey.config].newValue;
		activeSession.setConfig(config);
	}
};

export const SessionAutoSave = {
	activeSession: activeSession,
	init: function () {
		if (typeof browser === 'undefined' || !browser.storage || !browser.storage.local) return;

		browser.storage.local.get(storageKey.config).then(
			function onSuccess(obj) {
				if (obj[storageKey.config]) {
					config = obj[storageKey.config];
					internalInit();
				} else {
					browser.storage.local
						.set({
							[storageKey.config]: config
						})
						.then(internalInit);
				}
			},
			function onError() {
				internalInit();
			}
		);

		try {
			if (browser.runtime && browser.runtime.onMessage) {
				browser.runtime.onMessage.addListener(function (message) {
					if (message && message.event == 'history.deleteActive') {
						activeSession.clear();
					}
				});
			}
		} catch (err) {
			console.warn('browser.runtime.onMessage.addListener failed in session-history', err);
		}

		try {
			if (browser.storage && browser.storage.onChanged) {
				browser.storage.onChanged.addListener(onConfigChanged);
			}
		} catch (err) {
			console.warn('browser.storage.onChanged.addListener failed in session-history', err);
		}
	}
};
