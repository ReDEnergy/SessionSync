define(function(require, exports) {
	'use strict';

	// ************************************************************************
	// Modules

	// App
	const { AppConfig } = require('./config');

	// Utils
	const { HTMLCreator } = require('./utils/dom');
	const { WindowEvents, GlobalEvents } = require('./utils/global-events');

	const { ContextMenu } = require('./utils/context-menu');
	const { ConfirmBox } = require('./utils/confirm-box');
	const { FieldEditWdiget } = require('./utils/field-edit-widget');

	// Components
	const { Clipboard } = require('./components/clipboard');
	const { UrlBar } = require('./components/url-bar');
	const { TrashCan } = require('./components/trash-can');
	const { TooltipSystem } = require('./components/tooltip-system');
	const { SessionHotkeys } = require('./components/session-hotkeys');
	const { NotificationSystem } = require('./components/notification-system');
	const { ConfigPanel } = require('./components/config-panel');
	const { OverlaySystem } = require('./components/overlay-system');

	const { SessionHotkeyManager } = require('./components/session-hotkey-manager');
	const { SessionSorting } = require('./components/session-sorting');
	const { SessionFiltering } = require('./components/session-filtering');

	const { SessionHeaderBar } = require('./components/session-header-bar');
	const { SessionList } = require('./components/session-list');
	const { SessionContainer } = require('./components/session-container');
	const { SessionSyncModel } = require('./components/session-sync-model');
	const { SessionToolbar } = require('./components/session-toolbar');

	// Bookmarks
	const { SessionManager } = require('./session/management');
	const { BookmarkManager } = require('./session/bookmarks');

	// ************************************************************************
	// UI initilization

	var SessionSyncUI = function SessionSyncUI() {

		var DomElem = HTMLCreator(document);

		document.body.setAttribute('panel', AppConfig.isPanel());
		var content = document.getElementById('body');

		// ------------------------------------------------------------------------
		// UI Modules

		var configPanel = new ConfigPanel(document);
		content.appendChild(configPanel.DOMRoot);

		var tooltipSystem = new TooltipSystem(document);
		content.appendChild(tooltipSystem.DOMRoot);

		var notificationSystem = new NotificationSystem(document);
		content.appendChild(notificationSystem.DOMRoot);

		var hotekyManager = new SessionHotkeyManager(document);
		content.appendChild(hotekyManager.DOMRoot);

		var overlaySystem = new OverlaySystem(document);
		content.appendChild(overlaySystem.DOMRoot);

		// -------------------------------------------------------------
		// Create the UI
		var centralArea = DomElem('div', {class: 'sessions-area'});

		// -------------------------------------------------------------
		// Clipboard

		new Clipboard(document);

		// -------------------------------------------------------------
		// GlobalHotkeys

		new SessionHotkeys(document);

		// --------------------------------------------------------------------
		// Center area

		var headerBar = new SessionHeaderBar(document);
		var toolbar = new SessionToolbar(document);
		var sessionList = new SessionList(document);
		var searchBar = new SessionFiltering(document);
		var sessionContainer = new SessionContainer(document);
		var sessionSorting = new SessionSorting(document);

		headerBar.DOMRoot.appendChild(searchBar.DOMRoot);
		sessionList.DOMRoot.appendChild(sessionSorting.DOMRoot);

		var body = DomElem('div', {class: 'sessions-area-body'});
		body.appendChild(sessionList.DOMRoot);
		body.appendChild(sessionContainer.DOMRoot);

		var resizeHandle = DomElem('div', {class: 'panel-resize-handle'});

		// -------------------------------------------------------------
		// Trash can

		var trashCan = new TrashCan(document);
		centralArea.appendChild(trashCan.DOMRoot);

		// --------------------------------------------------------------------
		// URL bar

		var urlBar = new UrlBar(document);
		headerBar.DOMRoot.appendChild(urlBar.DOMRoot);

		centralArea.appendChild(resizeHandle);
		centralArea.appendChild(headerBar.DOMRoot);
		centralArea.appendChild(toolbar.DOMRoot);
		centralArea.appendChild(body);
		content.appendChild(centralArea);

		// ------------------------------------------------------------------------
		// Context Menues

		// Bookmark Item Context Menu
		var BM = new ContextMenu(document, {name : 'BookmarkCtxMenu'});
		BM.addMenuEntry({value: 'Open (new tab)', event: 'OpenInNewTab', icon: 'new-tab'});
		if (AppConfig.isPanel()) {
			BM.addMenuEntry({value: 'Open (current tab)', event: 'OpenInActiveTab', icon: 'same-tab'});
		}
		BM.addMenuEntry({value: 'Open (new window)', event: 'OpenInNewWindow', icon: 'new-window'});
		BM.addMenuEntry({value: 'Copy URL', event: 'CopyURL', icon: 'copy'});
		BM.addMenuEntry({value: 'Copy Title', event: 'CopyTitle', icon: 'copy'});
		BM.addMenuEntry({value: 'Edit', event: 'EditBookmark', icon: 'edit'});
		BM.addMenuEntry({value: 'Delete', globalEvent: 'DeleteBookmarkItem', icon: 'delete', separator: 'top'});
		content.appendChild(BM.DOMRoot);

		// Session Context Menu
		var SM = new ContextMenu(document, {name : 'SessionContextMenu', width: 165});
		SM.addMenuEntry({value: 'Restore', event: 'RestoreSession', icon: 'same-window'});
		SM.addMenuEntry({value: 'Restore (new window)', event: 'RestoreInNewWindow', icon: 'new-window'});
		SM.addMenuEntry({value: 'Edit', event: 'EditSession', icon: 'edit'});
		SM.addMenuEntry({value: 'Delete', globalEvent: 'DeleteBookmarkItem', icon: 'delete'});
		SM.addMenuEntry({value: 'Create new session', callback: SessionManager.createNewSession, icon: 'new-session', separator: 'top'});
		content.appendChild(SM.DOMRoot);

		// History List Context Menu
		var confirmDeleteAll = function confirmDeleteAll(context, event)
		{
			WindowEvents.emit(document, 'ConfirmBox-Open', {
				event: event,
				message: 'Clear history?',
				callback : function() {
					GlobalEvents.emit('HistorySessionDeleteAll');
				}
			});
		};

		var HSML = new ContextMenu(document, {name : 'HistoryListCtxMenu', width: 155});
		HSML.addMenuEntry({value: 'Delete All', callback: confirmDeleteAll, icon: 'delete'});
		content.appendChild(HSML.DOMRoot);

		// History Items Context Menu

		var confirmDeleteOne = function confirmDeleteOne(context, event)
		{
			WindowEvents.emit(document, 'ConfirmBox-Open', {
				event: event,
				message: 'Confirm delete?',
				callback : function() {
					GlobalEvents.emit('HistorySessionDelete', context.getAttribute('index'));
				}
			});
		};

		var HSM = new ContextMenu(document, {name : 'HistorySessionCtxMenu', width: 155});
		HSM.addMenuEntry({value: 'Save', event: 'Save', icon: 'heart'});
		HSM.addMenuEntry({value: 'Restore (new window)', event: 'Restore', icon: 'new-window'});
		HSM.addMenuEntry({value: 'Delete', callback: confirmDeleteOne, icon: 'delete', separator: 'top'});
		content.appendChild(HSM.DOMRoot);

		// History Context Menu
		var HBM = new ContextMenu(document, {name : 'HistoryMarksCtxMenu', width: 155});
		HBM.addMenuEntry({value: 'Open (new tab)', event: 'OpenInNewTab', icon: 'new-tab'});
		if (AppConfig.isPanel()) {
			HBM.addMenuEntry({value: 'Open (current tab)', event: 'OpenInActiveTab', icon: 'same-tab'});
		}
		HBM.addMenuEntry({value: 'Open (new window)', event: 'OpenInNewWindow', icon: 'new-window'});
		HBM.addMenuEntry({value: 'Copy URL', event: 'CopyURL', icon: 'copy'});
		content.appendChild(HBM.DOMRoot);

		// Field edit widgets
		var BEP = new FieldEditWdiget(document, {name: 'BookmarkEditWidget'});
		BEP.addField({label: 'Name', name: 'title'});
		BEP.addField({label: 'Location', name: 'url'});
		// BEP.addField({label: 'Description', name: 'desc'});
		centralArea.appendChild(BEP.DOMRoot);

		// Field edit Info
		var SEP = new FieldEditWdiget(document, {name: 'SessionFolderEditWidget'});
		SEP.addField({label: 'Title', name: 'title'});
		// SEP.addField({label: 'Description', name: 'desc'});
		centralArea.appendChild(SEP.DOMRoot);

		// Confirm Box
		var CB = new ConfirmBox(document, {name: 'ConfirmBox'});
		content.appendChild(CB.DOMRoot);

		// ------------------------------------------------------------------------
		// Panel States

		var UI = content.parentElement;
		function setUIState(props)
		{
			var model = SessionSyncModel.getModel(document);
			for (var key in props) {
				model.state[key] = props[key];
				props[key] !== undefined ? UI.setAttribute(key, props[key]) : UI.removeAttribute(key);
			}
		}

		// ------------------------------------------------------------------------
		// App Events

		GlobalEvents.on('open-addon-page', function() {
			BookmarkManager.openBookmark({
				url: 'home/home.html',
				mode: 'newTab',
			});
		});

		WindowEvents.on(document, 'open-addon-detached', function() {
			browser.runtime.sendMessage({event: 'session-sync-detach'});
		});

		WindowEvents.on(document, 'SetUIState', setUIState);

		WindowEvents.on(document, 'CopyURL', function (url) {
			WindowEvents.emit(document, 'ShowUrlBar', url);
			WindowEvents.emit(document, 'UrlBar-CopyURL');
		});

		WindowEvents.on(document, 'CopyText', function (text) {
			WindowEvents.emit(document, 'UrlBar-CopyURL');
		});

		// SessionContextMenu events

		WindowEvents.on(document, 'SessionContextMenu-EditSession', function (sessionID) {
			if (SessionSyncModel.bookmarks[sessionID])
			{
				var type = SessionSyncModel.bookmarks[sessionID].type;
				switch (type)
				{
					case 'folder':
						WindowEvents.emit(document, 'SessionFolderEditWidget-Invoke', {
							context : sessionID,
							fields : {
								title : SessionSyncModel.bookmarks[sessionID].title,
							}
						});
						break;

					case 'bookmark':
						WindowEvents.emit(document, 'BookmarkCtxMenu-EditBookmark', sessionID);
						break;
				}
			}
		});

		WindowEvents.on(document, 'SessionContextMenu-RestoreSession', SessionManager.restoreSession);

		WindowEvents.on(document, 'SessionContextMenu-RestoreInNewWindow', SessionManager.restoreNewWindow);

		// BookmarksCtxMenu events

		WindowEvents.on(document, 'BookmarkCtxMenu-EditBookmark', function (bookmarkID) {
			WindowEvents.emit(document, 'BookmarkEditWidget-Invoke', {
				context : bookmarkID,
				fields : {
					title : SessionSyncModel.bookmarks[bookmarkID].title,
					url : SessionSyncModel.bookmarks[bookmarkID].url,
				}
			});
		});

		WindowEvents.on(document, 'BookmarkCtxMenu-CopyURL', function (bookmarkID) {
			WindowEvents.emit(document, 'CopyURL', SessionSyncModel.bookmarks[bookmarkID].url);
		});

		WindowEvents.on(document, 'BookmarkCtxMenu-CopyTitle', function (bookmarkID) {
			WindowEvents.emit(document, 'CopyToClipboard', SessionSyncModel.bookmarks[bookmarkID].title);
		});

		WindowEvents.on(document, 'BookmarkCtxMenu-OpenInNewTab', function (bookmarkID) {
			BookmarkManager.openBookmark({
				url: SessionSyncModel.bookmarks[bookmarkID].url,
				mode: 'newTab'
			});
		});

		WindowEvents.on(document, 'BookmarkCtxMenu-OpenInActiveTab', function (bookmarkID) {
			BookmarkManager.openBookmark({
				url: SessionSyncModel.bookmarks[bookmarkID].url
			});
		});

		WindowEvents.on(document, 'BookmarkCtxMenu-OpenInNewWindow', function (bookmarkID) {
			BookmarkManager.openBookmark({
				url: SessionSyncModel.bookmarks[bookmarkID].url,
				mode: 'newWindow'
			});
		});

		// HistoryMarksCtxMenu events

		WindowEvents.on(document, 'HistoryMarksCtxMenu-CopyURL', function (url) {
			WindowEvents.emit(document, 'CopyURL', url);
		});

		WindowEvents.on(document, 'HistoryMarksCtxMenu-OpenInNewTab', function (url) {
			BookmarkManager.openBookmark({
				url: url,
				mode: 'newTab'
			});
		});

		WindowEvents.on(document, 'HistoryMarksCtxMenu-OpenInActiveTab', function (url) {
			BookmarkManager.openBookmark({
				url: url
			});
		});

		WindowEvents.on(document, 'HistoryMarksCtxMenu-OpenInNewWindow', function (url) {
			BookmarkManager.openBookmark({
				url: url,
				mode: 'newWindow'
			});
		});

		// HistorySessionCtxMenu events

		WindowEvents.on(document, 'HistorySessionCtxMenu-Save', function (context) {
			WindowEvents.emit(document, 'HistorySessionSave', context.getAttribute('index'));
		});

		WindowEvents.on(document, 'HistorySessionCtxMenu-Restore', function (context) {
			WindowEvents.emit(document, 'HistorySessionRestore', context.getAttribute('index'));
		});

		WindowEvents.on(document, 'HistorySessionCtxMenu-Delete', function (context) {
			GlobalEvents.emit('HistorySessionDelete', context.getAttribute('index'));
		});

		// Edit events

		function updateBookmarkInfo(data)
		{
			SessionSyncModel.updateBookmarkItem(data.context, data.fields);
		}

		WindowEvents.on(document, 'SessionFolderEditWidget-Save', updateBookmarkInfo);
		WindowEvents.on(document, 'BookmarkEditWidget-Save', updateBookmarkInfo);

		var startResize = function startResize(e)
		{
			var startPosX = e.clientX;
			var startPosY = e.clientY;
			var initWidth = document.body.clientWidth;
			var initHeight = document.body.clientHeight;

			resizeHandle.setAttribute('resizing', 'true');
			WindowEvents.emit(document, 'SetUIState', {resize: 'true'});

			function eventMove(e)
			{
				var deltaX = e.clientX - startPosX;
				var deltaY = e.clientY - startPosY;

				var newWidth = Math.max(Math.min(initWidth - deltaX, 800), 500);
				var newHeight = Math.max(Math.min(initHeight + deltaY, 600), 400);

				// This is required only for when document body is changing at the same time
				// such is the case with Webextensions panels
				initWidth = newWidth;

				AppConfig.set('style.panel.width', newWidth);
				AppConfig.set('style.panel.height', newHeight);
			}

			function evenUp()
			{
				WindowEvents.emit(document, 'SetUIState', {resize: undefined});
				resizeHandle.removeAttribute('resizing');
				document.removeEventListener('mouseup', evenUp);
				document.removeEventListener('mousemove', eventMove);
			}

			document.addEventListener('mouseup', evenUp);
			document.addEventListener('mousemove', eventMove);
		};

		if (AppConfig.isPanel())
		{
			GlobalEvents.on('style.panel.width', function (size) {
				document.body.style.width = size + 'px';
			});

			GlobalEvents.on('style.panel.height', function (size) {
				document.body.style.height = size + 'px';
			});

			resizeHandle.addEventListener('mousedown', startResize);
		}
		else
		{
			window.addEventListener('resize', function () {
				var newWidth = Math.max(window.innerWidth, 500);
				var newHeight = Math.max(window.innerHeight, 400);

				browser.storage.local.set({'style.window.detach' : {
					// left: window.screenX,
					// top: window.screenY,
					width: newWidth,
					height: newHeight
				}});
			});
			document.body.style.minWidth = '500px';
		}

		function preventDefault(e) {
			e.preventDefault();
			e.stopPropagation();
		}

		document.addEventListener('contextmenu', preventDefault);
		document.addEventListener('mousedown', function (e) {
			// Middle Click
			if (e.button == 1)
				preventDefault(e);
		});

		// ------------------------------------------------------------------------
		// App Init

		searchBar.init();

	};

	// ************************************************************************
	// Module exports

	exports.SessionSyncUI = SessionSyncUI;
});
