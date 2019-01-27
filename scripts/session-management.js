'use strict';

var SessionManagement = (function SessionManagement()
{
	var lazyLoadingKey = 'restore.lazy.loading';
	var lazyLoadingUrl = browser.extension.getURL('data/lazy/lazy.html');
	var lazyLoading = false;
	var windowsTabsToKill = [];

	var reverseOrderKey = 'restore.reverse.order';
	var reverseOrder = false;

	function getLazyLoadingParameters(url)
	{
		let paramater = {};
		let paras = url.split('?')[1].split('&');
		for (let p of paras) {
			paramater[p.split('=')[0]] = decodeURIComponent(p.split('=')[1]);
		}
		return paramater;
	}

	function getTabInfo(url)
	{
		if (url.startsWith(lazyLoadingUrl))
		{
			var info = getLazyLoadingParameters(url);
			info.lazyLoading = true;
			return info;
		}
		return {
			url: url
		};
	}

	var setLazyLoading = function setLazyLoading(state)
	{
		lazyLoading = state;
		browser.tabs.onActivated.removeListener(onLazyTabActivated);
		if (state)
		{
			browser.tabs.onActivated.addListener(onLazyTabActivated);
		}
	};

	var initConfig = function initConfig()
	{
		browser.storage.local.get(lazyLoadingKey)
		.then(function (obj) {
			setLazyLoading(obj[lazyLoadingKey]);
		});

		browser.storage.local.get(reverseOrderKey)
		.then(function (obj) {
			reverseOrder = (obj[reverseOrderKey] == true);
		});
	};

	var openTab = function openTab(options)
	{
		var checkFavicon = options.favicon === true ? FaviconService.checkTabFaviconSaved : () => {};
		delete options.favicon;

		var mode = options.mode;
		delete options.mode;

		switch (mode)
		{
			case 'newTab': {
				browser.tabs.create(options).then(checkFavicon);
				break;
			}

			case 'newWindow': {
				browser.windows.create(options).then(function (windowInfo) {
					checkFavicon(windowInfo.tabs[0]);
				});
				break;
			}

			case 'activeTab': {
				browser.tabs.query({active: true, windowId: browser.windows.WINDOW_ID_CURRENT})
				.then(tabs => browser.tabs.get(tabs[0].id))
				.then(tab => {
					browser.tabs.update(tab.id, options).then(checkFavicon);
				});
				break;
			}

			default:
				break;
		}
	};

	var createLazyTab = function createLazyTab(bookmark)
	{
		let title = 'data/lazy/lazy.html' +
		'?state=redirect' +
		'&title=' + encodeURIComponent(bookmark.title) +
		'&url=' + encodeURIComponent(bookmark.url);

		if (bookmark.favIconUrl) {
			title += '&favIconUrl=' + encodeURIComponent(bookmark.favIconUrl);
		}

		browser.tabs.create({
			url: title,
			active: false,
			pinned: bookmark.pinned,
			windowId: bookmark.windowID,
		})
		.then(
			function success() {
			},
			function error() {
				browser.tabs.create({
					url: title,
					active: false,
					pinned: bookmark.pinned,
					windowId: bookmark.windowID,
				})
				.then(function (tab) {
					browser.tabs.update([tab.id], {
						title: bookmark.title,
					});
				});
			}
		);
	};

	var openLazyTab = function openLazyTab(bookmark)
	{
		if (bookmark.favIconUrl) {
			createLazyTab(bookmark);
		}
		else
		{
			FaviconService.getFaviconUrl(bookmark.url, function (favIconUrl) {
				bookmark.favIconUrl = favIconUrl;
				createLazyTab(bookmark);
			});
		}
	};

	var checkReverseOrder = function checkReverseOrder(bookmarks)
	{
		if (reverseOrder === true)
		{
			bookmarks = bookmarks.reverse();
		}
	};

	var restoreSession = function restoreSession(folderID, newWindow)
	{
		browser.bookmarks.getChildren(folderID)
		.then(function (bookmarks) {

			if (newWindow)
			{
				restoreSessions([bookmarks]);
			}
			else
			{
				checkReverseOrder(bookmarks);
				bookmarks.forEach(function (bookmark) {

					if (lazyLoading)
					{
						openLazyTab(bookmark);
					}
					else
					{
						browser.tabs.create({
							url: bookmark.url,
							active: false,
						})
						.then(function(tabInfo) {
							FaviconService.checkTabFaviconSaved(tabInfo);
						});
					}
				});
			}
		},
		function fail() {
			console.log('Error getting bookmarks from folder ID: ', folderID);
		});
	};

	var restoreSessions = function restoreSessions(windows)
	{
		windows.forEach (function (bookmarks) {
			if (bookmarks.length > 0)
			{
				browser.windows.create({})
				.then(function(mozWindow) {

					var windowID = mozWindow.id;
					windowsTabsToKill[windowID] = mozWindow.tabs[0].id;

					checkReverseOrder(bookmarks);
					bookmarks.forEach(function (bookmark) {
						if (lazyLoading)
						{
							bookmark.windowID = windowID;
							openLazyTab(bookmark);
						}
						else
						{
							browser.tabs.create({
								url: bookmark.url,
								pinned: bookmark.pinned,
								windowId: windowID,
							})
							.then(function(tabInfo) {
								FaviconService.checkTabFaviconSaved(tabInfo);
							});
						}
					});
				});
			}
		});
	};

	var restoreLazyTab = function restoreLazyTab(tab, url)
	{
		let redirectInfo = getLazyLoadingParameters(url ? url : tab.url);
		if (redirectInfo.state == 'redirect')
		{
			browser.tabs.update(tab.id, {
				url: redirectInfo.url
			})
			.then(function(tabInfo) {
				tabInfo.url = redirectInfo.url;
				FaviconService.checkTabFaviconSaved(tabInfo);
			});
		}
	};

	// ************************************************************************
	// Events

	var onLazyTabActivated = function onLazyTabActivated(tab)
	{
		if (lazyLoading)
		{
			browser.tabs.get(tab.tabId).then(function (activeTab) {
				if (activeTab.url.startsWith('moz-extension'))
				{
					restoreLazyTab(activeTab);
				}
				else if (activeTab.status == 'loading') {
					restoreLazyTab(activeTab, activeTab.title);
				}
			});
		}
	};

	browser.runtime.onMessage.addListener(function (message) {
		switch (message.event)
		{
			case 'restore-session':
				restoreSession(message.bookmarkID, message.inNewWindow);
				break;

			case 'restore-sessions':
				restoreSessions(message.windows);
				break;

			case 'save-favicon':
				FaviconService.checkTabFaviconSaved(message.tab, false);
				break;

			case 'open-tab':
				openTab(message.options);
				break;

		}
	});

	browser.storage.onChanged.addListener(function onChange(object) {
		if (object[lazyLoadingKey]) {
			setLazyLoading(object[lazyLoadingKey].newValue);
		}
		if (object[reverseOrderKey]) {
			reverseOrder = object[reverseOrderKey].newValue == true;
		}
	});

	browser.tabs.onCreated.addListener(function (tab) {
		var killTabID = windowsTabsToKill[tab.windowId];
		if (killTabID != undefined && killTabID != tab.id)
		{
			browser.tabs.remove(killTabID);
			windowsTabsToKill[tab.windowId] = undefined;
			restoreLazyTab(tab, tab.title);
		}
	});

	// ************************************************************************
	// Init

	initConfig();

	// ************************************************************************
	// Public API

	return {
		getTabInfo : getTabInfo
	};

})();
