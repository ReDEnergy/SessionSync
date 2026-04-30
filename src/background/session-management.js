'use strict';

import { FaviconService } from './favicon-service';
import { BookmarkProperties } from '../common/bookmark-properties';

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
				async function (tabInfo) {
					if (info.discard) {
						browser.tabs.discard(tabInfo.id);
					}

					if (info.group) {
						setTabsGroup([tabInfo.id], info.group.title, info.group.color);
					}

					if (onSuccess) onSuccess(tabInfo);
				},
				function (err) {
					if (withContainer) {
						// Container not available — retry without it
						tryCreate(false);
					} else {
						if (onError) onError(err);
						else console.error('createTab error:', err);
					}
				}
			);
		};

		tryCreate(info.container != null);
	}

	var createGroup = async function createGroup(tabs, title, color) {
		const groupId = await browser.tabs.group({ tabIds: tabs });
		await browser.tabGroups.update(groupId, { title, color });
	};

	var setTabsGroup = async function setTabsGroup(tabs, title, color) {
		const group = await browser.tabGroups.query({ title: title, color: color });
		let groupId = null;
		if (group.length > 0) {
			await browser.tabs.group({ tabIds: tabs, groupId: group[0].id });
		} else {
			groupId = await browser.tabs.group({ tabIds: tabs });
			await browser.tabGroups.update(groupId, { title, color });
		}

		if (groupId) {
			browser.tabGroups.update(groupId, { collapsed: false });
		}
	};

	var setLazyLoading = function setLazyLoading(state) {
		if (typeof browser === 'undefined' || !browser.tabs) return;
		lazyLoading = state;
	};

	var initConfig = function initConfig() {
		if (typeof browser === 'undefined' || !browser.storage || !browser.storage.local) return;

		browser.storage.local.get(lazyLoadingKey).then(function (obj) {
			setLazyLoading(obj[lazyLoadingKey]);
		});

		browser.storage.local.get(reverseOrderKey).then(function (obj) {
			reverseOrder = obj[reverseOrderKey] == true;
		});
	};

	var openTab = async function openTab(options, info) {
		var checkFavicon = info.favicon === true ? FaviconService.checkTabFaviconSaved : () => {};

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

					if (info.group) {
						createGroup([tab.id], info.group.title, info.group.color);
					}

					checkFavicon(tab);
				});
				break;
			}

			case 'activeTab': {
				const tabs = await browser.tabs.query({ active: true, windowId: browser.windows.WINDOW_ID_CURRENT });
				const tab = await browser.tabs.get(tabs[0].id);

				if (
					(options.cookieStoreId == undefined && tab.cookieStoreId == BookmarkProperties.defaultContainer) ||
					tab.cookieStoreId === options.cookieStoreId
				) {
					delete options.cookieStoreId;
					browser.tabs.update(tab.id, options).then(checkFavicon);
				} else {
					createTab(options, info, checkFavicon);
				}
				break;
			}

			default:
				break;
		}
	};

	var checkReverseOrder = function checkReverseOrder(bookmarks) {
		if (reverseOrder === true) {
			bookmarks.reverse();
		}
	};

	// After all tabs are created, group them according to their saved group metadata.
	// Groups are keyed by their title+color so that separate groups with the same
	// name are treated as one group within the restored window.
	async function assignTabGroups(pendingTabs, windowId) {
		if (typeof browser === 'undefined' || !browser.tabGroups) return;

		// Collect unique groups keyed by "title|color"
		const groupMap = new Map(); // key -> { title, color, tabIds[] }

		for (const { tabPromise, groupTitle, groupColor } of pendingTabs) {
			if (!groupTitle && !groupColor) continue;
			const key = (groupTitle || '') + '|' + (groupColor || 'grey');
			if (!groupMap.has(key)) {
				groupMap.set(key, { title: groupTitle || '', color: groupColor || 'grey', tabIds: [] });
			}
			try {
				const tabInfo = await tabPromise;
				if (tabInfo) {
					groupMap.get(key).tabIds.push(tabInfo.id);
				}
			} catch (e) {
				// Tab creation failed; skip
			}
		}

		for (const { title, color, tabIds } of groupMap.values()) {
			if (tabIds.length === 0) continue;
			try {
				const groupId = await browser.tabs.group({ tabIds, createProperties: { windowId } });
				await browser.tabGroups.update(groupId, { title, color });
			} catch (e) {
				console.error('Error assigning tab group during restore:', e);
			}
		}
	}

	var createTabsFromBookmarks = async function createTabsFromBookmarks(bookmarks, windowId) {
		checkReverseOrder(bookmarks);

		const pendingTabs = [];

		bookmarks.forEach(function (bookmark) {
			const info = BookmarkProperties.parseTitle(bookmark.title);

			// Wrap createTab in a Promise so we can await the created tab ID
			const tabPromise = new Promise((resolve) => {
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
					(tabInfo) => {
						FaviconService.checkTabFaviconSaved(tabInfo);
						resolve(tabInfo);
					},
					() => resolve(null)
				);
			});

			if (info.properties.group) {
				pendingTabs.push({
					tabPromise,
					groupTitle: info.properties.group.title,
					groupColor: info.properties.group.color
				});
			}
		});

		await assignTabGroups(pendingTabs, windowId);
	};

	var createTabsFromHistoryTabs = async function createTabsFromHistoryTabs(tabs, windowId) {
		checkReverseOrder(tabs);

		const pendingTabs = [];

		tabs.forEach(function (tab) {
			const tabPromise = new Promise((resolve) => {
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
					},
					(tabInfo) => resolve(tabInfo),
					() => resolve(null)
				);
			});

			pendingTabs.push({
				tabPromise,
				groupTitle: tab.groupTitle,
				groupColor: tab.groupColor
			});
		});

		await assignTabGroups(pendingTabs, windowId);
	};

	var restoreSession = function restoreSession(folderID, options) {
		if (typeof browser === 'undefined' || !browser.bookmarks) return;

		browser.bookmarks.getChildren(folderID).then(
			function (bookmarks) {
				if (options && options.newWindow) {
					createSessionWindow((windowID) => createTabsFromBookmarks(bookmarks, windowID)).then(
						function (createdWindow) {
							if (createdWindow) {
								if (options.closeAll) {
									browser.windows
										.getAll({
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
						},
						function onError() {
							console.error('strage error');
						}
					);
				} else {
					createTabsFromBookmarks(bookmarks, browser.windows.WINDOW_ID_CURRENT);
				}
			},
			function fail() {
				console.error('Error getting bookmarks from folder ID: ', folderID);
			}
		);
	};

	var createSessionWindow = function createSessionWindow(callback) {
		var action = new Promise((resolve, reject) => {
			if (typeof browser === 'undefined' || !browser.windows) return reject();

			browser.windows.create({}).then(function (mozWindow) {
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
