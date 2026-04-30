'use strict';

// ************************************************************************
// Modules

// App
import { AppConfig } from './config';

// Utils
import { HTMLCreator } from './utils/dom';
import { WindowEvents, GlobalEvents } from './utils/global-events';

import { ContextMenu } from './utils/context-menu';
import { ConfirmBox } from './utils/confirm-box';
import { FieldEditWdiget } from './utils/field-edit-widget';

// Components
import { Clipboard } from './components/clipboard';
import { UrlBar } from './components/url-bar';
import { TrashCan } from './components/trash-can';
import { TooltipSystem } from './components/tooltip-system';
import { SessionHotkeys } from './components/session-hotkeys';
import { NotificationSystem } from './components/notification-system';
import { ConfigPanel } from './components/config-panel';
import { OverlaySystem } from './components/overlay-system';

import { SessionHotkeyManager } from './components/session-hotkey-manager';
import { SessionSorting } from './components/session-sorting';
import { SessionFiltering } from './components/session-filtering';

import { SessionHeaderBar } from './components/session-header-bar';
import { SessionList } from './components/session-list';
import { SessionContainer } from './components/session-container';
import { SessionSyncModel } from './components/session-sync-model';
import { SessionToolbar } from './components/session-toolbar';

// Bookmarks
import { SessionManager } from './session/management';
import { BookmarkManager } from './session/bookmarks';

// ************************************************************************
// UI initilization

