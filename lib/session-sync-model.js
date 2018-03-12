'use strict';

// *****************************************************************************
// Custom Modules

const { AppConfig } = require('./config');

// Components
const { BookmarkManager } = require('./session/bookmarks');
const { SessionManager } = require('./session/management');
const { WindowEvents, GlobalEvents } = require('./utils/global-events');


// *****************************************************************************
// API

var SessionSyncDOMModel = function SessionSyncDOMModel(document)
{
	this.bookmarks = [];
	this.state = {};

	// ------------------------------------------------------------------------
	// Events

	var OrderBookmarks = function OrderBookmarks(indices)
	{
		var len = indices.length;
		for (var i = 0; i < len; i++) {
			var node = this.bookmarks[indices[i]];
			if (node) {
				node.setVirtualPosition(SessionSyncModel.bookmarks[node.bookmarkID].position);
			}
		}
	}.bind(this);

	WindowEvents.on(document, 'BookmarksPositionChanged', OrderBookmarks);

	WindowEvents.on(document, 'BookmarkTitleChanged', function(bookmarkID) {
		var node = this.bookmarks[bookmarkID];
		if (node) {
			node.setTitle(SessionSyncModel.bookmarks[bookmarkID].title);
		}
	}.bind(this));

	WindowEvents.on(document, 'SessionContainerMode', function(mode) {

	}.bind(this));

	// ------------------------------------------------------------------------
	// Register

	SessionSyncModel.registerModel(document, this);
};

SessionSyncDOMModel.prototype.getBookmark = function getBookmark(id) {
	return this.bookmarks[id];
};

SessionSyncDOMModel.prototype.setBookmark = function setBookmark(id, bookmark) {
	this.bookmarks[id] = bookmark;
};

SessionSyncDOMModel.prototype.removeBookmark = function removeBookmark(id) {
	// TODO: test if bookmark is SessionBookmark or SessionFolder
	if (this.bookmarks[id]) {
		this.bookmarks[id].remove();
		delete this.bookmarks[id];
	}
};

