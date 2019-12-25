define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	const { AppConfig } = require('../config');
	const { BookmarkManager } = require('./bookmarks');
	const { WindowEvents, GlobalEvents } = require('../utils/global-events');
	const { LimitCounter } = require('../utils/general');
	const { SessionSyncModel } = require ('../components/session-sync-model');

	// *****************************************************************************

	var SessionManager = (function SessionManager() {

		var trackTabs = true;

		var getCurrentTab = function getCurrentTab(callback)
		{
			browser.tabs.query({active: true, windowId: browser.windows.WINDOW_ID_CURRENT})
			.then(function(tabs) {
				callback(tabs[0]);
			});
		};

		var getWindowTab = function getWindowTab(tabIndex, windowId, callback)
		{
			browser.tabs.query({index: tabIndex, windowId: windowId})
			.then(function(tabs) {
				callback(tabs[0]);
			});
		};

		var getCurrentWindow = function getCurrentWindow(callback) {
			browser.windows.getCurrent({ populate: true })
			.then(callback);
		};

		var getAllWindows = function getAllWindows(callback) {
			browser.windows.getAll({
				populate: true,
				windowTypes: ['normal']
			})
			.then(callback);
		};

		var tabTracking = function tabTracking()
		{
			return trackTabs;
		};

		var moveTab = function moveTab(tabID, newIndex, windowID)
		{
			trackTabs = false;
			browser.tabs.move([tabID], {
				index: newIndex,
				windowId: windowID
			}).then(function() {
				GlobalEvents.emit('UpdateCurrentSession');
				trackTabs = true;
			}, function onError() {
				trackTabs = true;
			});
		};

		var activateTab = function activateTab(tabID)
		{
			browser.tabs.update(tabID, {
				active: true
			});
		};

		var closeTab = function closeTab(tabID)
		{
			browser.tabs.remove(tabID);
		};

		var activateWindow = function activateWindow(windowID)
		{
			browser.windows.update(windowID, {
				focused: true
			});
		};

		var saveActiveSession = function saveActiveSession()
		{
			getCurrentWindow(function(mozWindow) {

				var sessionID = 0;
				var sessionCount = 0;

				function updateOnSave()
				{
					WindowEvents.emit(document, 'SetPromiseSession', {
						update: true,
						sessionID: sessionID,
						edit: sessionCount == 1,
					});
				}

				// Get non-private windows
				if (mozWindow.incognito == true || AppConfig.get('session.save').allWindows == false)
				{
					var sessionTitle = (new Date()).toLocaleString();
					saveWindowSession({
						title: sessionTitle,
						tabs: mozWindow.tabs
					}, function onSuccess(folder) {
						sessionID = folder.id;
						sessionCount++;
						updateOnSave();
					});
				}
				else
				{
					// Get all non private windows
					getAllWindows(function(windows) {
						// Save windows as separate sessions
						var date = new Date();

						windows.forEach(function (mozWindow) {
							if (mozWindow.incognito == false) {
								sessionCount++;
							}
						});

						var windowID = 0;
						var updateEvent = new LimitCounter(sessionCount, updateOnSave);

						windows.forEach(function (mozWindow) {
							if (mozWindow.incognito == false)
							{
								windowID++;
								let sessionTitle = date.toLocaleString() + ((sessionCount > 1) ? (' #' + windowID) : '');
								saveWindowSession({
									title: sessionTitle,
									tabs: mozWindow.tabs,
								}, function(folder) {
									sessionID = folder.id;
									updateEvent.advance();
								});
							}
						});
					});
				}
			});
		};

		var mergeSessions = function mergeSessions(sessionID)
		{
			// Exclude all pages that are already saved
			getCurrentWindow(function (mozWindow) {

				var toSave = {};

				mozWindow.tabs.forEach(tab => {
					let url = tab.url;
					toSave[url] = tab;
				});

				// Exclude all pages that are already saved
				BookmarkManager.getFolderBookmarks(sessionID, function(bookmarks) {
					bookmarks.forEach(function (bookmark) {
						delete toSave[bookmark.url];
					});

					var updateEvent = new LimitCounter(Object.keys(toSave).length, function () {
						WindowEvents.emit(document, 'ViewSession', sessionID);
					});

					// TODO - reverse saving order
					var savingList = [];
					for (let key in toSave)
					{
						let tab = toSave[key];
						savingList.push(tab);
					}

					for (let i = savingList.length - 1; i >= 0; i--)
					{
						var tab = savingList[i];
						BookmarkManager.createBookmarkFromTab(tab, sessionID)
						.then(updateEvent.advance, updateEvent.advance);
					}
				});
			});
		};

		var overwriteSession = function overwriteSession(sessionID)
		{
			var toRemove = [];

			BookmarkManager.getFolderBookmarks(sessionID, function(bookmarks) {

				// Remove all bookmarks from the current session
				bookmarks.forEach(function (bookmark) {
					toRemove.push(bookmark.id);
				});

				SessionSyncModel.deleteBookmarkList(toRemove, sessionID, function () {
					getCurrentWindow(function(mozWindow) {

						var updateFinish = new LimitCounter(mozWindow.tabs.length, function () {
							WindowEvents.emit(document, 'ViewSession', sessionID);
						});

						// TODO - add option to discard duplicate tabs and or pinned tabs

						for (let i = mozWindow.tabs.length - 1; i >= 0; i--)
						{
							var tab = mozWindow.tabs[i];
							BookmarkManager.createBookmarkFromTab(tab, sessionID)
							.then(updateFinish.advance, updateFinish.advance);
						}
					});
				});
			});
		};

		var saveHistorySession = function saveHistorySession(sessionInfo)
		{
			var windowCount = sessionInfo.windows.length;

			var windowID = 0;

			function onSave(bookmark) {
				WindowEvents.emit(document, 'SetPromiseSession', {
					sessionID: bookmark.id,
					edit: false,
					update: true
				});
			}

			// save all history windows
			for (var key in sessionInfo.windows)
			{
				var date = new Date(sessionInfo.lastSave);
				var sessionTitle = date.toLocaleString() + ((windowCount > 1) ? (' #' + windowID) : '');
				windowID++;

				saveWindowSession({
					title: sessionTitle,
					tabs: sessionInfo.windows[key].tabs
				}, onSave);
			}
		};

		var saveWindowSession = function saveWindowSession(sessionInfo, callback)
		{
			BookmarkManager.createBookmark({
				title: sessionInfo.title,
				parentId: AppConfig.get('storageID')
			})
			.then(function (folder) {

				var trackSaving = new LimitCounter(sessionInfo.tabs.length, function () {
					callback(folder);
				});

				// TODO - add option to discard duplicate tabs

				var savePinned = AppConfig.get('session.save').pinned;

				for (let i = sessionInfo.tabs.length - 1; i >= 0; i--)
				{
					let tab = sessionInfo.tabs[i];
					if (tab.pinned && savePinned == false)
					{
						trackSaving.offsetLimit(-1);
					}
					else
					{
						BookmarkManager.createBookmarkFromTab(tab, folder.id)
						.then(trackSaving.advance, trackSaving.advance);
					}
				}
			});
		};

		var restoreSession = function restoreSession(folderID)
		{
			browser.runtime.sendMessage({event: 'restore-session', bookmarkID: folderID});
		};

		var restoreNewWindow = function restoreNewWindow(folderID)
		{
			var options = {
				newWindow: true
			};
			browser.runtime.sendMessage({event: 'restore-session', bookmarkID: folderID, options: options});
		};

		var restoreAdvanced = function restoreAdvanced(folderID, options)
		{
			browser.runtime.sendMessage({event: 'restore-session', bookmarkID: folderID, options: options});
		};

		var replaceSession = function replaceSession(folderID)
		{
			getCurrentWindow(function(mozWindow) {
				var options = {
					newWindow: true,
					closeWindow: mozWindow.id,
				};
				restoreAdvanced(folderID, options);
			});
		};

		var replaceSessionAll = function replaceSessionAll(folderID)
		{
			var options = {
				newWindow: true,
				closeAll: true,
			};
			restoreAdvanced(folderID, options);
		};

		var loadBookmarksNewWindow = function loadBookmarksNewWindow(windows)
		{
			browser.runtime.sendMessage({event: 'restore-sessions', windows: windows });
		};

		var fixLazySession = function fixLazySession(folderID)
		{
			browser.runtime.sendMessage({event: 'fix-lazy-session', bookmarkID: folderID });
		};

		var createSeparator = function createSeparator(folderID) {
			browser.bookmarks.get(folderID)
			.then(function (marks) {
				BookmarkManager.createBookmark({
					index: marks[0].index + 1,
					type: 'separator',
					parentId: AppConfig.get('storageID')
				})
				.then(function success(separator) {
					WindowEvents.emit(document, 'SetPromiseSession', { sessionID: separator.id, update: true });
				});
			}, function onError(msg) {
				console.log(msg);
			});
		};

		var createSession = function createSession(title, index)
		{
			BookmarkManager.createBookmark({
				index: index,
				title: title,
				parentId: AppConfig.get('storageID')
			})
			.then(function success(session) {
				WindowEvents.emit(document, 'SetPromiseSession', {
					sessionID: session.id,
					edit: true,
					update: true
				});
			}, function error() {
			});
		};

		var createNewSession = function createNewSession(folderID) {
			var sessionTitle = (new Date()).toLocaleString();
			if (folderID)
			{
				browser.bookmarks.get(folderID)
				.then(function (marks) {
					createSession(sessionTitle, marks[0].index + 1);
				});
			}
			else
			{
				createSession(sessionTitle);
			}
		};

		// Events
		GlobalEvents.on('CreateNewSession', function(name) {
			var title = name ? name : (new Date()).toLocaleString();
			createSession(title);
		});

		// Events
		GlobalEvents.on('management.close-tab', function(tabID) {
			trackTabs = false;
			browser.tabs.remove(tabID)
			.then(function () {
				GlobalEvents.emit('UpdateCurrentSession');
				trackTabs = true;
			});
		});

		// Public API
		return {
			moveTab: moveTab,
			closeTab: closeTab,
			activateTab: activateTab,
			tabTracking: tabTracking,
			activateWindow: activateWindow,
			getWindowTab: getWindowTab,
			getCurrentTab: getCurrentTab,
			getCurrentWindow: getCurrentWindow,
			getAllWindows: getAllWindows,
			restoreSession: restoreSession,
			replaceSession: replaceSession,
			restoreAdvanced: restoreAdvanced,
			replaceSessionAll: replaceSessionAll,
			fixLazySession: fixLazySession,
			restoreNewWindow: restoreNewWindow,
			loadBookmarksNewWindow: loadBookmarksNewWindow,
			mergeSessions: mergeSessions,
			overwriteSession: overwriteSession,
			saveActiveSession: saveActiveSession,
			createSeparator: createSeparator,
			createNewSession: createNewSession,
			saveHistorySession: saveHistorySession,
		};

	})();


	// *****************************************************************************
	// Public API
	exports.SessionManager = SessionManager;
});