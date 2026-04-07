'use strict';

import { FaviconService } from './favicon-service';

export const SessionManagement = (function SessionManagement() {
	var lazyLoadingKey = 'restore.lazy.loading';
	var lazyLoading = false;
	var windowsTabsToKill = [];

	var reverseOrderKey = 'restore.reverse.order';
	var reverseOrder = false;

	const containerTag = 'container';

	function getTabInfo(url) {
		return {
			url: url
		};
	}

	// Container suffix helpers — canonical source: data/scripts/session/bookmarks.js
	var containerSuffix = {
		regex: new RegExp('^(.*) \\[' + containerTag + ':([^\\]]+)\\]$'),
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

	function createTab(options, info, onSuccess, onError) {
		if (typeof browser === 'undefined' || !browser.tabs) return;

		var tryCreate = function (withContainer) {
			var tabOptions = Object.assign({}, options);
			if (withContainer && info.container) {
				tabOptions.cookieStoreId = info.container;
			}
			return browser.tabs.create(tabOptions).then(
				function (tabInfo) {
					if (info.discard) {
						browser.tabs.discard(tabInfo.id);
					}
					if (onSuccess) onSuccess(tabInfo);
				},
				function (err) {
					if (withContainer) {
						// Container not available — retry without it
						tryCreate(false);
					} else {
						if (onError) onError(err);
						else console.log('createTab error:', err);
					}
				}
			);
		};
		tryCreate(info.container != null);
	}

	var setLazyLoading = function setLazyLoading(state) {
		if (typeof browser === 'undefined' || !browser.tabs) return;
		lazyLoading = state;
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
				createTab(options, { container: cookieStoreId }, checkFavicon);
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
						const parsed = parseContainerFromTitle(bookmark.title);
						createTab(
							{
								url: bookmark.url,
								active: false,
								discard: lazyLoading,
							},
							{
								container: parsed.cookieStoreId
							},
							function (tabInfo) { FaviconService.checkTabFaviconSaved(tabInfo); }
						);
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
							const parsed = parseContainerFromTitle(bookmark.title);
							createTab(
								{
									url: bookmark.url,
									pinned: bookmark.pinned,
									windowId: windowID,
								},
								{
									discard: lazyLoading,
									container: parsed.cookieStoreId
								},
								function (tabInfo) { FaviconService.checkTabFaviconSaved(tabInfo); }
							);
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

	// ************************************************************************
	// Events

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
						delete windowsTabsToKill[tab.windowId];
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
