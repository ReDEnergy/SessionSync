'use strict';

// ************************************************************************
// Modules

import { AppConfig } from '../config';

// ************************************************************************
// API

export const BookmarkManager = (function BookmarkManager() {

	var lazyLoadingUrl = browser.runtime.getURL('public/lazy/lazy.html');

	function getLazyLoadingParameters(url) {
		let paramater = {};
		let splits = url.split('?');
		if (splits.length < 2) return paramater;
		let query = splits[1];
		let params = query.split('&');
		for (let p of params) {
			paramater[p.split('=')[0]] = decodeURIComponent(p.split('=')[1]);
		}
		return paramater;
	}

	var getHostName = function getHostName(url) {
		try {
			return new URL(url).hostname;
		} catch (e) {
			return '';
		}
	};

	var getFaviconUrl = function getFaviconUrl(favIconUrl, callback) {
		var key = '@favIconUrl:' + getHostName(favIconUrl);
		browser.storage.local.get(key)
			.then(function (obj) {
				if (obj[key]) {
					callback(obj[key]);
				}
			});
	};

	var getFolderBookmarks = function getFolderBookmarks(folderID, callback) {
		var result = browser.bookmarks.getChildren(folderID);
		result.then(callback, function fail() {
			console.log('Error getting bookmarks from folder ID: ', folderID);
		});
	};

	var searchBookmarks = function searchBookmarks(keyword) {
		return browser.bookmarks.search(keyword);
	};

	var getOpenMode = function getOpenMode(index) {
		var buttons = ['click', 'middleClick'];
		var state = AppConfig.get('bookmark.' + buttons[index] + '.newTab');
		return state ? 'newTab' : 'activeTab';
	};

	var containerSuffix = {
		encode: function (id) { return ' [container:' + id + ']'; },
		regex: /^(.*) \[container:([^\]]+)\]$/,
		default: 'firefox-default',
	};

	var createBookmarkFromTab = function createBookmarkFromTab(tab, parentId) {
		var url = tab.url;
		if (url.startsWith(lazyLoadingUrl, 0)) {
			var info = getLazyLoadingParameters(url);
			url = info.url;
		}
		else {
			browser.runtime.sendMessage({ event: 'save-favicon', tab: tab });
		}

		var title = tab.title;
		if (tab.cookieStoreId && tab.cookieStoreId !== containerSuffix.default) {
			title += containerSuffix.encode(tab.cookieStoreId);
		}

		return browser.bookmarks.create({
			url: url,
			title: title,
			parentId: parentId
		});

	};

	// Parse a [container:<id>] suffix from a bookmark title.
	// Returns { title, cookieStoreId } — cookieStoreId is null when absent.
	var parseContainerFromTitle = function parseContainerFromTitle(rawTitle) {
		var match = rawTitle && rawTitle.match(containerSuffix.regex);
		if (match) {
			return { title: match[1], cookieStoreId: match[2] };
		}
		return { title: rawTitle, cookieStoreId: null };
	};

	var createBookmark = function createBookmark(options) {
		// parentId possible values
		// root________
		// menu________
		// toolbar_____
		// unfiled_____

		return browser.bookmarks.create(options);
	};

	var openBookmark = function openBookmark(options) {
		if (AppConfig.isPanel() == false) {
			if (options.mode == 'activeTab') {
				options.mode = 'newTab';
				options.active = false;
			}
		}

		browser.runtime.sendMessage({ event: 'open-tab', options: options });
	};

	var setTitle = function setTitle(bookmark, title, callback) {
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

	var setLocation = function setLocation(bookmark, url) {
		browser.bookmarks.update(bookmark.id, {
			url: url
		}).then(function success() {
			bookmark.url = url;
		}, function error() {
			throw 'error';
		});
	};

	var moveItem = function moveItem(itemID, newParentID, index, callback, errorCallback) {
		browser.bookmarks.move(itemID, {
			parentId: newParentID,
			index: index
		})
			.then(callback, errorCallback);
	};

	var deleteItem = function deleteItem(itemID, isFolder, callback, errorCallback) {
		if (isFolder) {
			browser.bookmarks.removeTree(itemID)
				.then(callback, errorCallback);
		}
		else {
			browser.bookmarks.remove(itemID)
				.then(callback, errorCallback);
		}
	};

	return {
		getFaviconUrl: getFaviconUrl,
		getOpenMode: getOpenMode,
		openBookmark: openBookmark,
		createBookmark: createBookmark,
		createBookmarkFromTab: createBookmarkFromTab,
		parseContainerFromTitle: parseContainerFromTitle,
		searchBookmarks: searchBookmarks,

		setTitle: setTitle,
		setLocation: setLocation,
		moveItem: moveItem,
		deleteItem: deleteItem,

		getFolderBookmarks: getFolderBookmarks
	};

})();