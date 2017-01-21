'use strict';

// *****************************************************************************
// SDK Modules
const { getFavicon } = require("sdk/places/favicon");
const tabs = require("sdk/tabs");
const clipboard = require("sdk/clipboard");
const { browserWindows } = require("sdk/windows");

// *****************************************************************************
// Custom Modules

const { AppConfig } = require('./config');
const { HTMLCreator } = require('./utils/dom');
const { EventDestroyer } = require('./utils/event-destroyer');
const { WindowEvents, GlobalEvents } = require('./utils/global-events');
const { DragNDrop } = require('./utils/drag-n-drop');
const { AutoScroll } = require('./utils/auto-scroll');
const { DragContext } = require('./components/drag-context');
const { SessionManager } = require('./session/management');
const { SessionSyncModel } = require('./session-sync-model');

// *****************************************************************************
// API

function setBookmarkFavicon(faviconNode, faviconURL)
{
	getFavicon(faviconURL).then(function(url) {
		faviconNode.style.background = 'url("' + url + '")';
		faviconNode.style.backgroundRepeat = 'no-repeat';
		faviconNode.style.backgroundPosition = 'center center';
		faviconNode.style.backgroundSize = 'contain';
	}, function (err) {
		// favicon not found
	});
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
	if (bookmark.isPinned) {
		box.setAttribute('pinned', '');
	}

	var favicon = DomElem('div', {class : 'favicon'});
	favicon.setAttribute('bookmarkID', bookmark.id);
	favicon.setAttribute('over', '');
	
	var title = DomElem('div', {class : 'text'});
	title.setAttribute('bookmarkID', bookmark.id);
	title.setAttribute('over', '');
	title.textContent = bookmark.title;

	box.appendChild(favicon);
	box.appendChild(title);

	setBookmarkFavicon(favicon, bookmark.url);

	// ------------------------------------------------------------------------
	// Public data

	this.document = document;
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
	this.DOMRoot.style.top = position * bookmarkOffset + 'em';
};

SessionBookmark.prototype.remove = function remove()
{
	var box = this.DOMRoot;
	if (box.parentElement)
		box.parentElement.removeChild(box);
};


// ----------------------------------------------------------------------------
// Session Events - delegated

