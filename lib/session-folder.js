'use strict';

// *****************************************************************************
// Custom Modules

// App
const { SessionSyncModel } = require('./session-sync-model');

// Utils
const { HTMLCreator } = require('./utils/dom');
const { EventDestroyer } = require('./utils/event-destroyer');
const { WindowEvents } = require('./utils/global-events');
const { AutoScroll } = require('./utils/auto-scroll');

// Components
const { DragContext } = require('./components/drag-context');

// *****************************************************************************
// API

/*
 * Session Bookmark
 * Used for interacting with a Firefox bookmark item
 */
function SessionFolder(document, bookmark)
{
	var DomElem = HTMLCreator(document);
	var folder = DomElem('div', {class: 'folder'});
	folder.textContent = bookmark.title;
	folder.setAttribute('sessionID', bookmark.id);

	// ------------------------------------------------------------------------
	// Public data

	this.visible = true;
	this.document = document;
	this.bookmark = bookmark;
	this.bookmark.title_lowercase = this.bookmark.title.toLowerCase();
	this.bookmarkID = bookmark.id;
	this.DOMRoot = folder;
}

SessionFolder.prototype.folderOffset = 2.7; // em;

SessionFolder.prototype.updateFrom = function updateFrom(bookmark)
{
	this.bookmark = bookmark;
	this.bookmark.title_lowercase = this.bookmark.title.toLowerCase();
	this.setTitle(bookmark.title);
};

SessionFolder.prototype.isVisible = function isVisible()
{
	return this.visible;
};

SessionFolder.prototype.setVisible = function setVisible()
{
	this.visible = true;
	this.DOMRoot.removeAttribute('filter');
};

SessionFolder.prototype.match = function match(expression)
{
	var name = this.bookmark.title_lowercase;
	if (name.indexOf(expression) != -1) {
		this.visible = true;
		this.DOMRoot.removeAttribute('filter');
		return true;	
	}
	
	this.visible = false;
	this.DOMRoot.setAttribute('filter', '');
	return false;
};

SessionFolder.prototype.restorePosition = function restorePosition() 
{
	this.DOMRoot.style.left = '0px';
	this.DOMRoot.style.top = this.position * this.folderOffset + 'em';
};

SessionFolder.prototype.setVirtualPosition = function setVirtualPosition(position) 
{
	this.position = position;
	this.DOMRoot.style.top = position * this.folderOffset + 'em';
};

SessionFolder.prototype.setTitle = function setTitle(title)
{
	this.DOMRoot.textContent = title;
};

SessionFolder.prototype.remove = function remove()
{
	var box = this.DOMRoot;
	if (box.parentElement)
		box.parentElement.removeChild(box);
};

// ----------------------------------------------------------------------------
// Session Events - delegated 

var SessionFolderEvents = function SessionFolderEvents(document, container, SessionList)
{
	var window = document.ownerGlobal;
	var startDragEvent = null;
	var trackingTelemetry;
	var offsetRect = {};
	var dragTriggered = false;
	var bookmarkContext = null;
	var SyncModel = SessionSyncModel.getModel(document);

	function getBookmarkID(e) {
		return e.target.getAttribute('sessionID') | 0;
	}	
	
	// --------------------------------------------------------------
	// Session level 
	
	var sessionDblClick = function sessionDblClick(e)
	{
		if (e.target.className == 'folder' && bookmarkContext)
			WindowEvents.emit(document, 'SessionContextMenu-EditSession', bookmarkContext.bookmarkID);
	};
	
	// --------------------------------------------------------------
	// Drag Events
	
	var trackDragging = function _mouseMove(e)
	{
		var delta = Math.abs(startDragEvent.clientX - e.clientX) > 5 || Math.abs(startDragEvent.clientY - e.clientY) > 5; 
		if (delta) {
			dragTriggered = true;
			DragContext.setContext(bookmarkContext);
			trackingTelemetry = new Date();
	
			// TODO - offsetParent should be the parentElement
			offsetRect = container.parentElement.parentElement.getBoundingClientRect();
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
		// Test if changing 
		if (e.target.className == 'folder')
		{
			var sessionID = getBookmarkID(e);
			
			// Preview the content if a click event was registered (mouse-up on the same DOM node)
			if (bookmarkContext.bookmarkID == sessionID) {
				if (!dragTriggered) {
					SessionList.setSelectedNode(e.target);
					WindowEvents.emit(document, 'ViewSession', sessionID);
				}
			} else {
				if (SessionList.sortMethod === 'position-asc') {
					SessionSyncModel.moveBookmark(bookmarkContext.bookmarkID, sessionID);
				} else {
					WindowEvents.emit(document, 'Notification', {
						message: 'Rearage function available only when items are sorted ascending by position',
						timeout: 4000,
					});	
				}
			}
		}
		
		if (dragTriggered)
		{
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
	
	var folderMouseDown = function _folderMouseDown(e) {
		
		if (e.target.className != 'folder') {
			
			if (e.button == 2 && e.target.className == 'list') {
				e.stopPropagation();
				WindowEvents.emit(document, 'SessionListContextMenu-Open', { event: e });						
			}
			
			return;
		}
		
		var sessionID = getBookmarkID(e);
		bookmarkContext = SyncModel.getBookmark(sessionID);
		
		if (e.button == 0) {
			startDragEvent = e;
			dragTriggered = false;
			window.addEventListener('mousemove', trackDragging);
			window.addEventListener('mouseup', mouseUp);
			return;
		}
		
		// Right Click
		if (e.button == 2) {
			e.stopPropagation();
			WindowEvents.emit(document, 'SessionContextMenu-Open', {
				context: bookmarkContext.bookmark.id,
				event: e
			});
		}
	};
	
	// ------------------------------------------------------------------------
	// Init Code Events
	
	container.addEventListener('mousedown', folderMouseDown);	
	EventDestroyer.add(container, 'mousedown', folderMouseDown);		
	
	container.addEventListener('dblclick', sessionDblClick);
	EventDestroyer.add(container, 'dblclick', sessionDblClick);	
};


var SortMethods = {
	
	'name-asc' : function sortByNameAscending(a, b) {
		return a.bookmark.title_lowercase > b.bookmark.title_lowercase;
	},
	
	'name-desc' : function sortByNameDescending(a, b) {
		return a.bookmark.title_lowercase < b.bookmark.title_lowercase;
	},

	'position-asc' : function sortByPositionAscending(a, b) {
		return a.bookmark.position > b.bookmark.position;
	},

	'position-desc' : function sortByPositionDescending(a, b) {
		return a.bookmark.position < b.bookmark.position;
	},

	'date-asc' : function sortByDateAscending(a, b) {
		return a.bookmark.date > b.bookmark.date;
	},

	'date-desc' : function sortByDateDescending(a, b) {
		return a.bookmark.date < b.bookmark.date;
	}
};

// *****************************************************************************
// Public API
exports.SessionFolder = SessionFolder;
exports.SessionFolderSortBy = SortMethods;
exports.SessionFolderEvents = SessionFolderEvents;
