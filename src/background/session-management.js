'use strict';

import { FaviconService } from './favicon-service';
import { BookmarkProperties } from '../common/bookmark-properties';
import { FirefoxContainers } from '../scripts/services/firefox-containers';

export const SessionManagement = (function SessionManagement() {
	var lazyLoadingKey = 'restore.lazy.loading';
	var lazyLoading = false;
	var windowsTabsToKill = [];

	var reverseOrderKey = 'restore.reverse.order';
	var reverseOrder = false;

	function getTabInfo(url) {
		return {
			url: url
		};
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

	var openTab = function openTab(options, info) {
		var checkFavicon = options.favicon === true ? FaviconService.checkTabFaviconSaved : () => { };
		delete options.favicon;

		switch (info.mode) {
			case 'newTab': {
				createTab(options, info, checkFavicon);
				break;
			}

			case 'newWindow': {
				const windowOptions = {
					url: options.url,
					cookieStoreId: options.cookieStoreId
				};

				browser.windows.create(windowOptions).then(function (windowInfo) {
					const tab = windowInfo.tabs[0];
					if (options.pinned) {
						browser.tabs.update(tab.id, { pinned: true });
					}
					checkFavicon(tab);
				});
				break;
			}

			case 'activeTab': {
				browser.tabs.query({ active: true, windowId: browser.windows.WINDOW_ID_CURRENT })
					.then(tabs => browser.tabs.get(tabs[0].id))
					.then(tab => {
						if ((options.cookieStoreId == undefined && tab.cookieStoreId == FirefoxContainers.defaultContainer) ||
							(tab.cookieStoreId === options.cookieStoreId)) {
							delete options.cookieStoreId;
							browser.tabs.update(tab.id, options).then(checkFavicon);
						} else {
							browser.tabs.create({
								url: options.url,
								cookieStoreId: options.cookieStoreId
							});
						}
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

	var createTabsFromBookmarks = function createTabsFromBookmarks(bookmarks, windowId) {
		checkReverseOrder(bookmarks);
		bookmarks.forEach(function (bookmark) {
			const info = BookmarkProperties.parseTitle(bookmark.title);
			createTab(
				{
					url: bookmark.url,
					active: false,
					windowId: windowId,
					pinned: info.properties.pinned ? true : false
				},
				{
					discard: lazyLoading,
					container: info.properties.container
				},
				FaviconService.checkTabFaviconSaved
			);
		});
	};

	var createTabsFromHistoryTabs = function createTabsFromHistoryTabs(tabs, windowId) {
		checkReverseOrder(tabs);
		tabs.forEach(function (tab) {
			createTab(
				{
					url: tab.url,
					active: false,
					windowId: windowId,
					pinned: tab.pinned ? true : false
				},
				{
					discard: lazyLoading,
					container: tab.cookieStoreId
				}
			);
		});
	};

	var restoreSession = function restoreSession(folderID, options) {
		if (typeof browser === 'undefined' || !browser.bookmarks) return;

		browser.bookmarks.getChildren(folderID)
			.then(function (bookmarks) {
				if (options && options.newWindow) {
					createSessionWindow((windowID) => createTabsFromBookmarks(bookmarks, windowID))
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
					createTabsFromBookmarks(bookmarks, browser.windows.WINDOW_ID_CURRENT);
				}
			},
				function fail() {
					console.log('Error getting bookmarks from folder ID: ', folderID);
				});
	};

	var createSessionWindow = function createSessionWindow(callback) {
		var action = new Promise((resolve, reject) => {
			if (typeof browser === 'undefined' || !browser.windows) return reject();

			browser.windows.create({})
				.then(function (mozWindow) {
					resolve(mozWindow);
					var windowID = mozWindow.id;
					windowsTabsToKill[windowID] = mozWindow.tabs[0].id;
					callback(windowID);
				});
		});
		return action;
	};

	var restoreSessions = function restoreSessions(windows) {
		windows.forEach(function (bookmarks) {
			createSessionWindow((windowID) => createTabsFromBookmarks(bookmarks, windowID));
		});
	};

	var restoreHistorySession = function restoreHistorySession(windows) {
		windows.forEach(function (tabs) {
			createSessionWindow((windowID) => createTabsFromHistoryTabs(tabs, windowID));
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

						case 'restore-history-session':
							restoreHistorySession(message.windows);
							break;

						case 'save-favicon':
							FaviconService.checkTabFaviconSaved(message.tab, false);
							break;

						case 'open-tab':
							openTab(message.options, message.info);
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
