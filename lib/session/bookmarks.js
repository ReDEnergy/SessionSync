'use strict';

// *****************************************************************************
// Custom Modules

// SDK Modules
const { Cc, Ci } = require('chrome'); 	// Cc, Ci, Cm, Cr, Cu, components

var MozBookmarksService = Cc['@mozilla.org/browser/nav-bookmarks-service;1']
					.getService(Ci.nsINavBookmarksService);
var MozHistoryService	= Cc['@mozilla.org/browser/nav-history-service;1']
					.getService(Ci.nsINavHistoryService);
var MozTaggingService	= Cc["@mozilla.org/browser/tagging-service;1"]
					.getService(Ci.nsITaggingService);
var MozAnnotationService = Cc['@mozilla.org/browser/annotation-service;1']
					.getService(Ci.nsIAnnotationService);
var ioService 		= Cc["@mozilla.org/network/io-service;1"]
					.getService(Ci.nsIIOService);

// Utils
const { MozBookmark } = require('./moz-bookmark');
const { WindowEvents, GlobalEvents } = require('../utils/global-events');

// *****************************************************************************
// API


var BookmarkManager = (function BookmarkManager() {
	// Interfaces

	var BOOKMARK_DESCRIPTION = 'bookmarkProperties/description';
	var MENU_FOLDER = MozBookmarksService.bookmarksMenuFolder;

	var query = MozHistoryService.getNewQuery();
	var queryOptions = MozHistoryService.getNewQueryOptions();

	var QUERY_RESULT_TYPE = 
	{
		URI: 0,
		DYNAMIC: 4,
		FOLDER: 6,
		SEPARATOR: 7
	};
	// RESULT_TYPE_URI					0	nsINavHistoryResultNode
	// RESULT_TYPE_VISIT 				1	nsINavHistoryVisitResultNode
	// RESULT_TYPE_FULL_VISIT 			2	nsINavHistoryFullVisitResultNode
	// RESULT_TYPE_DYNAMIC_CONTAINER 	4	nsINavHistoryContainerResultNode
	// RESULT_TYPE_QUERY 				5	nsINavHistoryQueryResultNode
	// RESULT_TYPE_FOLDER 				6	nsINavHistoryQueryResultNode
	// RESULT_TYPE_SEPARATOR 			7	nsINavHistoryResultNode
	// RESULT_TYPE_FOLDER_SHORTCUT		9	nsINavHistoryQueryResultNode

	var makeURI = function makeURI(aURL)
	{
		return ioService.newURI(aURL, null, null);
	};

	var getItemDescription = function(itemID)
	{
		itemID = itemID | 0;
		if (!itemID) return;
		try {
			var anno = MozAnnotationService.itemHasAnnotation(itemID, BOOKMARK_DESCRIPTION);
			if (anno)
				return MozAnnotationService.getItemAnnotation(itemID, BOOKMARK_DESCRIPTION);
		} catch(err) {
			console.log(err);
			return '';
		}
		return '';
	};

	var setItemDescription = function setItemDescription(itemID, description)
	{
		try {
			MozAnnotationService.setItemAnnotation(itemID, BOOKMARK_DESCRIPTION,
				description, 0, MozAnnotationService.EXPIRE_NEVER);
		} catch(err) {
			console.log(err);
			return false;
		}
		return true;
	};

	var addBookmark = function(info)
	{
		info.id = MozBookmarksService.insertBookmark(info.parent, makeURI(info.url), -1, info.title);
		var B = new MozBookmark(info, info, true);
		return B;
	};

	var createFolder = function createFolder(parentID, name, index)
	{
		index = typeof index !== 'number' ? MozBookmarksService.DEFAULT_INDEX: parseInt(index);
		parentID = typeof parentID !== 'number' ? MENU_FOLDER: parseInt(parentID);
		try {
			return MozBookmarksService.createFolder(parentID, name, index);
		}
		catch(err) {
			console.log(err);
			WindowEvents.broadcast('Notification', {
				message: 'Internal error when creating bookmark folder!'
			});
			return null;
		}
	};

	var setURLTag = function(url, tag)
	{
		MozTaggingService.tagURI(makeURI(url), [tag]);
	};

	var getFolderBookmarks = function getFolderBookmarks(options)
	{
		return new Promise(
			function (resolve, reject)
			{
				query.setFolders([options.folder], 1);
				queryOptions.excludeItems = false;

				var marks = [];
				var result = MozHistoryService.executeQuery(query, queryOptions);
				var container = result.root;

				// lock container
				container.containerOpen = true;

				var count = container.childCount;
				for (var i = 0; i < count; i++)
				{
					if (container.getChild(i).type != options.type)
						continue;
					
					var B = new MozBookmark(container.getChild(i), options.properties);
					B.parent = options.folder;		// bookmark parentID
					marks.push(B);
				}

				// unlock container
				container.containerOpen = false;
				resolve(marks);
			}
		);
	};

	return {
		MENU_FOLDER : MENU_FOLDER,
		QUERY_RESULT_TYPE: QUERY_RESULT_TYPE,
		BOOKMARK_DESCRIPTION : BOOKMARK_DESCRIPTION,

		addBookmark : addBookmark,
		createFolder : createFolder,

		addObserver : MozBookmarksService.addObserver,
		removeObserver : MozBookmarksService.removeObserver,

		removeItem : MozBookmarksService.removeItem,
		moveItem :  MozBookmarksService.moveItem, 

		setURLTag: setURLTag,
		setItemDescription : setItemDescription,

		getItemTitle : MozBookmarksService.getItemTitle,
		getItemDescription : getItemDescription,
		getFolderBookmarks : getFolderBookmarks
	};
})();


// *****************************************************************************
// Public API
exports.BookmarkManager = BookmarkManager;
