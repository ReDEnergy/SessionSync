define(function(require, exports) {

	'use strict';

	// *****************************************************************************
	// Custom Modules

	const { HTMLCreator } = require('../utils/dom');
	const { AutoScroll } = require('../utils/auto-scroll');

	const { BookmarkManager } = require('../session/bookmarks');

	// *****************************************************************************
	// API

	const bookmarkOffset = 2.2; // height + 2 in em

	function setTabFavicon(faviconNode, faviconURL)
	{
		faviconNode.style.background = 'url("' + faviconURL + '")';
		faviconNode.style.backgroundRepeat = 'no-repeat';
		faviconNode.style.backgroundPosition = 'center center';
		faviconNode.style.backgroundSize = 'contain';
	}

	/*
	* Session Bookmark
	* Used for interacting with a Firefox bookmark item
	*/

	function SessionBookmark(bookmark)
	{
		var DomElem = HTMLCreator();

		var box = DomElem('div', {class : 'bookmark'});
		box.setAttribute('pinned', bookmark.pinned);

		var favicon = DomElem('div', {class : 'favicon'});
		favicon.setAttribute('bookmarkID', bookmark.id);
		favicon.setAttribute('over', '');

		var title = DomElem('div', {class : 'text'});
		title.setAttribute('bookmarkID', bookmark.id);
		title.setAttribute('over', '');
		title.textContent = bookmark.title;

		box.appendChild(favicon);
		box.appendChild(title);

		BookmarkManager.getFaviconUrl(bookmark.url, function (url) {
			setTabFavicon(favicon, url);
		});

		// ------------------------------------------------------------------------
		// Public data

		this.bookmark = bookmark;
		this.DOMtitle = title;
		this.DOMfavicon = favicon;
		this.bookmarkID = bookmark.id;
		this.DOMRoot = box;
	}

	SessionBookmark.prototype.setTitle = function setTitle(title)
	{
		this.DOMtitle.textContent = title;
	};

	SessionBookmark.prototype.restorePosition = function restorePosition()
	{
		this.DOMRoot.style.left = '0px';
		this.DOMRoot.style.top = this.position * bookmarkOffset + 'em';
	};

	SessionBookmark.prototype.setVirtualPosition = function setVirtualPosition(position)
	{
		this.position = position;
		// this.DOMtitle.textContent = '[' + position + '] ' + this.bookmark.title,
		this.DOMRoot.style.top = position * bookmarkOffset + 'em';
	};

	SessionBookmark.prototype.remove = function remove()
	{
		var box = this.DOMRoot;
		if (box.parentElement)
			box.parentElement.removeChild(box);
	};

	SessionBookmark.prototype.highlight = function highlight()
	{
		this.DOMRoot.setAttribute('highlight', 'true');
		setTimeout(function() {
			this.DOMRoot.removeAttribute('highlight');
		}.bind(this), 2000);

		var offsetStep = this.DOMRoot.clientHeight;
		var parentNode = this.DOMRoot.parentElement;
		var offset = this.DOMRoot.offsetTop - parentNode.clientHeight / 2 + offsetStep;
		AutoScroll.scrollTo(parentNode, offset, 0.25);
	};

	/*
	* SessionWindow
	* Used as separator for different windows
	*/

	function SessionWindow(windowID, windowIndex, index)
	{
		var DomElem = HTMLCreator();

		var box = DomElem('div', {class : 'window-separator'});
		box.style.top = index * bookmarkOffset + 'em';

		var text = DomElem('div', {class : 'text'});
		text.textContent = 'Window ' + (windowIndex + 1);
		text.setAttribute('windowID', windowID);

		box.appendChild(text);

		this.DOMRoot = box;
	}

	/*
	* SessionTab
	* Used for displaying tabs from the current window
	*/

	function SessionTab(tab, indexOffset)
	{
		var DomElem = HTMLCreator();

		var box = DomElem('div', {class : 'bookmark'});
		box.style.top = (tab.index + indexOffset) * bookmarkOffset + 'em';
		box.setAttribute('pinned', tab.pinned);
		box.setAttribute('url', tab.url);

		var favicon = DomElem('div', {class : 'favicon'});
		favicon.setAttribute('tabID', tab.id);
		favicon.setAttribute('windowID', tab.windowId);
		favicon.setAttribute('url', tab.url);
		favicon.setAttribute('over', '');

		var text = DomElem('div', {class : 'text'});
		text.setAttribute('tabID', tab.id);
		text.setAttribute('windowID', tab.windowId);
		text.setAttribute('url', tab.url);
		text.setAttribute('over', '');

		if (tab.favIconUrl) {
			setTabFavicon(favicon, tab.favIconUrl);
		}

		text.textContent = tab.title;
		box.appendChild(favicon);
		box.appendChild(text);

		this.tab = tab;
		this.position = tab.index + indexOffset;
		this.DOMRoot = box;
	}

	SessionTab.prototype.restorePosition = function restorePosition()
	{
		this.DOMRoot.style.left = '0px';
		this.DOMRoot.style.top = this.position * bookmarkOffset + 'em';
	};

	/*
	* SessionSeparator
	* Used as separator for different windows
	*/

	function HistoryWindow(sessionWindowInfo, windowID, index)
	{
		var DomElem = HTMLCreator();

		var box = DomElem('div', {class : 'history-window-separator'});
		box.style.top = index * bookmarkOffset + 'em';
		box.setAttribute('windowID', windowID);

		var text = DomElem('div', {class : 'text'});
		text.setAttribute('windowID', windowID);
		text.textContent = 'Window ' + windowID;

		if (!sessionWindowInfo.active) {
			text.textContent += ' (closed)';
		}

		box.appendChild(text);

		this.DOMRoot = box;
	}

	/*
	* HistoryTab
	* Used for displaying tabs from the history windows
	*/

	function HistoryTab(tab, indexOffset)
	{
		var DomElem = HTMLCreator();

		var box = DomElem('div', {class : 'bookmark'});
		box.style.top = (tab.index + indexOffset) * bookmarkOffset + 'em';
		box.setAttribute('url', tab.url);
		box.setAttribute('pinned', tab.pinned);

		var favicon = DomElem('div', {class : 'favicon'});
		favicon.setAttribute('url', tab.url);
		favicon.setAttribute('over', '');

		var text = DomElem('div', {class : 'text'});
		text.setAttribute('url', tab.url);
		text.setAttribute('over', '');
		text.textContent = tab.title;

		if (tab.favIconUrl)	{
			setTabFavicon(favicon, tab.favIconUrl);
		}

		box.appendChild(favicon);
		box.appendChild(text);

		this.DOMRoot = box;
	}

	// var SortMethods = {

	// 	'name-asc' : function sortByNameAscending(a, b) {
	// 		return a.title_lowercase > b.title_lowercase;
	// 	},

	// 	'name-desc' : function sortByNameDescending(a, b) {
	// 		return a.title_lowercase < b.title_lowercase;
	// 	},

	// 	'position-asc' : function sortByPositionAscending(a, b) {
	// 		return a.index > b.index;
	// 	},

	// 	'position-desc' : function sortByPositionDescending(a, b) {
	// 		return a.index < b.index;
	// 	},

	// 	'date-asc' : function sortByDateAscending(a, b) {
	// 		return a.date > b.date;
	// 	},

	// 	'date-desc' : function sortByDateDescending(a, b) {
	// 		return a.date < b.date;
	// 	}
	// };

	// *****************************************************************************
	// Public API

	exports.SessionBookmark = SessionBookmark;
	exports.SessionTab = SessionTab;
	exports.SessionWindow = SessionWindow;
	exports.HistoryWindow = HistoryWindow;
	exports.HistoryTab = HistoryTab;
});