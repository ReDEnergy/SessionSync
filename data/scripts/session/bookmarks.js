define(function(require, exports) {
	'use strict';

	// ************************************************************************
	// Modules

	const { GlobalEvents } = require('../utils/global-events');

	// ************************************************************************
	// API

	var BookmarkManager = (function BookmarkManager() {

		var createBookmark = function createBookmark(options)
		{
			return browser.bookmarks.create(options);
		};

		var getFolderBookmarks = function getFolderBookmarks(folderID, callback)
		{
			var result = browser.bookmarks.getChildren(folderID);
			result.then(callback, function fail() {
				console.log('Error getting bookmarks from folder ID: ', folderID);
			});
		};

		var searchBookmarks = function searchBookmarks(keyword)
		{
			return browser.bookmarks.search(keyword);
		};

		var openBookmark = function openBookmark(options)
		{
			var mode = options.mode;
			delete options.mode;
			switch (mode)
			{
				case 'newTab': {
					return browser.tabs.create(options);
				}

				case 'newWindow': {
					return browser.windows.create(options);
				}

				default: {
					browser.tabs.query({active: true, windowId: browser.windows.WINDOW_ID_CURRENT})
					.then(tabs => browser.tabs.get(tabs[0].id))
					.then(tab => {
						browser.tabs.update(tab.id, options);
					});
					break;
				}
			}
		};

		var setTitle = function setTitle(bookmark, title, callback)
		{
			browser.bookmarks.update(bookmark.id, {
				title: title
			}).then(function success() {
				bookmark.title = title;
				bookmark.title_lowercase = title.toLowerCase();
				if (typeof callback === 'function')
					callback(true);
			}, function error() {
				throw 'error';
			});
		};

		var setLocation = function setLocation(bookmark, url)
		{
			bookmark.url = url;
		};

		var moveItem = function moveItem(itemID, newParentID, index, callback, errorCallback)
		{
			GlobalEvents.emit('lock-observer');

			browser.bookmarks.move(itemID, {
				parentId: newParentID,
				index: index
			})
			.then(callback, errorCallback);

			GlobalEvents.emit('unlock-observer');
		};

		var deleteItem = function deleteItem(itemID, isFolder, callback, errorCallback)
		{
			if (isFolder)
			{
				browser.bookmarks.removeTree(itemID)
				.then(callback, errorCallback);
			}
			else
			{
				browser.bookmarks.remove(itemID)
				.then(callback, errorCallback);
			}
		};

		return {
			openBookmark: openBookmark,
			createBookmark: createBookmark,
			searchBookmarks: searchBookmarks,

			setTitle: setTitle,
			setLocation: setLocation,
			moveItem:  moveItem,
			deleteItem: deleteItem,

			getFolderBookmarks : getFolderBookmarks
		};

	})();

	// ************************************************************************
	// Events

	// ************************************************************************
	// Init

	// ************************************************************************
	// Module exports

	exports.BookmarkManager = BookmarkManager;
});