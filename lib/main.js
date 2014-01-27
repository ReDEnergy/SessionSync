/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Title			Session Sync
 * Programmer		Gabriel Ivanica
 * Email			gabriel.ivanica@gmail.com
 * Description
 */

// TODO		track new oppened tabs and update view if is neccesary
// TODO		track tab oppening/closing/changing(url) and restrict UI update when oppened

'use strict';

// *****************************************************************************
// SDK Modules

const { Cc, Ci, Cr } = require('chrome'); 	// Cc, Ci, Cm, Cr, Cu, components
const { data } = require('sdk/self');
const { Hotkey } = require('sdk/hotkeys');
const { storage: simpleStorage } = require('sdk/simple-storage');
const { browserWindows } = require("sdk/windows");
const tabs = require('sdk/tabs');
const windowUtils = require('sdk/window/utils');

// *****************************************************************************
// Custom Modules

const PP = require('prettyprint');
const { SessionSyncUI } = require('session-sync-ui');

// *****************************************************************************

const toolbarButton = require('toolbarbutton').ToolbarButton({
	id: 'session-sync-btn',
	label: 'Session Sync',
	image: data.url("images/icon16.png"),
	onCommand : function() {
		SessionSync.toggleUI(true);
	}
});

// *****************************************************************************
// Main Addon Object

