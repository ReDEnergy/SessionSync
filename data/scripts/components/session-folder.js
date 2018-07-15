define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	// App
	const { AppConfig } = require('../config');
	const { SessionSyncModel } = require('./session-sync-model');

	// Utils
	const { HTMLCreator } = require('../utils/dom');
	const { WindowEvents } = require('../utils/global-events');
	const { AutoScroll } = require('../utils/auto-scroll');
	const { DragContext } = require('../utils/drag-context');

	// *****************************************************************************
	// API

	/*
	* Session Bookmark
	* Used for interacting with a Firefox bookmark item
	*/
	function SessionFolder(bookmark)
	{
		var DomElem = HTMLCreator();
		var folder = DomElem('div', {class: 'folder', type: bookmark.type});
		folder.setAttribute('sessionID', bookmark.id);

		this.DOMRoot = folder;
		this.updateFrom(bookmark);

		// ------------------------------------------------------------------------
		// Public data

		this.visible = true;
		this.bookmarkID = bookmark.id;
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
		if (this.position == position)
			return;

		this.position = position;
		this.DOMRoot.style.top = (position * this.folderOffset).toFixed(2) + 'em';
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
		var startDragEvent = null;
		var trackingTelemetry;
		var offsetRect = {};
		var bookmarkContext = null;
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

		function getBookmarkID(e) {
			return getAttribute(e.target, 'sessionID');
		}

		// --------------------------------------------------------------
		// Drag Events

		var trackDragging = function _mouseMove(e)
		{
			var delta = Math.abs(startDragEvent.clientX - e.clientX) > 5 || Math.abs(startDragEvent.clientY - e.clientY) > 5;
			if (delta) {
				DragContext.setContext(bookmarkContext);
				trackingTelemetry = new Date();

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
			// Test if changing
			if (e.target.className == 'folder')
			{
				var sessionID = getBookmarkID(e);

				// Preview the content if a click event was registered (mouse-up on the same DOM node)
				if (bookmarkContext.bookmarkID == sessionID)
				{
					if (!DragContext.hasContext()) {
						SessionList.selectSyncSession(bookmarkContext, false);
					}
				}
				else
				{
					if (AppConfig.get('session.sorting') === 'position-asc')
					{
						SessionSyncModel.moveBookmark(bookmarkContext.bookmarkID, sessionID);
					}
					else
					{
						WindowEvents.emit(document, 'Notification', {
							message: 'Rearage function available only when items are sorted ascending by position',
							timeout: 3000,
						});
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

		var folderMouseDown = function _folderMouseDown(e)
		{
			if (DragContext.hasContext()) {
				cancelDragging(e);
				return;
			}

			var sessionID = getBookmarkID(e);
			bookmarkContext = SyncModel.getBookmark(sessionID);

			if (e.button == 0) {
				startDragEvent = e;
				window.addEventListener('mousemove', trackDragging);
				window.addEventListener('mouseup', mouseUp);
				return;
			}
		};

		var folderContextMenu = function folderContextMenu(e)
		{
			WindowEvents.emit(document, 'SessionContextMenu-Open', {
				context: bookmarkContext.bookmark.id,
				event: e
			});
		};

		var sessionDblClick = function sessionDblClick(e)
		{
			if (bookmarkContext)
			{
				var type = e.target.getAttribute('type');
				switch (type)
				{
					case 'folder':
						WindowEvents.emit(document, 'SessionContextMenu-EditSession', bookmarkContext.bookmarkID);
						break;

					case 'bookmark':
						WindowEvents.emit(document, 'BookmarkCtxMenu-EditBookmark', bookmarkContext.bookmarkID);
						break;
				}
			}
		};

		// ------------------------------------------------------------------------
		// Init Code Events

		container.addEventListener('dblclick', sessionDblClick);
		container.addEventListener('mousedown', folderMouseDown);
		container.addEventListener('contextmenu', folderContextMenu);
	};


	var SortMethods = {

		'name-asc' : function sortByNameAscending(a, b) {
			return a.bookmark.title_lowercase > b.bookmark.title_lowercase;
		},

		'name-desc' : function sortByNameDescending(a, b) {
			return a.bookmark.title_lowercase < b.bookmark.title_lowercase;
		},

		'position-asc' : function sortByPositionAscending(a, b) {
			return a.bookmark.index > b.bookmark.index;
		},

		'position-desc' : function sortByPositionDescending(a, b) {
			return a.bookmark.index < b.bookmark.index;
		},

		'date-asc' : function sortByDateAscending(a, b) {
			return a.bookmark.dateAdded > b.bookmark.dateAdded;
		},

		'date-desc' : function sortByDateDescending(a, b) {
			return a.bookmark.dateAdded < b.bookmark.dateAdded;
		}
	};

	// *****************************************************************************
	// Public API
	exports.SessionFolder = SessionFolder;
	exports.SessionFolderSortBy = SortMethods;
	exports.SessionFolderEvents = SessionFolderEvents;

});