/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Title			Session Sync
 * Author			Gabriel Ivanica
 * Email			gabriel.ivanica@gmail.com
 * Description		TODO
 */

// TODO		track new oppened tabs and update view if is neccesary
// TODO		track tab oppening/closing/changing(url) and restrict UI update when oppened

'use strict';

// *****************************************************************************
// SDK Modules

const { Cc, Ci, Cr } = require('chrome'); 	// Cc, Ci, Cm, Cr, Cu, components
const { data } = require('sdk/self');
const { storage: simpleStorage } = require('sdk/simple-storage');
const windowUtils = require('sdk/window/utils');
const tabs = require("sdk/tabs");

const { browserWindows } = require("sdk/windows");
const { modelFor } = require("sdk/model/core");
const { viewFor } = require("sdk/view/core");
const { ActionButton } = require('sdk/ui/button/action');

// *****************************************************************************
// Custom Modules

const { SessionSyncUI } = require('session-sync-ui');
const { Bookmarks, HistoryService } = require('./utils/bookmarks');
const { GlobalEvents } = require('./utils/global-events');
const { AppConfig } = require('./config');


// *****************************************************************************
// *****************************************************************************
// Main Addon Object

var query = HistoryService.getNewQuery();
var queryOptions = HistoryService.getNewQueryOptions();

function SessionInfo(session) {
	this.id			= session.itemId;
	this.title		= session.title;
	this.position	= session.bookmarkIndex;
	this.date		= session.dateAdded / 1000;
	this.modified	= session.lastModified / 1000;
}

const SessionSync = {

	// Bookmarks storage
	sessions : [],
	AquaUIs : null,
	storageFolderID : undefined,

	// Query options and properties
	SsFolderQuery	: null,

	////////////////////////////////////////////////////////////////////////////
	// Methods
	////////////////////////////////////////////////////////////////////////////

	// Set the query container
	setSessionsQuery : function setSessionsQuery(folderID) {
		this.SsFolderQuery = HistoryService.getNewQuery();
		this.SsFolderQuery.setFolders([folderID], 1);
	},

	// Get saved sessions
	retrieveSessions : function retrieveSessions() {
		this.sessions = [];
		var childNode;
		var result = HistoryService.executeQuery(this.SsFolderQuery, queryOptions);
		var container = result.root;
		container.containerOpen = true;
		// lock container
			var child_count = container.childCount;
			for (var i = 0; i < child_count; i++) {
				childNode = container.getChild(i);
				if (childNode.type === childNode.RESULT_TYPE_FOLDER) {
					this.sessions.push(new SessionInfo(childNode));
				}
			}
		// unlock container
		container.containerOpen = false;
	},

	// *************************************************************************
	// Validate Storage Folder
	findStorageFolderID : function () {
		var valid = false;
		var index = this.findStorageFolder() | 0;
		if (index === 0) {
			index = Bookmarks.createFolder(Bookmarks.MENU_FOLDER, 'SessionSync');
			Bookmarks.setItemDescription(index, 'session-sync');
		}
		AppConfig.set('StorageFolderID', index);
		return index;
	},

	isValidFolderAnnotation: function isValidFolderAnnotation(folderID) {
		var annotation = Bookmarks.getItemDescription(folderID);
		if (annotation === 'session-sync')
			return true;
		return false;
	},

	// Returns FolderID where sessions are stored
	findStorageFolder : function findStorageFolder() {
		var childNode;
		var query = HistoryService.getNewQuery();
		query.setFolders([Bookmarks.MENU_FOLDER], 1);
		var result = HistoryService.executeQuery(query, queryOptions);
		var container = result.root;

		container.containerOpen = true;
		// lock container
		var child_count = container.childCount;
		for (var i = 0; i < child_count; i++) {
			childNode = container.getChild(i);
			if (childNode.type === childNode.RESULT_TYPE_FOLDER) {
				if (this.isValidFolderAnnotation(childNode.itemId)) {
					container.containerOpen = false;
					return childNode.itemId;
				}
			}
		}
		// unlock container
		container.containerOpen = false;
		return null;
	},

	toggleUI : function toggleUI(pinned) {
		var UI = SessionSync.AquaUIs.get(browserWindows.activeWindow);
		if (UI instanceof SessionSyncUI)
			UI.toggle(pinned);
	},

	updateSessions : function updateSessions() {
		this.retrieveSessions();
		for (let UI of this.AquaUIs.values()) {
			UI.setSessions(this.sessions);
		}
	},

	removeSessionFolder : function removeSessionFolder(folderID) {
		var sessions = this.sessions;
		for (var i in sessions) {
			if (sessions[i].id === folderID) {
				sessions.splice(i, 1);
				break;
			}
		}
		for (let UI of this.AquaUIs.values()) {
			UI.setSessions(sessions);
		}
	},

	// *************************************************************************
	// TODO	sort by createdDate and modify that date when update

	// *************************************************************************
	// Attach/detach SessionSync XUL Panel on windows
	init_XUL_Attachments : function () {
		var updateAllSessions = SessionSync.updateSessions.bind(SessionSync);

		GlobalEvents.on('lock-observer', Observer.lock);
		GlobalEvents.on('unlock-observer', Observer.unlock);
		GlobalEvents.on('update-sessions', updateAllSessions);

		var trackWindow = function trackWindow(window) {
			// Creates the UI for the newly created window
			var UI = new SessionSyncUI(viewFor(window));
			UI.setSessions(SessionSync.sessions);
			SessionSync.AquaUIs.set(window, UI);
		};

		var untrackWindow = function untrackWindow(window) {
			// Destroy UI
			if (!SessionSync.destroyed) {
				var UI = SessionSync.AquaUIs.get(window);
				if (UI instanceof SessionSyncUI) {
					UI.destroy();
				}
				SessionSync.AquaUIs.delete(window);
			}
		};

		browserWindows.on('open', trackWindow);
		browserWindows.on('close', untrackWindow);

		for each (var window in browserWindows) {
			trackWindow(window);
		}

		// TODO: Bug - need to understand how to untrack tabs first
		// track ready and closed windows
		/*
			function findWindow(tab) {
				var UI = SessionSync.AquaUIs.get(tab.window);
				if (UI) {
					console.log('FOUND: ', UI);
				}
			}
		*/
	},

	init : function init(options) {

		this.SSyncActionButton = ActionButton({
			id: "syncbtn",
			label: "Session Sync",
			icon: {
				"16": data.url("images/icon16.png"),
				"32": data.url("images/icon32.png"),
				"64": data.url("images/icon64.png")
			},
			onClick: function(state) {
				SessionSync.toggleUI(state);
			}
		});

		this.AquaUIs = new Map();
		this.sessions = [];

		// Register the Observer with the Bookmarks service
		Bookmarks.addObserver(Observer, false);

		this.storageFolderID = this.findStorageFolderID();
		this.setSessionsQuery(this.storageFolderID);
		this.retrieveSessions();
		this.init_XUL_Attachments();

		GlobalEvents.on('SessionSync-ToogleKey', function() {
			SessionSync.toggleUI(false);
		});

		GlobalEvents.emit('AddonEnabled');

		if (options.loadReason === 'install') {
			tabs.open('about:session-sync');
		}
	},

	unload : function unload() {
		// Remove the Bookrmarks Observer
		Bookmarks.removeObserver(Observer);
		GlobalEvents.emit('AddonDisabled');

		this.SSyncActionButton.destroy();

		for (let UI of this.AquaUIs.values()) {
			UI.destroy();
		}

		this.destroyed = true;
		this.AquaUIs = null;
		this.sessions = null;
		this.storageFolderID = 0;

		GlobalEvents.off('lock-observer', Observer.lock);
		GlobalEvents.off('unlock-observer', Observer.unlock);
	}
};

