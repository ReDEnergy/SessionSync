'use strict';

import { FaviconService } from './favicon-service';

export const SessionManagement = (function SessionManagement() {
	var lazyLoadingKey = 'restore.lazy.loading';
	var lazyLoadingUrl = typeof browser !== 'undefined' && browser.runtime ? browser.runtime.getURL('public/lazy/lazy.html') : '';
	var lazyLoading = false;
	var windowsTabsToKill = [];

	var reverseOrderKey = 'restore.reverse.order';
	var reverseOrder = false;

	function getLazyLoadingParameters(url) {
		let paramater = {};
		let params = url.split('?');
		if (params.length > 1) {
			let paras = params[1].split('&');
			for (let p of paras) {
				paramater[p.split('=')[0]] = decodeURIComponent(p.split('=')[1]);
			}
		}
		return paramater;
	}

	function getTabInfo(url) {
		if (lazyLoadingUrl && url.startsWith(lazyLoadingUrl)) {
			var info = getLazyLoadingParameters(url);
			info.lazyLoading = true;
			return info;
		}
		return {
			url: url
		};
	}

	// Container suffix helpers — canonical source: data/scripts/session/bookmarks.js
	var containerSuffix = {
		regex: /^(.*) \[container:([^\]]+)\]$/,
	};

	// Parse a [container:<id>] suffix from a bookmark title.
	// Returns { title, cookieStoreId } — cookieStoreId is null when absent.
	function parseContainerFromTitle(rawTitle) {
		var match = rawTitle && rawTitle.match(containerSuffix.regex);
		if (match) {
			return { title: match[1], cookieStoreId: match[2] };
		}
		return { title: rawTitle, cookieStoreId: null };
	}

	// Create a tab with a cookieStoreId; silently falls back to default container
	// if the container doesn't exist or the API rejects it.
	// onError is called only if creation fails even without a container.
	function createTabWithContainer(options, cookieStoreId, onSuccess, onError) {
		if (typeof browser === 'undefined' || !browser.tabs) return;

		var tryCreate = function (withContainer) {
			var tabOptions = Object.assign({}, options);
			if (withContainer && cookieStoreId) {
				tabOptions.cookieStoreId = cookieStoreId;
			}
			return browser.tabs.create(tabOptions).then(
				function (tabInfo) {
					if (onSuccess) onSuccess(tabInfo);
				},
				function (err) {
					if (withContainer) {
						// Container not available — retry without it
						tryCreate(false);
					} else {
						if (onError) onError(err);
						else console.log('createTabWithContainer error:', err);
					}
				}
			);
		};
		tryCreate(cookieStoreId != null);
	}

	var setLazyLoading = function setLazyLoading(state) {
		if (typeof browser === 'undefined' || !browser.tabs) return;

		lazyLoading = state;
		try {
			browser.tabs.onActivated.removeListener(onLazyTabActivated);
			if (state) {
				browser.tabs.onActivated.addListener(onLazyTabActivated);
			}
		} catch (err) {
			console.warn('browser.tabs.onActivated listener update failed', err);
		}
	};

	var initConfig = function initConfig() {
		if (typeof browser === 'undefined' || !browser.storage || !browser.storage.local) return;

		browser.storage.local.get(lazyLoadingKey)
			.then(function (obj) {
				setLazyLoading(obj[lazyLoadingKey]);
			});

		browser.storage.local.get(reverseOrderKey)
			.then(function (obj) {
				reverseOrder = (obj[reverseOrderKey] == true);
			});
	};

	var openTab = function openTab(options) {
		var checkFavicon = options.favicon === true ? FaviconService.checkTabFaviconSaved : () => { };
		delete options.favicon;

		var cookieStoreId = options.cookieStoreId || null;
		delete options.cookieStoreId;

		var mode = options.mode;
		delete options.mode;

		switch (mode) {
			case 'newTab': {
				createTabWithContainer(options, cookieStoreId, checkFavicon);
				break;
			}

			case 'newWindow': {
				if (cookieStoreId) {
					options.cookieStoreId = cookieStoreId;
				}
				browser.windows.create(options).then(function (windowInfo) {
					checkFavicon(windowInfo.tabs[0]);
				});
				break;
			}

			case 'activeTab': {
				browser.tabs.query({ active: true, windowId: browser.windows.WINDOW_ID_CURRENT })
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

	var createLazyTab = function createLazyTab(bookmark) {
		if (typeof browser === 'undefined' || !browser.runtime) return;

		let title = browser.runtime.getURL('public/lazy/lazy.html') +
			'?state=redirect' +
			'&title=' + encodeURIComponent(bookmark.title) +
			'&url=' + encodeURIComponent(bookmark.url);

		if (bookmark.favIconUrl) {
			title += '&favIconUrl=' + encodeURIComponent(bookmark.favIconUrl);
		}

		var tabOptions = {
			url: title,
			active: false,
			pinned: bookmark.pinned,
			windowId: bookmark.windowID,
		};

		createTabWithContainer(tabOptions, bookmark.cookieStoreId,
			function success() { },
			function error() {
				browser.tabs.create(tabOptions)
					.then(function (tab) {
						browser.tabs.update(tab.id, {
							title: bookmark.title,
						});
					});
			}
		);
	};

	var openLazyTab = function openLazyTab(bookmark) {
		// Extract container info encoded in the title
		var parsed = parseContainerFromTitle(bookmark.title);
		bookmark.title = parsed.title;
		bookmark.cookieStoreId = parsed.cookieStoreId;

		if (bookmark.favIconUrl) {
			createLazyTab(bookmark);
		}
		else {
			FaviconService.getFaviconUrl(bookmark.url, function (favIconUrl) {
				bookmark.favIconUrl = favIconUrl;
				createLazyTab(bookmark);
			});
		}
	};

	var checkReverseOrder = function checkReverseOrder(bookmarks) {
		if (reverseOrder === true) {
			bookmarks = bookmarks.reverse();
		}
	};

	var restoreSession = function restoreSession(folderID, options) {
		if (typeof browser === 'undefined' || !browser.bookmarks) return;

		browser.bookmarks.getChildren(folderID)
			.then(function (bookmarks) {
				if (options && options.newWindow) {
					createSessionWindow(bookmarks)
						.then(function (createdWindow) {
							if (createdWindow) {
								if (options.closeAll) {
									browser.windows.getAll({
										populate: true,
										windowTypes: ['normal']
									})
										.then(function (windows) {
											windows.forEach(function (mozWidnow) {
												if (mozWidnow.id != createdWindow.id) {
													browser.windows.remove(mozWidnow.id);
												}
											});
										});
								}

								if (options.closeWindow) {
									browser.windows.remove(options.closeWindow);
								}
							}
						}, function onError() {
							console.log('strage error');
						});
				}
				else {
					checkReverseOrder(bookmarks);
					bookmarks.forEach(function (bookmark) {

						if (lazyLoading) {
							openLazyTab(bookmark);
						}
						else {
							var parsed = parseContainerFromTitle(bookmark.title);
							createTabWithContainer(
								{ url: bookmark.url, active: false },
								parsed.cookieStoreId,
								function (tabInfo) { FaviconService.checkTabFaviconSaved(tabInfo); }
							);
						}
					});
				}
			},
				function fail() {
					console.log('Error getting bookmarks from folder ID: ', folderID);
				});
	};

	var createSessionWindow = function createSessionWindow(bookmarks) {
		var action = new Promise((resolve, reject) => {
			if (typeof browser === 'undefined' || !browser.windows) return reject();

			if (bookmarks.length > 0) {
				browser.windows.create({})
					.then(function (mozWindow) {
						resolve(mozWindow);
						var windowID = mozWindow.id;
						windowsTabsToKill[windowID] = mozWindow.tabs[0].id;

						checkReverseOrder(bookmarks);
						bookmarks.forEach(function (bookmark) {
							if (lazyLoading) {
								bookmark.windowID = windowID;
								openLazyTab(bookmark);
							}
							else {
								var parsed = parseContainerFromTitle(bookmark.title);
								createTabWithContainer(
									{ url: bookmark.url, pinned: bookmark.pinned, windowId: windowID },
									parsed.cookieStoreId,
									function (tabInfo) { FaviconService.checkTabFaviconSaved(tabInfo); }
								);
							}
						});
					});
			}
			else {
				reject();
			}
		});
		return action;
	};

	var restoreSessions = function restoreSessions(windows) {
		windows.forEach(function (bookmarks) {
			createSessionWindow(bookmarks);
		});
	};

	var restoreLazyTab = function restoreLazyTab(tab, url) {
		if (typeof browser === 'undefined' || !browser.tabs) return;

		let redirectInfo = getLazyLoadingParameters(url ? url : tab.url);
		if (redirectInfo.state == 'redirect') {
			browser.tabs.update(tab.id, {
				url: redirectInfo.url
			})
				.then(function (tabInfo) {
					tabInfo.url = redirectInfo.url;
					FaviconService.checkTabFaviconSaved(tabInfo);
				});
		}
	};

	// ************************************************************************
	// Events

	var onLazyTabActivated = function onLazyTabActivated(tab) {
		if (lazyLoading && typeof browser !== 'undefined' && browser.tabs) {
			browser.tabs.get(tab.tabId).then(function (activeTab) {
				if (activeTab.url.startsWith('moz-extension')) {
					restoreLazyTab(activeTab);
				}
				else if (activeTab.status == 'loading') {
					restoreLazyTab(activeTab, activeTab.title);
				}
			});
		}
	};

	var fixLazySession = function fixLazySession(folderID) {
		if (typeof browser === 'undefined' || !browser.bookmarks) return;

		var result = browser.bookmarks.getChildren(folderID);
		result.then(function (bookmarks) {
			bookmarks.forEach(function (bookmark) {
				if (bookmark.url.startsWith('moz-extension')) {
					let redirectInfo = getLazyLoadingParameters(bookmark.url);
					if (redirectInfo.url != undefined) {
						browser.bookmarks.update(bookmark.id, {
							url: redirectInfo.url
						});
					}
				}
			});
		}, function fail() {
			console.log('Error getting bookmarks from folder ID: ', folderID);
		});
	};

	function init() {
		if (typeof browser === 'undefined') return;

		try {
			if (browser.runtime && browser.runtime.onMessage) {
				browser.runtime.onMessage.addListener(function (message) {
					switch (message.event) {
						case 'restore-session':
							restoreSession(message.bookmarkID, message.options);
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

						case 'fix-lazy-session':
							fixLazySession(message.bookmarkID);
							break;

					}
				});
			}
		} catch (err) {
			console.warn('browser.runtime.onMessage.addListener failed in session-management', err);
		}

		try {
			if (browser.storage && browser.storage.onChanged) {
				browser.storage.onChanged.addListener(function onChange(object) {
					if (object[lazyLoadingKey]) {
						setLazyLoading(object[lazyLoadingKey].newValue);
					}
					if (object[reverseOrderKey]) {
						reverseOrder = object[reverseOrderKey].newValue == true;
					}
				});
			}
		} catch (err) {
			console.warn('browser.storage.onChanged.addListener failed in session-management', err);
		}

		try {
			if (browser.tabs && browser.tabs.onCreated) {
				browser.tabs.onCreated.addListener(function (tab) {
					var killTabID = windowsTabsToKill[tab.windowId];
					if (killTabID != undefined && killTabID != tab.id) {
						browser.tabs.remove(killTabID);
						windowsTabsToKill[tab.windowId] = undefined;
						restoreLazyTab(tab, tab.title);
					}
				});
			}
		} catch (err) {
			console.warn('browser.tabs.onCreated.addListener failed in session-management', err);
		}

		initConfig();
	}

	// ************************************************************************
	// Public API

	return {
		getTabInfo: getTabInfo,
		init: init
	};

})();