var SessionBookmarkEvents = function SessionBookmarkEvents(document, container)
{
	var window = document.ownerGlobal;
	var startDragEvent = null;
	var trackingTelemetry = new Date();
	var moveTelemetry = new Date();
	var dragTriggered = false;
	var offsetRect = {};
	var bookmarkContext = null;
	var bookmarkHoverContextID = 0;
	var SyncModel = SessionSyncModel.getModel(document);

	function getMozWindowTab(windowIndex, tabIndex) {
		if (windowIndex == -1) {
			return browserWindows.activeWindow.tabs[tabIndex];
		}
		return browserWindows[windowIndex].tabs[tabIndex];
	}

	function getWindowID(e) {
		var ID = e.target.getAttribute('windowID');
		return ID ? ID | 0 : undefined;
	}	
	
	function getSessionID(e) {
		return e.target.getAttribute('sessionID') | 0;
	}	

	function getBookmarkID(e) {
		return e.target.getAttribute('bookmarkID') | 0;
	}

	function getTabID(e) {
		var ID = e.target.getAttribute('tabID');
		return ID ? ID | 0 : undefined;
	}
	
	var mouseUpActiveTab = function mouseUpActiveTab(e) {
		var tabID = getTabID(e);
		var windowIndex = getWindowID(e);
		var tab = getMozWindowTab(windowIndex, tabID);
		tab.window.activate();
		tab.activate();
		window.removeEventListener('mouseup', mouseUpActiveTab);
	};
	
	function openURL(url, newTab) {
		newTab ? tabs.open(url) : (tabs.activeTab.url = url);					
	}					
		
	// --------------------------------------------------------------
	// Session level 
	
	var sessionDblClick = function sessionDblClick(e)
	{
		var bookmarkID = getBookmarkID(e);
		if (bookmarkID != 0) {
			WindowEvents.emit(document, 'BookmarkCtxMenu-EditBookmark', bookmarkID);
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
			case 'restore':
			{
				var bookmarkID = getBookmarkID(e);
				if (bookmarkHoverContextID == bookmarkID)
					return;
		
				bookmarkHoverContextID = bookmarkID;
				WindowEvents.emit(document, 'ShowUrlBar', SessionSyncModel.bookmarks[bookmarkID].url);
				return;
			}
			
			// Window tab
			case 'current':
			{
				var tabID = getTabID(e);
				if (tabID != undefined) {
					var windowIndex = getWindowID(e);
					var tab = getMozWindowTab(windowIndex, tabID);
					var url = SessionManager.getTabURL(tab);
					WindowEvents.emit(document, 'ShowUrlBar', url);
				}
				return;
			}
			
			// History tab
			case 'history':
			{
				var url = e.target.getAttribute('url');
				WindowEvents.emit(document, 'ShowUrlBar', url);
				return;
			}			
		}
	};
	
	var mouseLeave = function mouseLeave(e)
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
			dragTriggered = true;
			
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
		var bookmarkID = getBookmarkID(e);
		
		// Test if changing
		if (bookmarkID != 0) {
			if (bookmarkContext.bookmarkID == bookmarkID) {
				// Preview the content if a click event was registered (mouse-up on the same DOM node)
				if (!dragTriggered) {
					var newTab = AppConfig.storage.bookmarkConfig.clickNewTab;
					var url = SessionSyncModel.bookmarks[bookmarkID].url;
					openURL(url, newTab);
				}
			} else {
					var indices = SessionSyncModel.moveBookmark(bookmarkContext.bookmarkID, bookmarkID);
			}
		} else {
			var sessionID = getSessionID(e);
			if (sessionID != 0) {
				SessionSyncModel.moveBookmarkTo(bookmarkContext.bookmarkID, sessionID);
			}			
		}
		
		if (dragTriggered) {
			AutoScroll.stop();
	
			bookmarkContext.DOMRoot.setAttribute('dragging', 'drop');
			bookmarkContext.DOMRoot.style.top = e.clientY - offsetRect.y + container.scrollTop + 'px';
			bookmarkContext.DOMRoot.style.left = e.clientX - offsetRect.x + 'px';
	
			window.setTimeout(function(){
				bookmarkContext.DOMRoot.removeAttribute('dragging');
				bookmarkContext.restorePosition();
			}, 50);
			window.removeEventListener('mousemove', mouseDragging);
		} 
		else {
			window.removeEventListener('mousemove', trackDragging);
		}
		
		window.removeEventListener('mouseup', mouseUp);
		DragContext.setContext(null);
	};
	
	var bookmarkMouseDown = function _bookmarkMouseDown(e)
	{
		var target = e.target;
		
		switch(SyncModel.state.session)
		{
			// if restore session preview
			case 'restore':
			{
				var bookmarkID = getBookmarkID(e);
				if (bookmarkID == 0) {
					return;
				}
				
				bookmarkContext = SyncModel.getBookmark(bookmarkID);
				
				if (e.button == 0)
				{
					startDragEvent = e;
					dragTriggered = false;
					window.addEventListener('mousemove', trackDragging);
					window.addEventListener('mouseup', mouseUp);
					return;
				}
				
				// Middle Click
				if (e.button == 1)
				{
					var newTab = AppConfig.storage.bookmarkConfig.clickNewTab;
					var url = SessionSyncModel.bookmarks[bookmarkID].url;
					openURL(url, !newTab);
					return;
				}
				
				// Right Click
				if (e.button == 2)
				{
					e.stopPropagation();
					WindowEvents.emit(document, 'BookmarkCtxMenu-Open', {
						context: bookmarkID,
						event: e
					});
				}				
				return;
			}
			
			// If active session preview 
			case 'current':
			{
				// If tab entry
				var tabID = getTabID(e);
				if (tabID != undefined) {
					window.addEventListener('mouseup', mouseUpActiveTab);
					return;
				}

				// If window entry
				var windowID = getWindowID(e);
				if (windowID != undefined) {
					if (browserWindows[windowID]) {
						browserWindows[windowID].activate();
					}
				}
			}
			
			// if history session preview
			case 'history':
			{
				e.stopPropagation();
				if (target.hasAttribute('url'))
				{
					var url = e.target.getAttribute('url');
					var newTab = AppConfig.storage.bookmarkConfig.clickNewTab;
					if (e.button == 0) openURL(url, newTab);
					if (e.button == 1) openURL(url, !newTab);
					if (e.button == 2) {
						e.stopPropagation();
						WindowEvents.emit(document, 'HistoryMarksCtxMenu-Open', {
							context: url,
							event: e
						});
					}
				}
				return;
			}			
		}		
	};
	
	// --------------------------------------------------------------
	// App Events
	
	
	// ------------------------------------------------------------------------
	// Init Code Events
	
	container.addEventListener('mousedown', bookmarkMouseDown);	
	EventDestroyer.add(container, 'mousedown', bookmarkMouseDown);		
	
	container.addEventListener('mouseover', mouseOver);
	container.addEventListener('mouseleave', mouseLeave);
	
	container.addEventListener('dblclick', sessionDblClick);
	EventDestroyer.add(container, 'dblclick', sessionDblClick);	
};

