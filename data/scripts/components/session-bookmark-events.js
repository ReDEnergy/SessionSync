define(function(require, exports) {

	'use strict';

	// *****************************************************************************
	// Custom Modules

	const { AppConfig } = require('../config');
	const { WindowEvents } = require('../utils/global-events');
	const { AutoScroll } = require('../utils/auto-scroll');
	const { DragContext } = require('../utils/drag-context');
	const { SessionSyncModel } = require('./session-sync-model');

	const { SessionManager } = require('../session/management');
	const { BookmarkManager } = require('../session/bookmarks');

	// *****************************************************************************
	// API

	// ----------------------------------------------------------------------------
	// Session Events - delegated

	var SessionBookmarkEvents = function SessionBookmarkEvents(container)
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

		function getTargetType(e) {
			return getAttribute(e.target, 'type');
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
									favicon: true,
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
						if (getTargetType(e) === 'folder')
						{
							var sessionID = getSessionID(e);
							if (sessionID != null && SessionSyncModel.bookmarks[sessionID] != undefined) {
								SessionSyncModel.moveBookmarkTo(bookmarkContext.bookmarkID, sessionID);
							}
						}
					}
					break;
				}

				case 'current': {
					let tabID = getTabID(e);
					let tabContext = SyncModel.tabs[tabID];

					if (tabContext)
					{
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
					else
					{
						if (getTargetType(e) === 'folder')
						{
							var savingSessionID = getSessionID(e);
							if (savingSessionID != null) {
								BookmarkManager.createBookmarkFromTab(bookmarkContext.tab, savingSessionID)
								.then(function() {
									WindowEvents.emit(document, 'Notification', {
										message: 'Saved',
									});
								});
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
							favicon: true,
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

	// *****************************************************************************
	// Public API

	exports.SessionBookmarkEvents = SessionBookmarkEvents;
});