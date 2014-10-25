'use strict';

// SDK Modules
const { Cc, Ci } = require('chrome'); 	// Cc, Ci, Cm, Cr, Cu, components

var BookmarksService = Cc['@mozilla.org/browser/nav-bookmarks-service;1']
					.getService(Ci.nsINavBookmarksService);
var HistoryService	= Cc['@mozilla.org/browser/nav-history-service;1']
					.getService(Ci.nsINavHistoryService);
var AnnotationService = Cc['@mozilla.org/browser/annotation-service;1']
					.getService(Ci.nsIAnnotationService);
var ioService 		= Cc["@mozilla.org/network/io-service;1"]
					.getService(Ci.nsIIOService);

var Bookmarks = (function Bookmarks() {
	// Interfaces

	var BOOKMARK_DESCRIPTION = 'bookmarkProperties/description';
	var MENU_FOLDER = BookmarksService.bookmarksMenuFolder;

	var query = HistoryService.getNewQuery();
	var queryOptions = HistoryService.getNewQueryOptions();
	var queryResults = {
		'uri' : 0,
		'folder' : 6,
		'livemark' : 6,
		'separator' : 9
	};

	// RESULT_TYPE_URI					0	nsINavHistoryResultNode
	// RESULT_TYPE_VISIT 				1	nsINavHistoryVisitResultNode
	// RESULT_TYPE_FULL_VISIT 			2	nsINavHistoryFullVisitResultNode
	// RESULT_TYPE_DYNAMIC_CONTAINER 	4	nsINavHistoryContainerResultNode
	// RESULT_TYPE_QUERY 				5	nsINavHistoryQueryResultNode
	// RESULT_TYPE_FOLDER 				6	nsINavHistoryQueryResultNode
	// RESULT_TYPE_SEPARATOR 			7	nsINavHistoryResultNode
	// RESULT_TYPE_FOLDER_SHORTCUT		9	nsINavHistoryQueryResultNode

	var makeURI = function makeURI(aURL) {
		return ioService.newURI(aURL, null, null);
	};

	var getItemDescription = function(itemID) {
		try {
			var anno = AnnotationService.itemHasAnnotation(itemID, BOOKMARK_DESCRIPTION);
			if (anno)
				return AnnotationService.getItemAnnotation(itemID, BOOKMARK_DESCRIPTION);
		} catch(err) {
			console.log(err);
		}
		return null;
	};

	var setItemDescription = function setItemDescription(itemID, description) {
		try {
			AnnotationService.setItemAnnotation(itemID, BOOKMARK_DESCRIPTION,
				description, 0, AnnotationService.EXPIRE_NEVER);
		} catch(err) {
			console.log(err);
		}
		return null;
	};

	var Bookmark = function Bookmark(resultNode, options) {
		var prop = options.properties;
		// var annotation = options.annotation;
		for (var key in prop) {
			if (resultNode.hasOwnProperty(key))
				this[prop[key]] = resultNode[key];
		}

		// if (annotation['description']) {
			// this.description = getItemDescription(resultNode.itemId);
		// }
	};

	var addBookmark = function(parent, title, url) {
		BookmarksService.insertBookmark(parent, makeURI(url), -1, title);
	};

	var createFolder = function createFolder(parentID, name, index) {
		index = typeof index !== 'number' ? BookmarksService.DEFAULT_INDEX: parseInt(index);
		parentID = typeof parentID !== 'number' ? MENU_FOLDER: parseInt(parentID);
		try {
			return BookmarksService.createFolder(parentID, name, index);
		}
		catch(err) {
			console.log(err);
		}
		return null;
	};

	var setItemLocation = function(itemID, url) {
		BookmarksService.changeBookmarkURI(itemID, makeURI(url));
	};

	var getFolderBookmarks = function getFolderBookmarks(folderID, options) {
		query.setFolders([folderID], 1);
		var marks = [];
		var result = HistoryService.executeQuery(query, queryOptions);
		var container = result.root;

		// lock container
		container.containerOpen = true;

			var count = container.childCount;
			for (var i = 0; i < count; i++) {
				marks.push(new Bookmark(container.getChild(i), options));
			}

		// unlock container
		container.containerOpen = false;
		return marks;
	};

	var getDescription = function getDescription(itemID) {
		itemID = itemID | 0;
		if (!itemID) return;
		try {
			var anno = AnnotationService.itemHasAnnotation(itemID | 0, BOOKMARK_DESCRIPTION);
			if (anno)
				return AnnotationService.getItemAnnotation(itemID | 0, BOOKMARK_DESCRIPTION);
		} catch(err) {
			console.log(err);
		}
		return null;
	};

	return {
		MENU_FOLDER : MENU_FOLDER,
		BOOKMARK_DESCRIPTION : BOOKMARK_DESCRIPTION,

		addBookmark : addBookmark,
		createFolder : createFolder,
		addObserver : BookmarksService.addObserver,

		removeObserver : BookmarksService.removeObserver,
		removeItem : BookmarksService.removeItem,

		setItemTitle : BookmarksService.setItemTitle,
		setItemLocation : setItemLocation,
		setItemDescription : setItemDescription,

		getItemDescription : getItemDescription,
		getFolderBookmarks : getFolderBookmarks,
		getDescription : getDescription
	};
})();


// *****************************************************************************
// Public API
exports.Bookmarks = Bookmarks;
exports.HistoryService = HistoryService;
exports.BookmarksService = BookmarksService;
