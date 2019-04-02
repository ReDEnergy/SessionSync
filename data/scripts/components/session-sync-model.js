define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	const { AppConfig } = require('../config');

	// Components
	const { BookmarkManager } = require('../session/bookmarks');
	const { WindowEvents, GlobalEvents } = require('../utils/global-events');

	// Utils
	const { LimitCounter } = require('../utils/general');

	// *****************************************************************************
	// API

	var SessionSyncDOMModel = function SessionSyncDOMModel(document)
	{
		this.bookmarks = {};
		this.tabs = {};
		this.state = {};

		// ------------------------------------------------------------------------
		// Events

		var OrderBookmarks = function OrderBookmarks(indices)
		{
			var len = indices.length;
			for (let i = 0; i < len; i++) {
				var node = this.bookmarks[indices[i]];
				if (node) {
					node.setVirtualPosition(SessionSyncModel.bookmarks[node.bookmarkID].index);
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

		// ------------------------------------------------------------------------
		// Register

		SessionSyncModel.registerModel(document, this);
	};

	SessionSyncDOMModel.prototype.getBookmark = function getBookmark(id)
	{
		return this.bookmarks[id];
	};

	SessionSyncDOMModel.prototype.setBookmark = function setBookmark(id, bookmark)
	{
		this.bookmarks[id] = bookmark;
	};

	SessionSyncDOMModel.prototype.removeBookmark = function removeBookmark(id)
	{
		if (this.bookmarks[id])
		{
			this.bookmarks[id].remove();
			delete this.bookmarks[id];
		}
	};

	var SessionSyncModel = (function SessionSync() {

		// Bookmarks storage
		var sessions = {};
		var bookmarks = {};

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
			}
		};

		var unregisterModel = function unregisterModel(document)
		{
			var model = domModels.get(document);
			if (model instanceof SessionSyncDOMModel) {
				domModels.delete(namespace);
			}
		};

		function onActionError()
		{
			WindowEvents.emitLocal('Notification', {
				message: 'Error when updating bookmarks'
			});
		}

		function isSession(parentID) {
			return parentID === AppConfig.get('storageID');
		}

		// Assumes moving in the same parent directory
		var moveBookmark = function moveBookmark(idA, idB)
		{
			var parentID = bookmarks[idA].parentId;
			var indexA = bookmarks[idA].index;
			var indexB = bookmarks[idB].index;
			var direction = indexA > indexB ? 1 : -1;

			BookmarkManager.moveItem(idA, parentID, indexA < indexB ? indexB : indexB, onSuccessMove, onActionError);

			function onSuccessMove()
			{
				var indices = [];
				var min = Math.min(indexA, indexB);
				var max = Math.max(indexA, indexB);

				for (var id in bookmarks)
				{
					var B = bookmarks[id];
					if (B.parentId == parentID && B.index > min && B.index < max)
					{
						indices.push(B.id);
						B.index += direction;
					}
				}

				indices.push(idA);
				indices.push(idB);
				bookmarks[idA].index = indexB;
				bookmarks[idB].index += direction;

				WindowEvents.broadcast(isSession(parentID) ? 'SessionsPositionChanged' : 'BookmarksPositionChanged', indices);
			}
		};

		// Moving a bookmark to a new session directory
		var moveBookmarkTo = function moveBookmarkTo(bookmarkID, folderID)
		{
			var parentID = bookmarks[bookmarkID].parentId;
			if (parentID == folderID)
				return;

			BookmarkManager.moveItem(bookmarkID, folderID, undefined, onSuccess, onActionError);

			function onSuccess()
			{
				bookmarks[bookmarkID].parentId = folderID;

				// TODO: set position based on the length of the new parent list
				// TODO: trigger update for folderID

				var index = bookmarks[bookmarkID].index;
				bookmarks[bookmarkID].index = -1;

				// Remove the bookmark from all UIs
				domModels.forEach(function (model) {
					model.removeBookmark(bookmarkID);
				});

				// Reorder all bookmarks after the removed one
				var indices = [];
				for (var id in bookmarks)
				{
					var B = bookmarks[id];
					if (B.parentId == parentID && B.index > index)
					{
						indices.push(B.id);
						B.index--;
					}
				}

				// Trigger reordering
				WindowEvents.broadcast('BookmarksPositionChanged', indices);
			}
		};

		// all items must have the same parent
		var deleteBookmarkList = function deleteBookmarkList(bookmarkIDs, parentID, callback)
		{
			if (bookmarkIDs.length == 0)
			{
				callback();
				return;
			}

			var reorderList = [];

			// Get position ordered list of all bookmarks from the parrentID folder
			for (var id in bookmarks)
			{
				var B = bookmarks[id];
				if (B.parentId == parentID) {
					reorderList[B.index] = B;
				}
			}

			var updateEvent = new LimitCounter(bookmarkIDs.length, onFinish);

			bookmarkIDs.forEach(function(bookmarkID)
			{
				BookmarkManager.deleteItem(bookmarkID, false, onDeleteSuccess.bind(null, bookmarkID), updateEvent.advance);
			});

			function onFinish()
			{
				// compute reordering
				var indices = [];
				var position = 0;
				for (var i = 0; i < reorderList.length; i++) {
					if (reorderList[i]) {
						indices.push(reorderList[i].id);
						reorderList[i].index = position;
						position++;
					}
				}

				if (indices.length)
				{
					// Trigger reordering
					WindowEvents.broadcast('BookmarksPositionChanged', indices);
				}

				callback();
			}

			function onDeleteSuccess(bookmarkID)
			{
				var index = bookmarks[bookmarkID].index;

				// Remove the bookmark from all UIs
				domModels.forEach(function (model) {
					model.removeBookmark(bookmarkID);
				});

				delete reorderList[index];
				delete bookmarks[bookmarkID];
				GlobalEvents.emit('BookmarkRemoved');

				updateEvent.advance();
			}
		};

		var deleteBookmarkItem = function deleteBookmarkItem(bookmarkID)
		{
			var isFolder = bookmarks[bookmarkID].type === 'folder';
			BookmarkManager.deleteItem(bookmarkID, isFolder, onDeleteSuccess, onActionError);

			function onDeleteSuccess()
			{
				var parentID = bookmarks[bookmarkID].parentId;
				var index = bookmarks[bookmarkID].index;

				// Remove the bookmark from all UIs
				domModels.forEach(function (model) {
					model.removeBookmark(bookmarkID);
				});

				// Reorder all bookmarks after the removed one
				var indices = [];
				for (let id in bookmarks)
				{
					let B = bookmarks[id];
					if (B.parentId == parentID && B.index > index) {
						indices.push(B.id);
						B.index--;
					}
				}

				// Save undo history
				var undoEvent = { type: 'delete', bookmark: bookmarks[bookmarkID], items: [] };

				if (isFolder)
				{
					var folderID = bookmarks[bookmarkID].id;
					for (let id in bookmarks)
					{
						let B = bookmarks[id];
						if (B.parentId == folderID) {
							undoEvent.items.push(Object.assign({}, B));
						}
					}
				}

				// Remove model references
				delete bookmarks[bookmarkID];
				undoEvent.items.forEach(function(B) {
					delete bookmarks[B.id];
				});

				// Save undo event
				var undoEvents = AppConfig.get('undo.events');
				undoEvents.push(undoEvent);

				AppConfig.set('undo.events', undoEvents);
				GlobalEvents.emit('BookmarkDeleted', bookmarkID);

				// Trigger reordering
				WindowEvents.broadcast('BookmarksPositionChanged', indices);
			}
		};

		var updateBookmarkItem = function updateBookmarkItem(bookmarkID, options)
		{
			try {
				if (options.title) {
					BookmarkManager.setTitle(bookmarks[bookmarkID], options.title, function() {
						WindowEvents.broadcast('BookmarkTitleChanged', bookmarkID);
						WindowEvents.broadcast('SessionDescriptionChanged', bookmarkID);
					});
				}

				if (options.url) {
					BookmarkManager.setLocation(bookmarks[bookmarkID], options.url);
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

		var recreateBookmark = function recreateBookmark(item)
		{
			delete item.id;
			delete item.dateAdded;
			delete item.dateGroupModified;
			delete item.title_lowercase;
			return BookmarkManager.createBookmark(item);
		};

		var undoHistoryEvent = function undoHistoryEvent()
		{
			var sessionID = undefined;
			var undoEvents = AppConfig.get('undo.events');

			function onSuccess()
			{
				AppConfig.set('undo.events', undoEvents);
				WindowEvents.emit(document, 'SetPromiseSession', { sessionID: sessionID, update: false });
				GlobalEvents.emit('update-sessions');
			}

			if (undoEvents.length)
			{
				var historyEvent = undoEvents.pop();

				if (historyEvent.type == 'delete')
				{
					switch (historyEvent.bookmark.type)
					{
						case 'bookmark':
						case 'separator': {
							recreateBookmark(historyEvent.bookmark)
							.then(function (bookmark) {
								sessionID = (bookmark.parentId == AppConfig.get('storageID')) ? bookmark.id : bookmark.parentId;
								onSuccess();
							});
							break;
						}

						case 'folder': {
							// Restore deleted folder
							var oldID = historyEvent.bookmark.id;

							recreateBookmark(historyEvent.bookmark)
							.then(function (node) {
								sessionID = node.id;
								var newID = node.id;
								var updateEvent = new LimitCounter(historyEvent.items.length, onSuccess);

								// correct parent for each bookmark
								if (oldID != newID)
								{
									// correct restore event
									historyEvent.items.forEach(function (bookmark) {
										bookmark.parentId = newID;
										recreateBookmark(bookmark)
										.then(updateEvent.advance, updateEvent.advance);
									});

									// correct all undo events
									undoEvents.forEach(function (event) {
										event.items.forEach(function (bookmark) {
											if (bookmark.parentId == oldID) {
												bookmark.parentId = newID;
											}
										});
									});
								}

								if (historyEvent.items.length == 0) {
									onSuccess();
								}
							});
							break;
						}
					}
				}
			}
		};

		// Subscribe to management events
		GlobalEvents.on('DeleteBookmarkItem', deleteBookmarkItem);
		GlobalEvents.on('HistoryUndo', undoHistoryEvent);

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
		};

	})();

	// *****************************************************************************
	// Public API

	exports.SessionSyncModel = SessionSyncModel;
});