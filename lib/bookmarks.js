'use strict';

const { Cc, Ci } = require('chrome'); 	// Cc, Ci, Cm, Cr, Cu, components
const PP = require('prettyprint');

var Bookmarks = (function Bookmarks() {
	// Interfaces
	var BookmarksServ	= Cc['@mozilla.org/browser/nav-bookmarks-service;1']
						.getService(Ci.nsINavBookmarksService);
	var HistoryServ		= Cc['@mozilla.org/browser/nav-history-service;1']
						.getService(Ci.nsINavHistoryService);
	var AnnotationService = Cc['@mozilla.org/browser/annotation-service;1']
						.getService(Ci.nsIAnnotationService);
	var ioService 		= Cc["@mozilla.org/network/io-service;1"]
						.getService(Ci.nsIIOService);

	var makeURI = function makeURI(aURL) {
		return ioService.newURI(aURL, null, null);
	};

	var BOOKMARK_DESCRIPTION = 'bookmarkProperties/description';
	var query = HistoryServ.getNewQuery();
	var queryOptions = HistoryServ.getNewQueryOptions();
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

	var getItemDescription = function(itemID) {
		var anno = AnnotationService.itemHasAnnotation(itemID, BOOKMARK_DESCRIPTION);
		if (anno)
			return AnnotationService.getItemAnnotation(itemID, BOOKMARK_DESCRIPTION);
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
		var URI = makeURI(url);
		BookmarksServ.insertBookmark(parent, URI, -1, title);
	};

	var setItemDescription = function setItemDescription(itemID, description) {
		AnnotationService.setItemAnnotation(itemID, BOOKMARK_DESCRIPTION,
			description, 0, AnnotationService.EXPIRE_NEVER);
	};

	var getFolderBookmarks = function getFolderBookmarks(folderID, options) {
		query.setFolders([folderID], 1);
		var marks = [];
		var result = HistoryServ.executeQuery(query, queryOptions);
		var container = result.root;

		container.containerOpen = true;
		// lock container

		var childNode;
		var child_count = container.childCount;
		for (var i = 0; i < child_count; i++) {
			childNode = container.getChild(i);
			marks.push(new Bookmark(container.getChild(i), options));
		}

		// unlock container
		container.containerOpen = false;
		return marks;
	};

	return {
		BServ : BookmarksServ,
		addBookmark : addBookmark,
		createFolder : BookmarksServ.createFolder,
		removeItem : BookmarksServ.removeItem,
		setItemTitle : BookmarksServ.setItemTitle,
		setItemDescription : setItemDescription,
		getFolderBookmarks : getFolderBookmarks
	};
})();


// *****************************************************************************
// Module exports
exports.Bookmarks = Bookmarks;