var SessionSyncModel = (function SessionSync() {

	// Bookmarks storage
	var sessions = [];
	var bookmarks = [];
	var undoEvents = [];
	var redoEvents = [];

	// Per document DOM cache
	var domModels = new Map();

	// ------------------------------------------------------------------------
	// API

	var getModel = function getModel(document)
	{
		var model = domModels.get(document);
		if ((model instanceof SessionSyncDOMModel) === false) {
			model = new SessionSyncDOMModel(document);
		}
		return model;
	};

	var registerModel = function registerModel(document, model)
	{
		if (model instanceof SessionSyncDOMModel) {
			domModels.set(document, model);
		} else {
			console.log('Model is not instance of [SessionSyncDOMModel]');
		}
	};

	var unregisterModel = function unregisterModel(document)
	{
		var model = domModels.get(document);
		if (model instanceof SessionSyncDOMModel) {
			domModels.delete(namespace);
		}
	};

	// Assumes moving in the same parent directory
	var moveBookmark = function moveBookmark(idA, idB)
	{
		var parentID = bookmarks[idA].parent;
		var indexA = bookmarks[idA].position;
		var indexB = bookmarks[idB].position;
		var direction = indexA > indexB ? 1 : -1;

		try
		{
			SessionManager.moveItem(idA, parentID, indexA < indexB ? indexB + 1 : indexB, false);

			var indices = [];
			var min = Math.min(indexA, indexB);
			var max = Math.max(indexA, indexB);

			bookmarks.forEach(function(B) {
				if (B.parent == parentID && B.position > min && B.position < max) {
					indices.push(B.id);
					B.position += direction;
				}
			});

			indices.push(idA);
			indices.push(idB);
			bookmarks[idA].position = indexB;
			bookmarks[idB].position += direction;

			var isSession = (parentID === AppConfig.storage.storageFolderID);
			WindowEvents.broadcast(isSession ? 'SessionsPositionChanged' : 'BookmarksPositionChanged', indices);

		} catch(err) {
			console.log(err);
			WindowEvents.emitLocal('Notification', {
				message: 'Internal error when moving bookmark'
			});
		}
	};

	// Moving a bookmark to a new session directory
	var moveBookmarkTo = function moveBookmarkTo(bookmarkID, folderID)
	{
		var parentID = bookmarks[bookmarkID].parent;
		if (parentID == folderID)
			return;

		try
		{
			SessionManager.moveItem(bookmarkID, folderID, -1, false);
			bookmarks[bookmarkID].parent = folderID;

			// TODO: set position based on the length of the new parent list
			// TODO: trigger update for folderID

			var index = bookmarks[bookmarkID].position;
			bookmarks[bookmarkID].position = -1;

			// Remove the bookmark from all UIs
			domModels.forEach(function (model) {
				model.removeBookmark(bookmarkID);
			});

			// Reorder all bookmarks after the removed one
			var indices = [];
			bookmarks.forEach(function(B) {
				if (B.parent == parentID && B.position > index) {
					indices.push(B.id);
					B.position--;
				}
			});

			// Trigger reordering
			WindowEvents.broadcast('BookmarksPositionChanged', indices);

		} catch(err) {
			console.log(err);
			WindowEvents.emitLocal('Notification', {
				message: 'Internal error when moving bookmark'
			});
			return false;
		}
	};

	// all items must have the same parent
	var deleteBookmarkList = function deleteBookmarkList(bookmarkIDs, parentID)
	{
		var reorderList = [];
		// Get position ordered list of all bookmarks from the parrentID folder
		bookmarks.forEach(function(B) {
			if (B.parent == parentID) {
				reorderList[B.position] = B;
			}
		});

		bookmarkIDs.forEach(function(bookmarkID)
		{
			try
			{
				BookmarkManager.deleteItem(bookmarkID);

				var index = bookmarks[bookmarkID].position;

				// Remove the bookmark from all UIs
				domModels.forEach(function (model) {
					model.removeBookmark(bookmarkID);
				});

				delete reorderList[index];
				delete bookmarks[bookmarkID];

			} catch(err) {
				console.log(err);
				WindowEvents.emitLocal('Notification', {
					message: 'Internal error when removing bookmark'
				});
				return false;
			}
		});

		// compute reordering
		var indices = [];
		var position = 0;
		for (var i = 0; i < reorderList.length; i++) {
			if (reorderList[i]) {
				indices.push(reorderList[i].id);
				reorderList[i].position = position;
				position++;
			}
		}

		if (indices.length)
		{
			// Trigger reordering
			WindowEvents.broadcast('BookmarksPositionChanged', indices);
		}

	};

	var deleteBookmarkItem = function deleteBookmarkItem(bookmarkID)
	{
		try
		{
			// prepare bookmark backup info
			bookmarks[bookmarkID].getDescription();
			// TODO - get description for children if folder

			var success = SessionManager.deleteItem(bookmarkID);
			if (success)
			{
				var parentID = bookmarks[bookmarkID].parent;
				var index = bookmarks[bookmarkID].position;
				var isSession = (parentID === AppConfig.storage.storageFolderID);

				// Remove the bookmark from all UIs
				domModels.forEach(function (model) {
					model.removeBookmark(bookmarkID);
				});

				// Reorder all bookmarks after the removed one
				var indices = [];
				bookmarks.forEach(function(B) {
					if (B.parent == parentID && B.position > index) {
						indices.push(B.id);
						B.position--;
					}
				});

				// Save undo history
				var undoEvent = { type: 'delete', items: [] };

				if (bookmarks[bookmarkID].isFolder())
				{
					undoEvent.folder = bookmarks[bookmarkID];
					var folderID = bookmarks[bookmarkID].id;
					bookmarks.forEach(function(B) {
						if (B.parent == folderID) {
							undoEvent.items.push(B);
						}
					});

					delete bookmarks[folderID];

				} else {
					undoEvent.items.push(bookmarks[bookmarkID]);
				}

				undoEvent.items.forEach(function(B) {
					delete bookmarks[B.id];
				});

				undoEvents.push(undoEvent);
				GlobalEvents.emit('TrashCan-Items', undoEvents.length);

				// Trigger reordering
				if (isSession) {
					GlobalEvents.emit('update-sessions');
				} else {
					WindowEvents.broadcast('BookmarksPositionChanged', indices);
				}
			}
		} catch(err) {
			console.log(err);
			WindowEvents.emitLocal('Notification', {
				message: 'Internal error when removing bookmark'
			});
			return false;
		}
	};

	var updateBookmarkItem = function updateBookmarkItem(bookmarkID, options)
	{
		try {
			if (options.title) {
				bookmarks[bookmarkID].setTitle(options.title);
				// console.log(bookmarks[bookmarkID]);
				WindowEvents.broadcast('BookmarkTitleChanged', bookmarkID);
				if (options.desc === undefined) {
					WindowEvents.broadcast('SessionDescriptionChanged', bookmarkID);
				}
			}

			if (options.url) {
				bookmarks[bookmarkID].setLocation(options.url);
			}

			if (options.desc != undefined) {
				bookmarks[bookmarkID].setDescription(options.desc);
				// if bookmark is a session, update UI if needed
				if (sessions[bookmarkID]) {
					WindowEvents.broadcast('SessionDescriptionChanged', bookmarkID);
				}
			}

			WindowEvents.emitLocal('Notification', {
				message: 'Success'
			});

		} catch(err) {
			console.log(err);
			WindowEvents.emitLocal('Notification', {
				message: 'Error while saving bookmark'
			});
		}
	};

	// ------------------------------------------------------------------------
	// Events

	var undoHistoryEvent = function undoHistoryEvent()
	{
		if (undoEvents.length)
		{
			var historyEvent = undoEvents.pop();

			if (historyEvent.type == 'delete')
			{
				if (historyEvent.folder)
				{
					// Restore deleted folder
					var oldID = historyEvent.folder.id;
					historyEvent.folder.create();
					var newID = historyEvent.folder.id;

					// corret parent for each bookmark
					if (oldID != newID)
					{
						// correct restore event
						historyEvent.items.forEach(function (bookmark) {
							bookmark.parent = newID;
						});

						// correct all undo events
						undoEvents.forEach(function (event) {
							event.items.forEach(function (bookmark) {
								if (bookmark.parent == oldID) {
									bookmark.parent = newID;
								}
							});
						});
					}
				}

				// Restore deleted bookmarks
				for ( var i = historyEvent.items.length - 1; i >= 0; i--)
				{
					historyEvent.items[i].create();
				}
				GlobalEvents.emit('update-sessions');
				GlobalEvents.emit('TrashCan-Items', undoEvents.length);
			}
		}
	};

	// Subscribe to management events
	GlobalEvents.on('DeleteBookmarkItem', deleteBookmarkItem);
	GlobalEvents.on('HistoryUndo', undoHistoryEvent);
	//GlobalEvents.on('HistoryRedo', undoHistoryEvent);

	// ------------------------------------------------------------------------
	// Public API

	return {
		getModel: getModel,
		unregisterModel: unregisterModel,
		registerModel: registerModel,

		domModels: domModels,
		bookmarks: bookmarks,
		moveBookmark: moveBookmark,
		moveBookmarkTo: moveBookmarkTo,

		deleteBookmarkList: deleteBookmarkList,
		updateBookmarkItem: updateBookmarkItem,

		getUndoListLength: function getUndoListLength() {
			return undoEvents.length;
		}
	};

})();

// *****************************************************************************
// Public API

exports.SessionSyncModel = SessionSyncModel;