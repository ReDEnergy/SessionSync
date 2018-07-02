define(function(require, exports) {

	'use strict';

	// *****************************************************************************
	// Custom Modules

	const { AppConfig } = require('../config');
	const { HTMLCreator } = require('../utils/dom');
	const { WindowEvents } = require('../utils/global-events');
	const { AutoScroll } = require('../utils/auto-scroll');
	const { DragContext } = require('../utils/drag-context');
	const { SessionSyncModel } = require('./session-sync-model');

	const { SessionManager } = require('../session/management');
	const { BookmarkManager } = require('../session/bookmarks');

	// *****************************************************************************
	// API

	function setTabFavicon(faviconNode, faviconURL)
	{
		faviconNode.style.background = 'url("' + faviconURL + '")';
		faviconNode.style.backgroundRepeat = 'no-repeat';
		faviconNode.style.backgroundPosition = 'center center';
		faviconNode.style.backgroundSize = 'contain';
	}

	const bookmarkOffset = 2.2; // height + 2 in em

	/*
	* Session Bookmark
	* Used for interacting with a Firefox bookmark item
	*/

	function SessionBookmark(document, bookmark)
	{
		var DomElem = HTMLCreator(document);

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

	// ----------------------------------------------------------------------------
	// Session Events - delegated

	var SessionBookmarkEvents = function SessionBookmarkEvents(document, container)
	{
		var startDragEvent = null;
		var trackingTelemetry = new Date();
		var offsetRect = {};
		var bookmarkContext = null;
		var bookmarkHoverContextID = 0;
		var SyncModel = SessionSyncModel.getModel(document);

		function getAttribute(target, attribute) {
			try {
				return target.getAttribute(attribute);
			}
			catch (err) {
				console.log(err);
				return null;
			}
		}

		function getSessionID(e) {
			return getAttribute(e.target, 'sessionID');
		}

		function getBookmarkID(e) {
			return getAttribute(e.target, 'bookmarkID');
		}

		function getTabURL(e) {
			return getAttribute(e.target, 'url');
		}

		function getTabID(e) {
			var ID = getAttribute(e.target, 'tabID');
			return ID ? ID | 0 : undefined;
		}

		function getWindowID(e) {
			var ID = getAttribute(e.target, 'windowID');
			return ID ? ID | 0 : undefined;
		}

		// --------------------------------------------------------------
		// Session level

		var bookmarkDblClick = function sessionDblClick(e)
		{
			if (SyncModel.state.session == 'restore')
			{
				var bookmarkID = getBookmarkID(e);
				if (bookmarkID != null) {
					WindowEvents.emit(document, 'BookmarkCtxMenu-EditBookmark', bookmarkID);
				}
			}
		};

		var mouseOver = function mouseOver(e)
		{
			if (!e.target.hasAttribute('over')) {
				return;
			}

			switch(SyncModel.state.session)
			{
				// Bookmark entry
				case 'restore': {
					var bookmarkID = getBookmarkID(e);
					if (bookmarkHoverContextID == bookmarkID)
						return;

					bookmarkHoverContextID = bookmarkID;
					WindowEvents.emit(document, 'ShowUrlBar', SessionSyncModel.bookmarks[bookmarkID].url);
					return;
				}

				// Window tab
				case 'current': {
					var tabID = getTabID(e);
					if (tabID != undefined) {
						let url = getTabURL(e);
						WindowEvents.emit(document, 'ShowUrlBar', url);
					}
					return;
				}

				// History tab
				case 'history': {
					let url = getTabURL(e);
					WindowEvents.emit(document, 'ShowUrlBar', url);
					return;
				}
			}
		};

		var mouseLeave = function mouseLeave()
		{
			WindowEvents.emit(document, 'HideUrlBar');
		};

		// --------------------------------------------------------------
		// Mouse Events

		var trackDragging = function _mouseMove(e)
		{
			var delta = Math.abs(startDragEvent.clientX - e.clientX) > 5 || Math.abs(startDragEvent.clientY - e.clientY) > 5;
			if (delta)
			{
				DragContext.setContext(bookmarkContext);
				trackingTelemetry = new Date();

				offsetRect = container.parentElement.getBoundingClientRect();
				offsetRect.relativeY = offsetRect.y - container.parentElement.offsetTop;
				offsetRect.relativeX = offsetRect.x - container.parentElement.offsetLeft;

				bookmarkContext.DOMRoot.style.top = e.clientY - offsetRect.relativeY + 'px';
				bookmarkContext.DOMRoot.style.left = e.clientX - offsetRect.relativeX  + 'px';
				bookmarkContext.DOMRoot.setAttribute('dragging', '');

				// Events
				window.addEventListener('mousemove', mouseDragging);
				window.removeEventListener('mousemove', trackDragging);
			}
		};

		var cancelDragging = function cancelDragging(e)
		{
			AutoScroll.stop();

			bookmarkContext.DOMRoot.setAttribute('dragging', 'drop');
			bookmarkContext.DOMRoot.style.top = e.clientY - offsetRect.y + container.scrollTop + 'px';
			bookmarkContext.DOMRoot.style.left = e.clientX - offsetRect.x + 'px';

			setTimeout(function() {
				bookmarkContext.DOMRoot.removeAttribute('dragging');
				bookmarkContext.restorePosition();
			}, 50);
			window.removeEventListener('mousemove', mouseDragging);

			DragContext.clearContext();
		};

		var mouseDragging = function mouseMove(e)
		{
			if (this != window)
				return;

			var deltaTime = new Date() - trackingTelemetry;
			if (deltaTime < 16) {
				return;
			}

			var tryScroll = e.clientX > offsetRect.left && e.clientX < offsetRect.right;

			if (tryScroll)
			{
				if (e.clientY < offsetRect.top) {
					AutoScroll.scroll(container, (e.clientY - offsetRect.top));
				}
				else if (e.clientY > offsetRect.bottom) {
					AutoScroll.scroll(container, (e.clientY - offsetRect.bottom));
				} else {
					AutoScroll.stop();
				}
			} else {
				AutoScroll.stop();
			}

			bookmarkContext.DOMRoot.style.top = e.clientY - offsetRect.relativeY + 'px';
			bookmarkContext.DOMRoot.style.left = e.clientX - offsetRect.relativeX  + 'px';
			trackingTelemetry = new Date();
		};

		var mouseUp = function _mouseUp(e)
		{
			switch(SyncModel.state.session)
			{
				// if restore session preview
				case 'restore': {
					var bookmarkID = getBookmarkID(e);

					// Test if changing
					if (bookmarkID != null)
					{
						if (bookmarkContext.bookmarkID == bookmarkID) {
							// Preview the content if a click event was registered (mouse-up on the same DOM node)
							if (!DragContext.hasContext()) {
								BookmarkManager.openBookmark({
									url: SessionSyncModel.bookmarks[bookmarkID].url,
									mode: BookmarkManager.getOpenMode(0),
									favicon: false,
								});
							}
						}
						else
						{
							if (SessionSyncModel.bookmarks[bookmarkID] != undefined)
							{
								SessionSyncModel.moveBookmark(bookmarkContext.bookmarkID, bookmarkID);
							}
						}
					}
					else
					{
						var sessionID = getSessionID(e);
						if (sessionID != null && SessionSyncModel.bookmarks[sessionID] != undefined) {
							SessionSyncModel.moveBookmarkTo(bookmarkContext.bookmarkID, sessionID);
						}
					}
					break;
				}

				case 'current': {
					let tabID = getTabID(e);
					let tabContext = SyncModel.tabs[tabID];

					if (tabContext) {
						if (tabContext != bookmarkContext)
						{
							SessionManager.moveTab(bookmarkContext.tab.id, tabContext.tab.index, tabContext.tab.windowId);
						}
						else
						{
							if (tabID) {
								SessionManager.activateTab(tabID);
								var windowID = getWindowID(e);
								if (windowID) {
									SessionManager.activateWindow(windowID);
								}
							}
						}
					}
				}
			}

			if (DragContext.hasContext())
			{
				cancelDragging(e);
			}
			else
			{
				window.removeEventListener('mousemove', trackDragging);
			}

			window.removeEventListener('mouseup', mouseUp);
		};

		var bookmarkMouseDown = function _bookmarkMouseDown(e)
		{
			var target = e.target;
			if (DragContext.hasContext()) {
				cancelDragging(e);
				return;
			}

			switch(SyncModel.state.session)
			{
				// if restore session preview
				case 'restore': {
					var bookmarkID = getBookmarkID(e);
					if (bookmarkID == null) {
						return;
					}

					bookmarkContext = SyncModel.getBookmark(bookmarkID);

					if (e.button == 0)
					{
						startDragEvent = e;
						window.addEventListener('mousemove', trackDragging);
						window.addEventListener('mouseup', mouseUp);
						return;
					}

					// Middle Click
					if (e.button == 1)
					{
						BookmarkManager.openBookmark({
							url: SessionSyncModel.bookmarks[bookmarkID].url,
							mode: BookmarkManager.getOpenMode(1),
							favicon: false,
						});
						return;
					}

					return;
				}

				// If active session preview
				case 'current': {

					if (e.button == 0)
					{
						let tabID = getTabID(e);
						if (tabID != undefined) {
							bookmarkContext = SyncModel.tabs[tabID];
							if (bookmarkContext != undefined) {
								startDragEvent = e;
								window.addEventListener('mousemove', trackDragging);
								window.addEventListener('mouseup', mouseUp);
								return;
							}
						}
						else {
							let windowID = getWindowID(e);
							if (windowID) {
								SessionManager.activateWindow(windowID);
							}
						}
					}
					return;
				}

				// if history session preview
				case 'history': {
					if (target.hasAttribute('url'))
					{
						let url = getTabURL(e);

						switch (e.button)
						{
							case 0:
							case 1: {
								BookmarkManager.openBookmark({
									url: url,
									mode: BookmarkManager.getOpenMode(e.button)
								});

								break;
							}
						}
					}
					else
					{
						if (e.button == 0)
						{
							let windowID = getWindowID(e);
							if (windowID != undefined) {
								WindowEvents.emit(document, 'HistorySessionRestoreWindow', windowID);
							}
						}
					}
					return;
				}
			}
		};

		var bookmarkContextMenu = function bookmarkContextMenu(e)
		{
			switch (SyncModel.state.session)
			{
				case 'restore': {
					var bookmarkID = getBookmarkID(e);
					if (bookmarkID == null)
						return;

					WindowEvents.emit(document, 'BookmarkCtxMenu-Open', {
						context: bookmarkID,
						event: e
					});
					break;
				}

				case 'history': {
					let url = getTabURL(e);
					if (url) {
						WindowEvents.emit(document, 'HistoryMarksCtxMenu-Open', {
							context: url,
							event: e
						});
					}
				}
			}
		};

		// --------------------------------------------------------------
		// App Events


		// ------------------------------------------------------------------------
		// Init Code Events

		container.addEventListener('scroll', function () {
			AppConfig.set('state.scrollTop.' + SyncModel.state.session, container.scrollTop);
		});
		container.addEventListener('contextmenu', bookmarkContextMenu);
		container.addEventListener('mousedown', bookmarkMouseDown);

		container.addEventListener('mouseover', mouseOver);
		container.addEventListener('mouseleave', mouseLeave);

		container.addEventListener('dblclick', bookmarkDblClick);
	};

	/*
	* SessionWindow
	* Used as separator for different windows
	*/

	function SessionWindow(document, windowID, windowIndex, index)
	{
		var DomElem = HTMLCreator(document);

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

	function SessionTab(document, tab, indexOffset)
	{
		var DomElem = HTMLCreator(document);

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

	function HistoryWindow(document, windowID, index)
	{
		var DomElem = HTMLCreator(document);

		var box = DomElem('div', {class : 'history-window-separator'});
		box.style.top = index * bookmarkOffset + 'em';
		box.setAttribute('windowID', windowID);

		var text = DomElem('div', {class : 'text'});
		text.setAttribute('windowID', windowID);
		text.textContent = 'Window ' + windowID;

		box.appendChild(text);

		this.DOMRoot = box;
	}

	/*
	* HistoryTab
	* Used for displaying tabs from the history windows
	*/

	function HistoryTab(document, tab, indexOffset)
	{
		var DomElem = HTMLCreator(document);

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
	exports.SessionBookmarkEvents = SessionBookmarkEvents;
	exports.SessionTab = SessionTab;
	exports.SessionWindow = SessionWindow;
	exports.HistoryWindow = HistoryWindow;
	exports.HistoryTab = HistoryTab;
});