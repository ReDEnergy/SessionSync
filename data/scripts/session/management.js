define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	const { AppConfig } = require('../config');
	const { BookmarkManager } = require('./bookmarks');
	const { WindowEvents, GlobalEvents } = require('../utils/global-events');
	const { LimitCounter } = require('../utils/general');

	// *****************************************************************************

	var SessionManager = (function SessionManager() {

		var getCurrentTab = function getCurrentTab(callback)
		{
			browser.tabs.query({active: true, windowId: browser.windows.WINDOW_ID_CURRENT})
			.then(function(tabs) {
				callback(tabs[0]);
			});
		};

		var getCurrentWindow = function getCurrentWindow(callback) {
			browser.windows.getCurrent({populate: true,	windowTypes: ['normal']})
			.then(callback);
		};

		var getAllWindows = function getAllWindows(callback) {
			browser.windows.getAll({populate: true,	windowTypes: ['normal']})
			.then(callback);
		};

		var activateTab = function activateTab(tabID)
		{
			browser.tabs.update(tabID, {
				active: true
			});
		};

		var activateWindow = function activateWindow(windowID)
		{
			browser.windows.update(windowID, {
				focused: true
			});
		};

		var saveWindowSession = function saveWindowSession(mozWindow, folderName, callback)
		{
			BookmarkManager.createBookmark({
				title: folderName,
				parentId: AppConfig.get('storageID')
			})
			.then(function (folder) {

				var trackSaving = new LimitCounter(mozWindow.tabs.length, function () {
					callback(folder);
				});

				var savedTabs = {};
				var savePinned = AppConfig.get('session.save.pinned.tabs');
				mozWindow.tabs.forEach(function (tab) {

					// prevent duplicate tabs from saving or pinned in case
					if (savedTabs[tab.url] == true || (tab.pinned && savePinned == false))
					{
						trackSaving.offsetLimit(-1);
					}
					else
					{
						savedTabs[tab.url] = true;

						BookmarkManager.createBookmark({
							url: tab.url,
							title: tab.title,
							parentId: folder.id
						})
						.then(trackSaving.advance, trackSaving.advance);
					}
				});
			});
		};

		var saveHistorySession = function saveHistorySession(sessionInfo, callback)
		{
			BookmarkManager.createBookmark({
				title: sessionInfo.title,
				parentId: AppConfig.get('storageID')
			})
			.then(function (folder) {

				var trackSaving = new LimitCounter(sessionInfo.tabs.length, function () {
					callback(folder);
				});

				var savedTabs = {};
				var savePinned = AppConfig.get('session.save').pinnedTabs;
				sessionInfo.tabs.forEach(function (tab) {

					// prevent duplicate tabs from saving or pinned in case
					if (savedTabs[tab.url] == true || (tab.pinned && savePinned == false))
					{
						trackSaving.offsetLimit(-1);
					}
					else
					{
						savedTabs[tab.url] = true;

						BookmarkManager.createBookmark({
							url: tab.url,
							title: tab.title,
							parentId: folder.id
						})
						.then(trackSaving.advance, trackSaving.advance);
					}
				});
			});
		};

		var createSession = function createSession(title)
		{
			BookmarkManager.createBookmark({
				title: title,
				parentId: AppConfig.get('storageID')
			})
			.then(function success(session) {
				WindowEvents.emitLocal('SetPromiseSession', { sessionID: session.id, edit: true, update: true });
			}, function error() {
			});
		};

		var restoreSession = function restoreSession(folderID)
		{
			BookmarkManager.getFolderBookmarks(folderID, function(bookmarks) {
				bookmarks.forEach(function (bookmark) {
					browser.tabs.create({
						url: bookmark.url,
						active: false,
					});
				});
			});
		};

		var restoreNewWindow = function restoreNewWindow(folderID)
		{
			BookmarkManager.getFolderBookmarks(folderID, function(bookmarks) {
				loadBookmarksNewWindow(bookmarks);
			});
		};

		var loadBookmarksNewWindow = function loadBookmarksNewWindow(bookmarks)
		{
			if (bookmarks.length > 0)
			{
				browser.windows.create({})
				.then(function(mozWindow) {
					var checkValid = new LimitCounter(1, function () {
						browser.tabs.remove(mozWindow.tabs[0].id);
					});
					bookmarks.forEach(function (bookmark) {
						browser.tabs.create({
							url: bookmark.url,
							pinned: bookmark.pinned,
							windowId: mozWindow.id,
						}).then(checkValid.advance);
					});
				});
			}
		};

		var createNewSession = function createNewSession() {
			createSession((new Date()).toLocaleString());
		};

		// Events
		GlobalEvents.on('CreateNewSession', function(name) {
			var title = name ? name : (new Date()).toLocaleString();
			createSession(title);
		});

		// Public API
		return {
			activateTab: activateTab,
			activateWindow: activateWindow,
			getCurrentTab: getCurrentTab,
			getCurrentWindow: getCurrentWindow,
			getAllWindows: getAllWindows,
			restoreSession: restoreSession,
			restoreNewWindow: restoreNewWindow,
			loadBookmarksNewWindow: loadBookmarksNewWindow,
			saveWindowSession: saveWindowSession,
			createNewSession: createNewSession,
			saveHistorySession: saveHistorySession,
		};

	})();


	// *****************************************************************************
	// Public API
	exports.SessionManager = SessionManager;
});