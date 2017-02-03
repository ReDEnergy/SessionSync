'use strict';

// *****************************************************************************
// SDK Modules

const tabs = require("sdk/tabs");
const { browserWindows } = require("sdk/windows");
const privateBrowsing = require("sdk/private-browsing");
const timers = require("sdk/timers");

// *****************************************************************************
// Custom Modules

const { AppConfig } = require('../config');
const { BookmarkManager } = require('../session/bookmarks');
const { EventDestroyer } = require('../utils/event-destroyer');
const { WindowEvents, GlobalEvents } = require('../utils/global-events');

// *****************************************************************************

var SessionManager = (function SessionManager() {
	
	// Returns tab URL
	// In case the tab is a promise tab - URL was not loaded returns the promise URL 
	var getTabURL = function getTabURL(tab)
	{
		return tab.futureURL ? tab.futureURL : tab.url;
	};
	
	// Methods
	var deleteItem = function deleteItem(itemID)
	{
		GlobalEvents.emit('lock-observer');
		GlobalEvents.emit('BookmarkRemoved');
	
		try {
			BookmarkManager.removeItem(itemID);
			return true;
		} catch (err) {
			console.log('deleteItem', err);
			return false;
		}
	
		GlobalEvents.emit('unlock-observer');
	};

	var saveWindowSession = function saveWindowSession(mozWindow, folderName)
	{
		var folderID = BookmarkManager.createFolder(AppConfig.storage.storageFolderID, folderName);
		if (folderID)
		{
			var savedTabs = {};
			var tabs = mozWindow.tabs;
			for (var i in tabs)
			{
				var tab = tabs[i];
				if (tab.isPinned && !AppConfig.storage.bookmarkConfig.savePinnedTabs)
				{
					continue;
				}
	
				var url = getTabURL(tab);
	
				// prevent duplicate tabs from saving
				if (savedTabs[url] == undefined)
				{
					savedTabs[url] = true;
					var bookmark = BookmarkManager.addBookmark({
						url: url,
						title: tab.title,
						parent: folderID 
					});
	
					if (tab.isPinned && AppConfig.storage.bookmarkConfig.preservePinnedState)
					{
						bookmark.setAnnotation('pinned', 'yes');
					}
				}
			}
		}

		return folderID;
	};	

	var loadBookmark = function loadBookmark(bookmark)
	{
		var pinState = false;
		if (AppConfig.storage.bookmarkConfig.preservePinnedState)
		{
			pinState = bookmark.isPinned;
		}
		
		tabs.open({
			url: '',
			inBackground: true,
			isPinned: pinState,
			onOpen: function onOpen(tab) {
				
				var timeCheck = 0;

				var intevalID = timers.setInterval(function() {
					setTitle();
					tab.title = bookmark.title;
				}, 250);
				
				function setTitle() {
					if (tab.title == bookmark.title) {
						timeCheck++;
					}
					if (timeCheck > 2) {
						timers.clearInterval(intevalID);
					}
					tab.title = bookmark.title;
				}
				
				function disable() {
					timers.clearInterval(intevalID);
					tab.off('activate', activate);
					tab.off('ready', setTitle);
					tab.off('load', setTitle);
					delete tab.futureURL;
				}
				
				function activate() {
					tab.url = bookmark.url;
					disable();
				}

				tab.on('ready', setTitle);
				tab.on('load', setTitle);
				tab.on('close', disable);
				tab.on('activate', activate);
				tab.futureURL = bookmark.url; 
				tab.title = bookmark.title;
			},
		});
	};

	var createSession = function createSession(title)
	{
		GlobalEvents.emit('lock-observer');

		var folderID = BookmarkManager.createFolder(AppConfig.storage.storageFolderID, title);
		WindowEvents.emitLocal('SetPromiseSession', { sessionID: folderID, edit: true });

		GlobalEvents.emit('unlock-observer');
		GlobalEvents.emit('update-sessions');
	};

	var restoreSession = function restoreSession(folderID) 
	{
		var options = {
			type: BookmarkManager.QUERY_RESULT_TYPE.URI,
			folder: folderID,
			properties : { itemId : 'id', title: 'title', uri : 'url'}
		};
	
		BookmarkManager.getFolderBookmarks(options).then(function(marks) {
			marks.forEach(loadBookmark);
		});
	};

	var restoreNewWindow = function restoreNewWindow(folderID)
	{
		var options = {
			type: BookmarkManager.QUERY_RESULT_TYPE.URI,
			folder: folderID,
			properties : { itemId : 'id', title: 'title', uri : 'url'}
		};
	
		BookmarkManager.getFolderBookmarks(options).then(function(marks) {
			loadTabsNewWindow(marks);
		});
	};
	
	var loadTabsNewWindow = function loadTabsNewWindow(tabs, callback)
	{
		browserWindows.open({
			url: '',
			onOpen: function(win) {
				tabs.forEach(loadBookmark);
				win.tabs[0].close();
				if (typeof callback === 'function') {
					timers.setTimeout(callback, 300);
				}
			}
		});
	};	

	var moveItem = function moveItem(itemID, newParentID, index, update = true)
	{
		GlobalEvents.emit('lock-observer');
	
		BookmarkManager.moveItem(itemID, newParentID, index);
	
		GlobalEvents.emit('unlock-observer');

		if (update) {
			GlobalEvents.emit('update-sessions');
		}
	};	
	
	// Events	
	GlobalEvents.on('CreateNewSession', function(name) {
		var title = name ? name : (new Date()).toLocaleString();
		createSession(title);
	});	

	// Public API	
	return {
		getTabURL: getTabURL,
		deleteItem: deleteItem,
		moveItem: moveItem,
		createSession: createSession,
		restoreSession: restoreSession,
		restoreNewWindow: restoreNewWindow,
		loadTabsNewWindow: loadTabsNewWindow,
		saveWindowSession: saveWindowSession,
	};
	
})();


// *****************************************************************************
// Public API
exports.SessionManager = SessionManager;