const SessionSync = {

	// Interfaces
	BookmarksServ 	: Cc['@mozilla.org/browser/nav-bookmarks-service;1']
						.getService(Ci.nsINavBookmarksService),
	HistoryServ   	: Cc['@mozilla.org/browser/nav-history-service;1']
						.getService(Ci.nsINavHistoryService),
	AnnotationService : Cc['@mozilla.org/browser/annotation-service;1']
						.getService(Ci.nsIAnnotationService),

	BOOKMARK_DESCRIPTION : 'bookmarkProperties/description',

	// Bookmarks storage
	windows : [],
	sessions : [],
	AquaUIs : [],
	storageFolderID : undefined,

	// Query options and properties
	SsFolderQuery	: null,
	query			: null,
	queryOptions 	: null,

	// RESULT_TYPE_URI					0	nsINavHistoryResultNode
	// RESULT_TYPE_VISIT 				1	nsINavHistoryVisitResultNode
	// RESULT_TYPE_FULL_VISIT 			2	nsINavHistoryFullVisitResultNode
	// RESULT_TYPE_DYNAMIC_CONTAINER 	4	nsINavHistoryContainerResultNode
	// RESULT_TYPE_QUERY 				5	nsINavHistoryQueryResultNode
	// RESULT_TYPE_FOLDER 				6	nsINavHistoryQueryResultNode
	// RESULT_TYPE_SEPARATOR 			7	nsINavHistoryResultNode
	// RESULT_TYPE_FOLDER_SHORTCUT		9	nsINavHistoryQueryResultNode

	//////////////////////////////////////////////////////////////
	// Methods
	//////////////////////////////////////////////////////////////

	getFolderDescription: function(folderID) {
		var anno = this.AnnotationService.itemHasAnnotation(folderID, this.BOOKMARK_DESCRIPTION);
		if (anno)
			return this.AnnotationService.getItemAnnotation(folderID, this.BOOKMARK_DESCRIPTION);
		return null;
	},

	// Open all URIs from the current container
	restoreSession : function restoreSession() {
	},

	// Set the query container
	setSessionsQuery : function setSessionsQuery(folderID) {
		this.SsFolderQuery = this.HistoryServ.getNewQuery();
		this.SsFolderQuery.setFolders([folderID], 1);
	},

	// Extract info from result childNode
	SessionInfo : function SessionInfo(session) {
		this.id			= session.itemId;
		this.title		= session.title;
		this.position	= session.bookmarkIndex;
		this.date		= session.dateAdded / 1000;
		this.modified	= session.lastModified / 1000;
		this.description = SessionSync.getFolderDescription(session.itemId);
	},

	// Get saved sessions
	retrieveSessions : function retrieveSessions() {
		this.sessions = [];
		var childNode;
		var result = this.HistoryServ.executeQuery(this.SsFolderQuery, this.queryOptions);
		var container = result.root;
		container.containerOpen = true;
		// lock container
		var child_count = container.childCount;
		for (var i = 0; i < child_count; i++) {
			childNode = container.getChild(i);
			if (childNode.type === childNode.RESULT_TYPE_FOLDER) {
				this.sessions.push(new this.SessionInfo(childNode));
			}
		}
		// unlock container
		container.containerOpen = false;
	},

	// *************************************************************************
	// Validate Storage Folder
	getStorageFolderID : function () {
		var valid = false;
		var index = this.findStorageFolder() | 0;
		// console.log('StorageFolderID found: ', index);
		if (index === 0) {
			index = this.createStorageFolder();
			// console.log('StorageFolderID created: ', index);
		}
		return index;
	},

	isValidFolderAnnotation: function isValidFolderAnnotation(folderID) {
		var annotation = this.getFolderDescription(folderID);
		if (annotation === 'session-sync')
			return true;
		return false;
	},

	// Returns FolderID where sessions are stored
	findStorageFolder : function findStorageFolder() {
		var childNode;
		var query = this.HistoryServ.getNewQuery();
		query.setFolders([this.BookmarksServ.bookmarksMenuFolder], 1);
		var result = this.HistoryServ.executeQuery(query, this.queryOptions);
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

	// Create Storage Folder for sessions
	createStorageFolder : function createStorageFolder() {
		var index = this.BookmarksServ.createFolder(
			this.BookmarksServ.bookmarksMenuFolder,
			'SessionSync',
			this.BookmarksServ.DEFAULT_INDEX
		);
		this.AnnotationService.setItemAnnotation(index, this.BOOKMARK_DESCRIPTION, 'session-sync', 0, this.AnnotationService.EXPIRE_NEVER);

		return index;
	},

	toggleUI : function toggleUI(pinned) {
		var window = windowUtils.getMostRecentBrowserWindow();
		var index = SessionSync.windows.indexOf(window);
		if (index !== - 1) {
			SessionSync.AquaUIs[index].toggle(pinned);
		}
	},

	// *************************************************************************
	// Attach/detach SessionSync XUL Panel on windows
	init_XUL_Attachments : function () {

		// Attach GUI to new the windows created
		var trackWindow = function trackWindow(window) {
			if (!windowUtils.isBrowser(window))
				return;
			// console.log("Tracking a window: ", window.location);
			SessionSync.windows.push(window);
			var UI = new SessionSyncUI(window);
			UI.setStorageFolderID(SessionSync.storageFolderID);
			UI.setSessions(SessionSync.sessions);
			UI.on('freeze-observer', SessionSync.Observer.freeze);
			UI.on('unfreeze-observer', SessionSync.Observer.unfreeze);
			UI.on('update', SessionSync.updateSessions.bind(SessionSync));
			SessionSync.AquaUIs.push(UI);
		};

		// Detach GUI to new the windows created
		var untrackWindow = function untrackWindow(window) {
			if (!windowUtils.isBrowser(window))
				return;

			var index  = SessionSync.windows.indexOf(window);
			if (index !== -1) {
				SessionSync.AquaUIs[index].destroy();
				SessionSync.windows.splice(index, 1);
				SessionSync.AquaUIs.splice(index, 1);
			}
			// console.log("Untracking a window: ", window.location);
		};

		var dWindowUtils = require("sdk/deprecated/window-utils");
		new dWindowUtils.WindowTracker({
			onTrack: trackWindow,
			onUntrack: untrackWindow
		});
	},

	updateSessions : function updateSessions() {
		// console.log('UPDATE SESSIONS FROM BOOKMARKS');
		this.retrieveSessions();
		for (var i in this.AquaUIs) {
			this.AquaUIs[i].setSessions(this.sessions);
		}
	},

	removeSessionFolder : function removeSessionFolder(folderID) {
		var sessions = this.sessions;
		for (var i in sessions) {
			if (sessions[i].id === folderID) {
				// console.log('REMOVED', i);
				sessions.splice(i, 1);
				break;
			}
		}
		for (var i in this.AquaUIs) {
			this.AquaUIs[i].setSessions(sessions);
		}
	},

	// *************************************************************************
	// Bookmarks Observer
	Observer : {
		isBlocked : false,
		update : false,
		inBatchUpdate : false,

		changed_property : ['title', 'bookmarkProperties/description'],

		freeze : function freeze() {
			this.isBlocked = true;
		},

		unfreeze : function unfreeze() {
			this.isBlocked = false;
		},

		onBeginUpdateBatch: function() {
			if (this.isBlocked) return;
			// console.log("batch update start");
			this.inBatchUpdate = true;
		},

		onEndUpdateBatch: function() {
			if (this.isBlocked) return;
			// console.log('batch update end');
			this.inBatchUpdate = false;
			if (this.update == true) {
				this.update = false;
				SessionSync.updateSessions();
			}
		},

		onItemAdded: function(id, folder, index) {
			// console.log('Item Added', 'id', id, 'folder', folder, 'index', index);
			if (this.isBlocked) return;
			if (folder === SessionSync.storageFolderID) {
				this.update = true;
			}
		},

		onItemRemoved: function(id, folder, index) {
			// console.log('Item Removed', 'id', id, 'folder', folder, 'index', index);
			if (this.isBlocked) return;
			if (folder === SessionSync.storageFolderID) {
				SessionSync.removeSessionFolder(id);
			}
		},

		onItemChanged: function(id, property, isAnnotationProperty, value) {
			// console.log('Item Changed', 'id', id, 'property', property, 'value', value);
			if (this.isBlocked) return;
			if (this.changed_property.indexOf(property) !== -1) {
				var sessions = SessionSync.sessions;
				for (var i in sessions) {
					if (sessions[i].id === id) {
						SessionSync.updateSessions();
						break;
					}
				}
			}
		},

		// onItemVisited: function(id, visitID, time) {
			// The visit id can be used with the History service to access other properties of the visit.
			// The time is the time at which the visit occurred, in microseconds.
		// },

		onItemMoved: function(id, oldParent, oldIndex, newParent, newIndex) {
			// console.log('Item Moved', 'id', id, 'oldParent', oldParent, 'oldIndex', oldIndex,
						// 'newParent', newParent, 'newIndex', newIndex);
			if (this.isBlocked) return;
			if (oldParent === SessionSync.storageFolderID ||
				newParent === SessionSync.storageFolderID) {
				this.update = true;
			}
		},

		QueryInterface: function(iid) {
			if (iid.equals(Ci.nsINavBookmarkObserver) || iid.equals(Ci.nsISupports)) {
				return this;
			}
			throw Cr.NS_ERROR_NO_INTERFACE;
		},
	},

	// *************************************************************************
	// Init
	// TODO		sort by createdDate and modify that date when update

	init : function init() {

		this.KeyBind = Hotkey({
			combo: 'accel-shift-s',
			onPress: SessionSync.toggleUI
		});

		this.AquaUIs = [];
		this.windows = [];
		this.sessions = [];

		// Register the Observer with the Bookmarks service
		this.BookmarksServ.addObserver(this.Observer, false);

		this.queryOptions = this.HistoryServ.getNewQueryOptions();
		this.queryOptions.sortingMode = this.queryOptions.SORT_BY_LASTMODIFIED_DESCENDING;
		this.storageFolderID = this.getStorageFolderID();
		this.setSessionsQuery(this.storageFolderID);
		this.retrieveSessions();
		this.init_XUL_Attachments();
	},

	unload : function unload() {
		// Remove the Bookrmarks Observer
		this.BookmarksServ.removeObserver(this.Observer);
		for (var i in this.AquaUIs)
			this.AquaUIs[i].destroy();
		this.AquaUIs = [];
		this.windows = [];
		this.sessions = [];
		this.storageFolderID = 0;
		this.KeyBind.destroy();
	}
};

// *****************************************************************************
// Load Addon

exports.main = function (options, callbacks) {

	// console.log(options.loadReason);
	var reasons = ['install', 'enable', 'upgrade'];

	// Init Addon
	SessionSync.init();

	// Add additional button to open the add-on home page
	if (reasons.indexOf(require('sdk/self').loadReason) !== -1) {
		toolbarButton.moveTo({
			toolbarID: 'nav-bar',
			forceMove: true
		});
	}
};


// *****************************************************************************
// Unload Addon

exports.onUnload = function (reason) {
	SessionSync.unload();
	toolbarButton.destroy();
};

