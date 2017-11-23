/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Title			Session Sync
 * Author			Gabriel Ivanica
 * Email			gabriel.ivanica@gmail.com
 * Description		Addon for saving sessions as with support for Firefox Sync account
 */

'use strict';

// *****************************************************************************
// SDK Modules

const self = require('sdk/self');
const { Ci } = require('chrome'); 	// Cc, Ci, Cm, Cr, Cu, components
const windowUtils = require('sdk/window/utils');

const { browserWindows } = require("sdk/windows");
const { modelFor } = require("sdk/model/core");

// *****************************************************************************
// Custom Modules

const { AppConfig, VersionConfig } = require('./config');
const { SessionSyncUI } = require('./session-sync-ui');
const { SessionAutoSave } = require('./session-auto-save');
const { SessionSyncModel } = require('./session-sync-model');

const { BookmarkManager } = require('./session/bookmarks');
const { BookmarkObserver } = require('./session/bookmark-observer');

// Utils
const { WindowEvents, GlobalEvents } = require('./utils/global-events');

// *****************************************************************************
// Main Addon Object

var SessionSync = (function SessionSync() {

	// SessionSync instances
	// key - window
	var syncInstances = new Map();

	// --------------------------------------------------------------
	// Methods

	var SSInfo = {
		type: BookmarkManager.QUERY_RESULT_TYPE.FOLDER,
		folder: 0,
		properties : {
			itemId : 'id',
			title : 'title',
			uri : 'url',
			bookmarkIndex: 'position',
			dateAdded: 'date'
		}
	};
		
	// Returns FolderID where sessions are stored
	var findStorageFolder = function findStorageFolder()
	{
		var storageID = AppConfig.storage.storageFolderID;
			
		if (storageID != -1)
		{
			// Validate that storage folder is correct
			if (BookmarkManager.getItemDescription(storageID) === self.name) {
				SSInfo.folder = storageID;
				console.log("[Session Sync] Root folder found: ", storageID);
				retrieveSessions();
				return;
			}
		}

		console.log('[Session Sync] Root folder', storageID, 'was not found: ');
		console.log('[Session Sync] Perform full search...');

		var options = {
			type: BookmarkManager.QUERY_RESULT_TYPE.FOLDER,
			folder: BookmarkManager.MENU_FOLDER,
			properties : {itemId : 'id', description: 'description'}
		};
		
		BookmarkManager.getFolderBookmarks(options).then( function (bookmarks) {
			
			for (var i = 0; i < bookmarks.length; i++) {
				if (bookmarks[i].getDescription() === self.name) {
					SSInfo.folder = bookmarks[i].id;
					break;
				}
			};
			
			// Folder was not found
			if (SSInfo.folder == 0)
			{
				var bookmarkID = BookmarkManager.createFolder(BookmarkManager.MENU_FOLDER, 'SessionSync');
				BookmarkManager.setItemDescription(bookmarkID, self.name);
				SSInfo.folder = bookmarkID; 
				console.log("[Session Sync] Root folder created: ", bookmarkID);
			}
			
			AppConfig.storage.storageFolderID = SSInfo.folder;
			console.log("[Session Sync] Root folder: ", AppConfig.storage.storageFolderID);
			retrieveSessions();
			
		}.bind(this));		
	};
	
	// Get saved sessions
	var retrieveSessions = function retrieveSessions() 
	{
		// console.log('Update Sessions');
		BookmarkManager.getFolderBookmarks(SSInfo).then( function (sessionList) {
			var sessions = [];
			sessionList.forEach(function (session) {
				sessions[session.id] = session;
			});
			SessionSyncModel.sessions = sessions;
			updateUI();
		}.bind(this));		
	};
	
	// ------------------------------------------------------------------------
	// UI Events 

	var updateUI = function updateUI()
	{
		WindowEvents.broadcast('ListSessions');
	};

	// ------------------------------------------------------------------------
	// Attach/detach SessionSync UI on windows
	var InitXULAttachments = function () {
		
		GlobalEvents.on('update-sessions', retrieveSessions);

		// Creates the UI for the newly created window
		var trackWindow = function trackWindow(window) {
			var UI = new SessionSyncUI(window);
			syncInstances.set(window, UI);
			WindowEvents.emit(UI.document, 'ListSessions');
		};

		// Destroys the UI for the closed window
		var untrackWindow = function untrackWindow(window) {
			var UI = syncInstances.get(window);
			if (UI instanceof SessionSyncUI) {
				UI.destroy();
			}
			syncInstances.delete(window);
		};

		browserWindows.on('open', trackWindow);
		browserWindows.on('close', untrackWindow);

		for (var key in browserWindows) {
			trackWindow(browserWindows[key]);
		}
	};

	// ------------------------------------------------------------------------
	// Install, Update, Enable the addon  
	var init = function init()
	{
		// --------------------------------------------------------------------
		// Register the Observer with the Bookmarks service
		BookmarkObserver.init();
		InitXULAttachments();

		findStorageFolder();

		// --------------------------------------------------------------------
		// Attach to events
		
		GlobalEvents.emit('AddonEnabled');

		console.log('self.loadReason', self.loadReason, self);

		if (self.loadReason === 'install') {
			GlobalEvents.emit('open-addon-page');
		}
		
		if (self.loadReason === 'upgrade' && VersionConfig.showUpgradePage == true) {
			GlobalEvents.emit('open-addon-page');
		}
	};

	// ------------------------------------------------------------------------
	// Disable, Uninstall or Closing the browser  
	var unload = function unload()
	{
		// Remove the Bookmarks observer
		GlobalEvents.emit('AddonDisabled');
		BookmarkObserver.unload();
	};
	
	// ------------------------------------------------------------------------
	// Public Methods
	return {
		init : init,
		unload : unload
	};
})();

exports.SessionSync = SessionSync;