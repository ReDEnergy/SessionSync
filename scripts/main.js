// console.log(browser.runtime.getManifest());

var Commands = {
	toggleWidget: '_execute_browser_action',
	openTutorial: 'session-sync-tutorial',
	detachToTab: 'session-sync-detach-tab',
	detachToWindow: 'session-sync-detach-window',
	leaveFeedback: 'session-sync-leave-feedback',
	openGithub: 'session-sync-open-github'
};

browser.runtime.onInstalled.addListener(function (startInfo) {
	if (startInfo.reason == 'install') {
		SessionSync.checkEvent(Commands.openTutorial);
	}
});

browser.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	SessionSync.checkEvent(message.event);
});

browser.commands.onCommand.addListener(function(command) {
	SessionSync.checkEvent(command);
});

var SessionSync = (function () {

	var windowInfoKey = 'style.window.detach';
	var activeWindow = null;
	var defaultWindowProperties = {
		width: 800,
		height: 600
	};

	browser.windows.onRemoved.addListener(function (windowID) {
		if (activeWindow && windowID == activeWindow.id) {
			activeWindow = null;
		}
	});

	function checkEvent(event)
	{
		switch (event)
		{
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
					url: 'data/home/home.html',
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

	function leaveFeedback()
	{
		browser.tabs.create({
			url: 'mailto:gabriel.ivanica@gmail.com?Subject=[Session-Sync]%20User%20feedback'
		}).then(function (tab) {
			browser.tabs.remove(tab.id);
		});
	}

	function detachToWindow()
	{
		if (activeWindow) {
			browser.windows.update(activeWindow.id, {
				focused: true
			});
			return;
		}

		browser.storage.local.get([windowInfoKey]).then(function (sizeInfo) {
			var windowInfo = sizeInfo[windowInfoKey];
			if (windowInfo == undefined)
			{
				windowInfo = defaultWindowProperties;
			}

			browser.windows.create({
				width: windowInfo.width,
				height: windowInfo.height,
				// left: 0,
				// top: 0,
				url: 'data/session-sync.html',
				type: 'panel'
			}).then(function (window) {
				activeWindow = window;
				// WindowUtils.centerWindow(window);
			});
		});
	}

	function detachedToTab()
	{
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
				url: 'data/session-sync.html'
			});
		});
	}

	return {
		checkEvent: checkEvent,
	};
})();

var WindowUtils = (function ()
{
	var windowMargins = {
		left: -8,
		top: 12
	};

	function resizeAndCenter(window, windowProperties) {
		// console.log('Fullscreen', window);

		var screen = {
			width : window.width + 2 * windowMargins.left,
			height: window.height + 2 * windowMargins.top
		};

		windowProperties.left = window.left + (((screen.width - windowProperties.width) / 2) | 0) + windowMargins.left;
		windowProperties.top = window.top + (((screen.height - windowProperties.height) / 2) | 0) + windowMargins.top;

		// console.log('Properties', windowProperties, 'Screen', screen);
		browser.windows.update(window.id, windowProperties);
	}

	function centerWindow(window) {

		// console.log(window);

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
// App Init

// Delete previous undo events
browser.storage.local.set({'undo.events' : []});
browser.storage.local.set({'session.active.filter' : ''});
browser.storage.local.set({'session.selected' : null});
browser.storage.local.set({'session.history.selected' : null});
