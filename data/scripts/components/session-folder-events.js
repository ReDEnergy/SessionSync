define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	// App
	const { AppConfig } = require('../config');
	const { SessionSyncModel } = require('./session-sync-model');

	// Utils
	const { WindowEvents } = require('../utils/global-events');
	const { AutoScroll } = require('../utils/auto-scroll');
	const { DragContext } = require('../utils/drag-context');

	// *****************************************************************************
	// API

	// ----------------------------------------------------------------------------
	// Session Folder Events - delegated

	var SessionFolderEvents = function SessionFolderEvents(container)
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
						WindowEvents.emit(document, 'SelectSyncSession', bookmarkContext);
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
			if (bookmarkContext)
			{
				WindowEvents.emit(document, 'SessionContextMenu-Open', {
					context: bookmarkContext.bookmark.id,
					event: e
				});
			}
			else {
				WindowEvents.emit(document, 'SessionListMenu-Open', { event: e });
			}
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

	// ----------------------------------------------------------------------------
	// History Session Folder Events - delegated

	var SessionHistoryEvents = function SessionHistoryEvents(container)
	{
		var historyContext = null;

		function getAttribute(target, attribute) {
			try {
				return target.getAttribute(attribute);
			}
			catch (err) {
				console.log(err);
				return null;
			}
		}

		var onMouseDown = function onMouseDown(e)
		{
			if (e.button != 2)
				return;

			var target = e.target;
			if (target.className == 'history-node') {
				WindowEvents.emit(document, 'HistorySessionCtxMenu-Open', {
					context: e.target,
					event: e
				});
			}
			else
			{
				WindowEvents.emit(document, 'HistoryListCtxMenu-Open', {event: e });
			}
		};

		var onClick = function onClick(e)
		{
			if (e.target.className === 'history-node')
			{
				// WindowEvents.emit(document, 'HistoryListCtxMenu-Open', {event: e });
				// this.selectHistorySession(e.target);
			}
		};

		// ------------------------------------------------------------------------
		// Init Code Events

		container.addEventListener('click', onClick);
		container.addEventListener('mousedown', onMouseDown);
	};

	// *****************************************************************************
	// Public API

	exports.SessionFolderEvents = SessionFolderEvents;
	exports.SessionHistoryEvents = SessionHistoryEvents;

});