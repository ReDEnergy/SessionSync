'use strict';

// ************************************************************************
// Modules

import { AppConfig } from '../config';
import { BookmarkProperties } from '../../common/bookmark-properties';

// ************************************************************************
// API

export const BookmarkManager = (function BookmarkManager() {

	var getHostName = function getHostName(url) {
		try {
			return new URL(url).hostname;
		} catch (e) {
			return '';
		}
	};

	var getFaviconUrlFromStorage = function getFaviconUrlFromStorage(favIconUrl, callback) {
		var key = '@favIconUrl:' + getHostName(favIconUrl);
		return browser.storage.local.get(key)
			.then(function (obj) {
				if (obj[key]) {
					callback(obj[key]);
				}
			});
	};

	var getFaviconUrl = function getFaviconUrl(url, callback) {
		if (!url) return callback('');

		if (import.meta.env.BROWSER === 'firefox') {
			getFaviconUrlFromStorage(url, callback);
			return;
		}

		const faviconUrl = browser.runtime.getURL(`_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`);
		callback(faviconUrl);
		return;
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

	var createBookmarkFromTab = function createBookmarkFromTab(tab, parentId) {
		var url = tab.url;
		browser.runtime.sendMessage({ event: 'save-favicon', tab: tab });

		var title = tab.title;
		console.log('tab', tab);
		if (tab.cookieStoreId || tab.pinned) {
			title += BookmarkProperties.encode(tab);
		}

		return browser.bookmarks.create({
			url: url,
			title: title,
			parentId: parentId
		});

	};

	var createBookmark = function createBookmark(options) {
		// parentId possible values
		// root________
		// menu________
		// toolbar_____
		// unfiled_____

		return browser.bookmarks.create(options);
	};

	var openBookmark = function openBookmark(url, info) {

		console.log('openBookmark', url, info);

		var options = {
			url: url
		};

		if (AppConfig.isPanel() == false) {
			options.active = false;
			if (info.mode === 'activeTab') {
				info.mode = 'newTab';
			}
		}

		if (info.title) {
			var bookmarkInfo = BookmarkProperties.parseTitle(info.title);
			if (bookmarkInfo.properties.container) {
				options.cookieStoreId = bookmarkInfo.properties.container;
			}

			if (bookmarkInfo.properties.pinned) {
				options.pinned = true;
			}

			delete options.title;
		}

		browser.runtime.sendMessage({ event: 'open-tab', options: options, info: info });
	};

	var openHistoryTab = function openHistoryTab(tab, mode) {

		console.log('openHistoryTab', tab, mode);

		var options = {
			url: tab.url
		};

		if (AppConfig.isPanel() == false) {
			options.active = false;
			if (mode === 'activeTab') {
				mode = 'newTab';
			}
		}

		if (tab.cookieStoreId) {
			options.cookieStoreId = tab.cookieStoreId;
		}

		if (tab.pinned) {
			options.pinned = true;
		}

		browser.runtime.sendMessage({ event: 'open-tab', options: options, info: { mode: mode } });
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
		openHistoryTab: openHistoryTab,
		createBookmark: createBookmark,
		createBookmarkFromTab: createBookmarkFromTab,
		searchBookmarks: searchBookmarks,

		setTitle: setTitle,
		setLocation: setLocation,
		moveItem: moveItem,
		deleteItem: deleteItem,

		getFolderBookmarks: getFolderBookmarks
	};

})();