export const SessionSyncUI = function SessionSyncUI() {
	var DomElem = HTMLCreator();

	document.body.setAttribute('panel', AppConfig.isPanel());
	var content = document.getElementById('body');

	// ------------------------------------------------------------------------
	// UI Modules

	var configPanel = new ConfigPanel();
	content.appendChild(configPanel.DOMRoot);

	var tooltipSystem = new TooltipSystem();
	content.appendChild(tooltipSystem.DOMRoot);

	var notificationSystem = new NotificationSystem();
	content.appendChild(notificationSystem.DOMRoot);

	var hotekyManager = new SessionHotkeyManager();
	content.appendChild(hotekyManager.DOMRoot);

	var overlaySystem = new OverlaySystem();
	content.appendChild(overlaySystem.DOMRoot);

	// -------------------------------------------------------------
	// Create the UI
	var centralArea = DomElem('div', { class: 'sessions-area' });

	// -------------------------------------------------------------
	// Clipboard

	new Clipboard();

	// -------------------------------------------------------------
	// GlobalHotkeys

	new SessionHotkeys();

	// --------------------------------------------------------------------
	// Center area

	var headerBar = new SessionHeaderBar();
	var toolbar = new SessionToolbar();
	var sessionList = new SessionList();
	var searchBar = new SessionFiltering();
	var sessionContainer = new SessionContainer();
	var sessionSorting = new SessionSorting();

	headerBar.DOMRoot.appendChild(searchBar.DOMRoot);
	sessionList.DOMRoot.appendChild(sessionSorting.DOMRoot);

	var body = DomElem('div', { class: 'sessions-area-body' });
	body.appendChild(sessionList.DOMRoot);
	body.appendChild(sessionContainer.DOMRoot);

	var resizeHandle = DomElem('div', { class: 'panel-resize-handle' });

	// -------------------------------------------------------------
	// Trash can

	var trashCan = new TrashCan();
	centralArea.appendChild(trashCan.DOMRoot);

	// --------------------------------------------------------------------
	// URL bar

	var urlBar = new UrlBar();
	headerBar.DOMRoot.appendChild(urlBar.DOMRoot);

	centralArea.appendChild(resizeHandle);
	centralArea.appendChild(headerBar.DOMRoot);
	centralArea.appendChild(toolbar.DOMRoot);
	centralArea.appendChild(body);
	content.appendChild(centralArea);

	// ------------------------------------------------------------------------
	// Context Menues

	// Bookmark Item Context Menu
	var BM = new ContextMenu({ name: 'BookmarkCtxMenu' });
	BM.addMenuEntry({ value: 'Open (new tab)', event: 'OpenInNewTab', icon: 'new-tab' });
	if (AppConfig.isPanel()) {
		BM.addMenuEntry({ value: 'Open (current tab)', event: 'OpenInActiveTab', icon: 'same-tab' });
	}
	BM.addMenuEntry({ value: 'Open (new window)', event: 'OpenInNewWindow', icon: 'new-window' });
	BM.addMenuEntry({ value: 'Copy URL', event: 'CopyURL', icon: 'copy' });
	BM.addMenuEntry({ value: 'Copy Title', event: 'CopyTitle', icon: 'copy' });
	BM.addMenuEntry({ value: 'Edit', event: 'EditBookmark', icon: 'edit' });
	BM.addMenuEntry({ value: 'Delete', globalEvent: 'DeleteBookmarkItem', icon: 'delete', separator: 'top' });
	content.appendChild(BM.DOMRoot);

	// Session Context Menu
	var SM = new ContextMenu({ name: 'SessionContextMenu' });
	SM.addMenuEntry({ value: 'Restore', event: 'RestoreSession', icon: 'same-window' });
	SM.addMenuEntry({ value: 'Restore (new window)', event: 'RestoreInNewWindow', icon: 'new-window' });
	SM.addMenuEntry({ value: 'Restore (close active)', event: 'ReplaceSession', icon: 'replace-current' });
	SM.addMenuEntry({ value: 'Restore (close all)', event: 'ReplaceSessionAll', icon: 'replace-all' });
	SM.addMenuEntry({ value: 'Edit', event: 'EditSession', icon: 'edit' });
	SM.addMenuEntry({ value: 'Delete', globalEvent: 'DeleteBookmarkItem', icon: 'delete' });
	SM.addMenuEntry({
		value: 'Create new session',
		callback: SessionManager.createNewSession,
		icon: 'new-session',
		separator: 'top'
	});
	SM.addMenuEntry({ value: 'Insert separator', callback: SessionManager.createSeparator, icon: 'new-session' });
	content.appendChild(SM.DOMRoot);

	var SCBM = new ContextMenu({ name: 'SessionContextBookmarkMenu' });
	SCBM.addMenuEntry({ value: 'Edit', event: 'EditBookmark', icon: 'edit' });
	SCBM.addMenuEntry({ value: 'Delete', globalEvent: 'DeleteBookmarkItem', icon: 'delete' });
	SCBM.addMenuEntry({
		value: 'Create new session',
		callback: SessionManager.createNewSession,
		icon: 'new-session',
		separator: 'top'
	});
	SCBM.addMenuEntry({ value: 'Insert separator', callback: SessionManager.createSeparator, icon: 'new-session' });
	content.appendChild(SCBM.DOMRoot);

	var SCSM = new ContextMenu({ name: 'SessionContextSeparatorMenu' });
	SCSM.addMenuEntry({ value: 'Delete', globalEvent: 'DeleteBookmarkItem', icon: 'delete' });
	SCSM.addMenuEntry({
		value: 'Create new session',
		callback: SessionManager.createNewSession,
		icon: 'new-session',
		separator: 'top'
	});
	SCSM.addMenuEntry({ value: 'Insert separator', callback: SessionManager.createSeparator, icon: 'new-session' });
	content.appendChild(SCSM.DOMRoot);

	var SLM = new ContextMenu({ name: 'SessionListMenu' });
	SLM.addMenuEntry({ value: 'Create new session', callback: SessionManager.createNewSession, icon: 'new-session' });
	content.appendChild(SLM.DOMRoot);

	// History List Context Menu
	var confirmDeleteAll = function confirmDeleteAll(context, event) {
		WindowEvents.emit(document, 'ConfirmBox-Open', {
			event: event,
			message: 'Clear history?',
			callback: function () {
				GlobalEvents.emit('HistorySessionDeleteAll');
			}
		});
	};

	var HSML = new ContextMenu({ name: 'HistoryListCtxMenu' });
	HSML.addMenuEntry({ value: 'Delete All', callback: confirmDeleteAll, icon: 'delete' });
	content.appendChild(HSML.DOMRoot);

	// History Items Context Menu

	var confirmDeleteOne = function confirmDeleteOne(context, event) {
		WindowEvents.emit(document, 'ConfirmBox-Open', {
			event: event,
			message: 'Confirm delete?',
			callback: function () {
				GlobalEvents.emit('HistorySessionDelete', context.getAttribute('index'));
			}
		});
	};

	var HSM = new ContextMenu({ name: 'HistorySessionCtxMenu' });
	HSM.addMenuEntry({ value: 'Save', event: 'Save', icon: 'heart' });
	HSM.addMenuEntry({ value: 'Restore (new window)', event: 'Restore', icon: 'new-window' });
	HSM.addMenuEntry({ value: 'Delete', callback: confirmDeleteOne, icon: 'delete', separator: 'top' });
	content.appendChild(HSM.DOMRoot);

	// History Context Menu
	var HBM = new ContextMenu({ name: 'HistoryMarksCtxMenu' });
	HBM.addMenuEntry({ value: 'Open (new tab)', event: 'OpenInNewTab', icon: 'new-tab' });
	if (AppConfig.isPanel()) {
		HBM.addMenuEntry({ value: 'Open (current tab)', event: 'OpenInActiveTab', icon: 'same-tab' });
	}
	HBM.addMenuEntry({ value: 'Open (new window)', event: 'OpenInNewWindow', icon: 'new-window' });
	HBM.addMenuEntry({ value: 'Copy URL', event: 'CopyURL', icon: 'copy' });
	content.appendChild(HBM.DOMRoot);

	// Field edit widgets
	var BEP = new FieldEditWdiget({ name: 'BookmarkEditWidget' });
	BEP.addField({ label: 'Name', name: 'title' });
	BEP.addField({ label: 'Location', name: 'url' });
	// BEP.addField({label: 'Description', name: 'desc'});
	centralArea.appendChild(BEP.DOMRoot);

	// Field edit Info
	var SEP = new FieldEditWdiget({ name: 'SessionFolderEditWidget' });
	SEP.addField({ label: 'Title', name: 'title' });
	// SEP.addField({label: 'Description', name: 'desc'});
	centralArea.appendChild(SEP.DOMRoot);

	// Confirm Box
	var CB = new ConfirmBox({ name: 'ConfirmBox' });
	content.appendChild(CB.DOMRoot);

	// ------------------------------------------------------------------------
	// Panel States

	var UI = content.parentElement;
	function setUIState(props) {
		var model = SessionSyncModel.getModel(document);
		for (var key in props) {
			model.state[key] = props[key];
			props[key] !== undefined ? UI.setAttribute(key, props[key]) : UI.removeAttribute(key);
		}
	}

	// ------------------------------------------------------------------------
	// App Events

	WindowEvents.on(document, 'SetUIState', setUIState);

	WindowEvents.on(document, 'CopyURL', function (url) {
		WindowEvents.emit(document, 'ShowUrlBar', url);
		WindowEvents.emit(document, 'UrlBar-CopyURL');
	});

	WindowEvents.on(document, 'CopyText', function () {
		WindowEvents.emit(document, 'UrlBar-CopyURL');
	});

	// SessionContextMenu events

	WindowEvents.on(document, 'SessionContextMenu-EditSession', function (sessionID) {
		if (SessionSyncModel.bookmarks[sessionID]) {
			var type = SessionSyncModel.bookmarks[sessionID].type;
			switch (type) {
				case 'folder':
					WindowEvents.emit(document, 'SessionFolderEditWidget-Invoke', {
						context: sessionID,
						fields: {
							title: SessionSyncModel.bookmarks[sessionID].title
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
	WindowEvents.on(document, 'SessionContextMenu-ReplaceSession', SessionManager.replaceSession);
	WindowEvents.on(document, 'SessionContextMenu-ReplaceSessionAll', SessionManager.replaceSessionAll);

	// BookmarksCtxMenu events

	function InvokeBookmarkEdit(bookmarkID) {
		WindowEvents.emit(document, 'BookmarkEditWidget-Invoke', {
			context: bookmarkID,
			fields: {
				title: SessionSyncModel.bookmarks[bookmarkID].title,
				url: SessionSyncModel.bookmarks[bookmarkID].url
			}
		});
	}

	WindowEvents.on(document, 'SessionContextBookmarkMenu-EditBookmark', InvokeBookmarkEdit);
	WindowEvents.on(document, 'BookmarkCtxMenu-EditBookmark', InvokeBookmarkEdit);

	WindowEvents.on(document, 'BookmarkCtxMenu-CopyURL', function (bookmarkID) {
		WindowEvents.emit(document, 'CopyURL', SessionSyncModel.bookmarks[bookmarkID].url);
	});

	WindowEvents.on(document, 'BookmarkCtxMenu-CopyTitle', function (bookmarkID) {
		WindowEvents.emit(document, 'CopyToClipboard', SessionSyncModel.bookmarks[bookmarkID].title);
	});

	WindowEvents.on(document, 'BookmarkCtxMenu-OpenInNewTab', function (bookmarkID) {
		var mark = SessionSyncModel.bookmarks[bookmarkID];
		BookmarkManager.openBookmark(mark.url, {
			title: mark.title,
			mode: 'newTab'
		});
	});

	WindowEvents.on(document, 'BookmarkCtxMenu-OpenInActiveTab', function (bookmarkID) {
		var mark = SessionSyncModel.bookmarks[bookmarkID];
		BookmarkManager.openBookmark(mark.url, {
			title: mark.title,
			mode: 'activeTab'
		});
	});

	WindowEvents.on(document, 'BookmarkCtxMenu-OpenInNewWindow', function (bookmarkID) {
		var mark = SessionSyncModel.bookmarks[bookmarkID];
		BookmarkManager.openBookmark(mark.url, {
			title: mark.title,
			mode: 'newWindow'
		});
	});

	// HistoryMarksCtxMenu events

	WindowEvents.on(document, 'HistoryMarksCtxMenu-CopyURL', function (url) {
		WindowEvents.emit(document, 'CopyURL', url);
	});

	WindowEvents.on(document, 'HistoryMarksCtxMenu-OpenInNewTab', function (e) {
		BookmarkManager.openHistoryTabFromContext(e, 'newTab');
	});

	WindowEvents.on(document, 'HistoryMarksCtxMenu-OpenInActiveTab', function (e) {
		BookmarkManager.openHistoryTabFromContext(e, 'activeTab');
	});

	WindowEvents.on(document, 'HistoryMarksCtxMenu-OpenInNewWindow', function (e) {
		BookmarkManager.openHistoryTabFromContext(e, 'newWindow');
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

	function updateBookmarkInfo(data) {
		SessionSyncModel.updateBookmarkItem(data.context, data.fields);
	}

	WindowEvents.on(document, 'SessionFolderEditWidget-Save', updateBookmarkInfo);
	WindowEvents.on(document, 'BookmarkEditWidget-Save', updateBookmarkInfo);

	var startResize = function startResize(e) {
		var startPosX = e.clientX;
		var startPosY = e.clientY;
		var initWidth = document.body.clientWidth;
		var initHeight = document.body.clientHeight;

		resizeHandle.setAttribute('resizing', 'true');
		WindowEvents.emit(document, 'SetUIState', { resize: 'true' });

		function eventMove(e) {
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

		function evenUp() {
			WindowEvents.emit(document, 'SetUIState', { resize: undefined });
			resizeHandle.removeAttribute('resizing');
			document.removeEventListener('mouseup', evenUp);
			document.removeEventListener('mousemove', eventMove);
		}

		document.addEventListener('mouseup', evenUp);
		document.addEventListener('mousemove', eventMove);
	};

	function setPanelWidth(width) {
		document.body.style.width = width + 'px';
	}

	function setPanelHeight(height) {
		document.body.style.height = height + 'px';
	}

	if (AppConfig.isPanel()) {
		// Apply immediately from current config (handles Chrome popup where onChange
		// events from setupConfig fire before these listeners are registered)
		setPanelWidth(AppConfig.get('style.panel.width'));
		setPanelHeight(AppConfig.get('style.panel.height'));

		AppConfig.onChange('style.panel.width', setPanelWidth);
		AppConfig.onChange('style.panel.height', setPanelHeight);

		resizeHandle.addEventListener('mousedown', startResize);
	} else {
		window.addEventListener('resize', function () {
			var newWidth = Math.max(window.innerWidth, 500);
			var newHeight = Math.max(window.innerHeight, 400);

			browser.storage.local.set({
				'style.window.detach': {
					// left: window.screenX,
					// top: window.screenY,
					width: newWidth,
					height: newHeight
				}
			});
		});
		document.body.style.minWidth = '500px';
	}

	function preventDefault(e) {
		e.preventDefault();
		e.stopPropagation();
	}

	document.body.addEventListener('contextmenu', preventDefault);
	document.body.addEventListener('mousedown', function (e) {
		// Middle Click
		if (e.button == 1) preventDefault(e);
	});

	// ------------------------------------------------------------------------
	// App Init
};