// *****************************************************************************
// Bookmarks Observer
var Observer = (function (){
	var isLocked = false;
	var update = false;
	var changed_property = ['title', Bookmarks.BOOKMARK_DESCRIPTION];

	var lock = function lock() {
		isLocked = true;
	};

	var unlock = function unlock() {
		isLocked = false;
	};

	var onBeginUpdateBatch = function onBeginUpdateBatch() {
	};

	var onEndUpdateBatch = function onEndUpdateBatch() {
		if (isLocked) return;
		if (update === true) {
			update = false;
			SessionSync.updateSessions();
		}
	};

	var onItemAdded = function(id, folder, index) {
		// console.log('Item Added', 'id', id, 'folder', folder, 'index', index);
		if (isLocked) return;
		if (folder === SessionSync.storageFolderID) {
			update = true;
		}
	};

	var onItemRemoved = function(id, folder, index) {
		// console.log('Item Removed', 'id', id, 'folder', folder, 'index', index);
		if (isLocked) return;
		if (folder === SessionSync.storageFolderID) {
			SessionSync.removeSessionFolder(id);
		}
	};

	var onItemChanged = function(id, property, isAnnotationProperty, value) {
		// console.log('Item Changed', 'id', id, 'property', property, 'value', value);
		if (isLocked) return;
		if (changed_property.indexOf(property) !== -1) {
			var sessions = SessionSync.sessions;
			for (var i in sessions) {
				if (sessions[i].id === id) {
					SessionSync.updateSessions();
					break;
				}
			}
		}
	};

	// onItemVisited: function(id, visitID, time) {
		// The visit id can be used with the History service to access other properties of the visit.
		// The time is the time at which the visit occurred, in microseconds.
	// },

	var onItemMoved = function(id, oldParent, oldIndex, newParent, newIndex) {
		// console.log('Item Moved', 'id', id, 'oldParent', oldParent, 'oldIndex', oldIndex,
					// 'newParent', newParent, 'newIndex', newIndex);
		if (isLocked) return;
		if (oldParent === SessionSync.storageFolderID ||
			newParent === SessionSync.storageFolderID) {
			update = true;
		}
	};

	return {
		lock : lock,
		unlock : unlock,
		onBeginUpdateBatch : onBeginUpdateBatch,
		onEndUpdateBatch : onEndUpdateBatch,
		onItemAdded : onItemAdded,
		onItemRemoved : onItemRemoved,
		onItemChanged : onItemChanged,
		onItemMoved : onItemMoved,
		QueryInterface: function(iid) {
			if (iid.equals(Ci.nsINavBookmarkObserver) || iid.equals(Ci.nsISupports)) {
				return this;
			}
			throw Cr.NS_ERROR_NO_INTERFACE;
		}
	};
})();

exports.SessionSync = SessionSync;