/*
 * SessionSeparator
 * Used as separator for different windows
 */

function SessionWindow(document, windowID, windowIndex, index)
{
	var DomElem = HTMLCreator(document);

	var box = DomElem('div', {class : 'window-separator'});
	box.style.top = index * bookmarkOffset + 'em';

	var text = DomElem('div', {class : 'text'});
	text.textContent = "Window " + windowIndex;
	text.setAttribute('windowID', windowID);

	box.appendChild(text);

	this.DOMRoot = box;
}

/*
 * SessionTab
 * Used for displaying tabs from the current window
 */

function SessionTab(document, tab, tabListIndex, indexOffset, windowIndex)
{
	var DomElem = HTMLCreator(document);

	var box = DomElem('div', {class : 'bookmark'});
	box.style.top = (tab.index + indexOffset) * bookmarkOffset + 'em';
	if (tab.isPinned) {
		box.setAttribute('pinned', tab.isPinned);
	}

	var favicon = DomElem('div', {class : 'favicon'});
	favicon.setAttribute('tabID', tabListIndex);
	favicon.setAttribute('windowID', windowIndex);
	favicon.setAttribute('over', '');

	var text = DomElem('div', {class : 'text'});
	text.setAttribute('tabID', tabListIndex);
	text.setAttribute('windowID', windowIndex);
	text.setAttribute('over', '');
	
	var url = SessionManager.getTabURL(tab);
	setBookmarkFavicon(favicon, url);

	text.textContent = tab.title;
	box.appendChild(favicon);
	box.appendChild(text);

	this.DOMRoot = box;
}

/*
 * SessionSeparator
 * Used as separator for different windows
 */

function HistoryWindow(document, windowID, index)
{
	var DomElem = HTMLCreator(document);

	var box = DomElem('div', {class : 'history-window-separator'});
	box.style.top = index * bookmarkOffset + 'em';

	var text = DomElem('div', {class : 'text'});
	text.textContent = "Window " + windowID;

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
	if (tab.isPinned) {
		box.setAttribute('pinned', tab.isPinned);
	}

	var favicon = DomElem('div', {class : 'favicon'});
	favicon.setAttribute('url', tab.url);
	favicon.setAttribute('over', '');

	var text = DomElem('div', {class : 'text'});
	text.setAttribute('url', tab.url);
	text.setAttribute('over', '');
	text.textContent = tab.title;
	
	setBookmarkFavicon(favicon, tab.url);

	box.appendChild(favicon);
	box.appendChild(text);

	this.DOMRoot = box;
}

var SortMethods = {

	'name-asc' : function sortByNameAscending(a, b) {
		return a.title_lowercase > b.title_lowercase;
	},
	
	'name-desc' : function sortByNameDescending(a, b) {
		return a.title_lowercase < b.title_lowercase;
	},

	'position-asc' : function sortByPositionAscending(a, b) {
		return a.position > b.position;
	},

	'position-desc' : function sortByPositionDescending(a, b) {
		return a.position < b.position;
	},

	'date-asc' : function sortByDateAscending(a, b) {
		return a.date > b.date;
	},

	'date-desc' : function sortByDateDescending(a, b) {
		return a.date < b.date;
	}
};

// *****************************************************************************
// Public API

exports.SessionBookmark = SessionBookmark;
exports.SessionBookmarkEvents = SessionBookmarkEvents;
exports.SessionTab = SessionTab;
exports.SessionWindow = SessionWindow;
exports.HistoryWindow = HistoryWindow;
exports.HistoryTab = HistoryTab;