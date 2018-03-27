// console.log(browser.runtime.getManifest());

var Commands = {
	toggleWidget: '_execute_browser_action',
	detachUI: 'session-sync-detach'
};

browser.runtime.onInstalled.addListener(function (startInfo) {
	if (startInfo.reason === 'update' || startInfo.reason === 'installed') {
		browser.tabs.create({
			url: 'data/home/home.html'
		});
	}
});

browser.runtime.onMessage.addListener(function (message) {
	if (message.event == Commands.detachUI) {
		SessionSync.openDetached();
	}
});

browser.commands.onCommand.addListener(function(command) {
	if (command == Commands.detachUI) {
		SessionSync.openDetached();
	}
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

	function openPopup()
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

	function openDetached()
	{
		var key = 'detach.window';
		browser.storage.local.get([key]).then(function (obj) {
			var windowPopup = obj[key];
			if (windowPopup) {
				openPopup();
			}
			else {
				browser.tabs.create({
					url: 'data/session-sync.html'
				});
			}
		});
	}

	return {
		openDetached : openDetached
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
browser.storage.local.set({'session.selected' : undefined});
