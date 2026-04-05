'use strict';

export const Commands = {
	toggleWidget: '_execute_browser_action',
	openTutorial: 'session_sync_tutorial',
	detachToTab: 'session_sync_detach_tab',
	detachToWindow: 'session_sync_detach_window',
	leaveFeedback: 'session_sync_leave_feedback',
	openGithub: 'session_sync_open_github'
};

const SessionSync = (function () {

	var windowInfoKey = 'style.window.detach';
	var activeWindow = null;
	var defaultWindowProperties = {
		width: 800,
		height: 600
	};

	function init() {
		try {
			if (typeof browser !== 'undefined' && browser.windows && browser.windows.onRemoved) {
				browser.windows.onRemoved.addListener(function (windowID) {
					if (activeWindow && windowID === activeWindow.id) {
						activeWindow = null;
					}
				});
			}
		} catch (err) {
			console.warn('browser.windows.onRemoved.addListener failed', err);
		}
	}

	function checkEvent(event) {
		switch (event) {
			case Commands.detachToTab:
				detachedToTab();
				break;

			case Commands.detachToWindow:
				detachToWindow();
				break;

			case Commands.leaveFeedback:
				leaveFeedback();
				break;

			case Commands.openTutorial:
				browser.tabs.create({
					url: 'home/home.html',
					active: true,
				});
				break;

			case Commands.openGithub:
				browser.tabs.create({
					url: 'https://github.com/ReDEnergy/SessionSync',
					active: true,
				});
				break;
		}
	}

	function leaveFeedback() {
		browser.tabs.create({
			url: 'mailto:gabriel.ivanica@gmail.com?Subject=[Session-Sync]%20User%20feedback'
		}).then(function (tab) {
			browser.tabs.remove(tab.id);
		});
	}

	function detachToWindow() {
		if (activeWindow) {
			browser.windows.update(activeWindow.id, {
				focused: true
			});
			return;
		}

		browser.storage.local.get([windowInfoKey]).then(function (sizeInfo) {
			var windowInfo = sizeInfo[windowInfoKey];
			if (windowInfo == undefined) {
				windowInfo = defaultWindowProperties;
			}

			browser.windows.create({
				width: windowInfo.width,
				height: windowInfo.height,
				url: 'entrypoints/popup/index.html',
				type: 'panel'
			}).then(function (newWindow) {
				activeWindow = newWindow;
			});
		});
	}

	function detachedToTab() {
		browser.tabs.query({
			title: 'Session Sync',
			windowId: browser.windows.WINDOW_ID_CURRENT
		})
			.then(function (tabs) {
				if (tabs.length > 0) {
					for (let i in tabs) {
						if (tabs[i].url.indexOf('moz-extension') == 0) {
							browser.tabs.update(tabs[i].id, {
								active: true
							});
							return;
						}
					}
				}

				browser.tabs.create({
					url: 'entrypoints/popup/index.html'
				});
			});
	}

	return {
		checkEvent: checkEvent,
		init: init
	};
})();

export { SessionSync };

export const WindowUtils = (function () {
	var windowMargins = {
		left: -8,
		top: 12
	};

	function resizeAndCenter(window, windowProperties) {
		var screen = {
			width: window.width + 2 * windowMargins.left,
			height: window.height + 2 * windowMargins.top
		};

		windowProperties.left = window.left + (((screen.width - windowProperties.width) / 2) | 0) + windowMargins.left;
		windowProperties.top = window.top + (((screen.height - windowProperties.height) / 2) | 0) + windowMargins.top;

		browser.windows.update(window.id, windowProperties);
	}

	function centerWindow(window) {
		var properties = {
			width: window.width,
			height: window.height,
			state: window.state,
		};

		browser.windows.update(window.id, {
			state: 'maximized'
		}).then(function (window) {
			resizeAndCenter(window, properties);
		});
	}

	return {
		centerWindow: centerWindow
	};

})();

// ------------------------------------------------------------------------
// App Init logic (to be called in background entry point)
export function initBackground() {
	// Initialize SessionSync internal listeners
	SessionSync.init();

	try {
		if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.onInstalled) {
			browser.runtime.onInstalled.addListener(function (startInfo) {
				if (startInfo.reason == 'install') {
					SessionSync.checkEvent(Commands.openTutorial);
				}
			});
		}
	} catch (err) {
		console.warn('browser.runtime.onInstalled.addListener failed', err);
	}

	try {
		if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.onMessage) {
			browser.runtime.onMessage.addListener(function (message, sender, sendResponse) {
				if (message && message.event) {
					SessionSync.checkEvent(message.event);
				}
			});
		}
	} catch (err) {
		console.warn('browser.runtime.onMessage.addListener failed', err);
	}

	try {
		if (typeof browser !== 'undefined' && browser.commands && browser.commands.onCommand) {
			browser.commands.onCommand.addListener(function (command) {
				SessionSync.checkEvent(command);
			});
		}
	} catch (err) {
		console.warn('browser.commands.onCommand.addListener failed', err);
	}

	// Delete previous undo events
	if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
		browser.storage.local.set({ 'undo.events': [] });
		browser.storage.local.set({ 'trashcan.hide': true });
		browser.storage.local.set({ 'trashcan.hide-count': 0 });
		browser.storage.local.set({ 'session.active.filter': '' });
		browser.storage.local.set({ 'session.selected': null });
		browser.storage.local.set({ 'session.history.selected': null });
	}
}
