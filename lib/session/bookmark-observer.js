'use strict';

// *****************************************************************************
// SDK Modules

const self = require('sdk/self');
const { Ci } = require('chrome'); 	// Cc, Ci, Cm, Cr, Cu, components

// *****************************************************************************
// Custom Modules

const { AppConfig } = require('../config');
const { BookmarkManager } = require('./bookmarks');
const { SessionSyncModel } = require('../session-sync-model');

// Utils
const { WindowEvents, GlobalEvents } = require('../utils/global-events');

// *****************************************************************************

// ------------------------------------------------------------------------
// Bookmarks Observer
// TODO: Moving a folder as a child to another one will not trigger update
// Same for moving from outsite into the session folder root

var BookmarkObserver = (function () {
	
	var isLocked = false;
	var update = false;
	var changed_property = ['title', BookmarkManager.BOOKMARK_DESCRIPTION];

	// ------------------------------------------------------------------------
	var onBeginUpdateBatch = function onBeginUpdateBatch() {
		// console.log('onBeginUpdateBatch');
		update = true;
	};

	var onEndUpdateBatch = function onEndUpdateBatch() {
		if (isLocked) return;
		if (update === true) {
			update = false;
			// console.log('onEndUpdateBatch OK');
			GlobalEvents.emit('update-sessions');
		}
	};

	var onItemAdded = function onItemAdded(id, folder, index) {
		// console.log('Item Added', 'id', id, 'folder', folder, 'index', index, 'locked', isLocked);
		if (isLocked) return;
		if (folder === AppConfig.storage.storageFolderID) {
			GlobalEvents.emit('update-sessions');
		}
	};

	var onItemRemoved = function onItemRemoved(id, folder, index) {
		// console.log('Item Removed', 'id', id, 'folder', folder, 'index', index, 'locked', isLocked);
		if (isLocked) return;
		if (folder === AppConfig.storage.storageFolderID) {
			GlobalEvents.emit('update-sessions');
		}
	};
	
	var onItemChanged = function onItemChanged(id, property, isAnnotationProperty, value) {
		// console.log('Item Changed', 'id', id, 'property', property, 'value', value, 'locked', isLocked);
		if (isLocked) return;
		if (changed_property.indexOf(property) !== -1) {
			if (SessionSyncModel.sessions && SessionSyncModel.sessions[id]) {
				GlobalEvents.emit('update-sessions');
			}
		}
	};

	// onItemVisited: function(id, visitID, time) {
		// The visit id can be used with the History service to access other properties of the visit.
		// The time is the time at which the visit occurred, in microseconds.
	// },

	var onItemMoved = function onItemMoved(id, oldParent, oldIndex, newParent, newIndex) {
		 // console.log('Item Moved', 'id', id, 'oldParent', oldParent, 'oldIndex', oldIndex,
					 // 'newParent', newParent, 'newIndex', newIndex);
		if (isLocked) return;
		var storageID = AppConfig.storage.storageFolderID;
		if (oldParent === storageID || newParent === storageID) {
			GlobalEvents.emit('update-sessions');
		}
	};
	
	// Observer that implements the required methods
	var Observer = {
		onBeginUpdateBatch: onBeginUpdateBatch,
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
	
	// ------------------------------------------------------------------------
	// Private Methods

	var lock = function lock() {
		isLocked = true;
	};

	var unlock = function unlock() {
		isLocked = false;
	};
	
	// ------------------------------------------------------------------------
	// Public Methods
	
	var init = function init() {
		BookmarkManager.addObserver(Observer, false);
		GlobalEvents.on('lock-observer', lock);
		GlobalEvents.on('unlock-observer', unlock);
	}; 

	var unload = function unload() {
		BookmarkManager.removeObserver(Observer);
		GlobalEvents.off('lock-observer', lock);
		GlobalEvents.off('unlock-observer', unlock);
	}; 
	
	return {
		init : init,
		unload : unload,
	};
})();

// *****************************************************************************
// Public API

exports.BookmarkObserver = BookmarkObserver;