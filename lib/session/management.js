'use strict';

// *****************************************************************************
// SDK Modules

const tabs = require("sdk/tabs");
const { browserWindows } = require("sdk/windows");

// *****************************************************************************
// Custom Modules

const { Bookmarks, BookmarksService } = require('../utils/bookmarks');
const { EventDestroyer } = require('../utils/event-destroyer');
const { WindowEvents, GlobalEvents } = require('../utils/global-events');

// *****************************************************************************

var SessionManager = {};

SessionManager.deleteItem = function deleteItem(itemID) {
	GlobalEvents.emit('lock-observer');
	GlobalEvents.emit('BookmarkRemoved');

	try {
		Bookmarks.removeItem(itemID);
	} catch (err) {}

	GlobalEvents.emit('unlock-observer');
	GlobalEvents.emit('update-sessions');
};

// TODO - create promise
SessionManager.saveCurrentSession = function saveCurrentSession(parentFolder) {
	var folderID = Bookmarks.createFolder(parentFolder, (new Date()).toDateString());
	var tabs = browserWindows.activeWindow.tabs;
	for (var i in tabs) {
		Bookmarks.addBookmark(folderID, tabs[i].title, tabs[i].url);
	}

	return folderID;
};

// TODO - create promise
SessionManager.createEmptySession = function createEmptySession(parentFolder) {
	var folderID = Bookmarks.createFolder(parentFolder, (new Date()).toDateString());
	return folderID;
};

SessionManager.restoreSession = function restoreSession(folderID) {
	var options = {
		folder: folderID,
		types : ['uri'],
		properties : {uri : 'url'}
	};

	Bookmarks.getFolderBookmarks(options).then(function(marks) {
		for (var i in marks) {
			tabs.open(marks[i].url);
		}
	});
};

SessionManager.restoreNewWindow = function restoreNewWindow(folderID) {
	var options = {
		folder: folderID,
		types : ['uri'],
		properties : {uri : 'url'}
	};

	Bookmarks.getFolderBookmarks(options).then(function(marks) {
		browserWindows.open({
		  url: '',
		  onOpen: function(window) {
				for (var i = 0; i < marks.length; i++) {
					tabs.open(marks[i].url);
				}
				window.tabs[0].close();
			}
		});
	});
};

SessionManager.editSession = function editSession(folderID) {
	try {
		Bookmarks.removeItem(folderID);
	} catch (err) {
	}
};

SessionManager.updateProperties = function updateProperties(item) {
	GlobalEvents.emit('lock-observer');

	Bookmarks.setItemTitle(item.id, item.title);
	Bookmarks.setItemDescription(item.id, item.desc);

	GlobalEvents.emit('unlock-observer');
	GlobalEvents.emit('update-sessions');
};

SessionManager.moveItem = function moveItem(item) {
	GlobalEvents.emit('lock-observer');

	BookmarksService.moveItem(item.id, item.parent, item.index);

	GlobalEvents.emit('unlock-observer');
	GlobalEvents.emit('update-sessions');
};

// *****************************************************************************
// Public API
exports.SessionManager = SessionManager;