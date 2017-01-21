'use strict';

// ****************************************************************************
// SDK Modules
const { data } = require('sdk/self');
const tabs = require("sdk/tabs");
const { viewFor } = require("sdk/view/core");
const { browserWindows } = require("sdk/windows");

// ****************************************************************************
// 3rd Party Modules
require('./3rd/userstyles').load(data.url('overlay.css'));

// ****************************************************************************
// Custom Modules

const { AppConfig } = require('./config');
const { SessionContainer } = require('./session-container');
const { SessionBookmark } = require('./session-bookmark');
const { SessionList } = require('./session-list');
const { SessionSyncModel } = require('./session-sync-model');

// Utils
const { HTMLCreator } = require('./utils/dom');
const { XULPanel } = require('./utils/xul-panel');
const { BookmarkManager } = require('./session/bookmarks');
const { EventDestroyer } = require('./utils/event-destroyer');
const { WindowEvents, GlobalEvents } = require('./utils/global-events');
const { ContextMenu } = require('./utils/context-menu');
const { ConfirmBox } = require('./utils/confirm-box');
const { FieldEditWdiget } = require('./utils/field-edit-widget');
const { SessionManager } = require('./session/management');

// Components
const { UrlBar } = require('./components/url-bar');
const { TrashCan } = require('./components/trash-can');
const { ConfigPanel } = require('./components/config-panel');
const { AddonToolbar } = require('./components/addon-toolbar');
const { SearchBar } = require('./components/search-bar');
const { TooltipSystem } = require('./components/tooltip-system');
const { SessionHeaderBar } = require('./components/session-header-bar');
const { NotificationSystem } = require('./components/notification-system');
const { SessionToolbar } = require('./components/session-toolbar');
const { SessionHotkeys } = require('./components/session-hotkeys');

// const { FilterPanel } = require('./components/filter-panel');

// Tools
const { DomInspector } = require('./devtools/dom-inspector');
const { CSSStylingReload } = require('./devtools/style-reload');

// ****************************************************************************
// Awesome Session Sync UI

function SessionSyncUI(mozWindow)
{
	var window = viewFor(mozWindow);
	var document = window.document;
	var DomElem = HTMLCreator(document);
	
	// *************************************************************************
	// Create UI compontents

	var content = DomElem('div', {class: 'body'});
	
	// Add XUL Overlay and base HTML content
	var panel = XULPanel({
		window: window,
		id: AppConfig.get('cssID'),
		blur: true,
		appendTo: 'navigator-toolbox',
		onShow: function () {
			WindowEvents.emit(document, 'UIToggledOn');
		},
		onHide: function () {
			WindowEvents.emit(document, 'UIToggledOff');
		}
	});
	panel.appendChild(content);

	// TODO: Debuging

	var DevInfo = {
		xul: content.parentElement,
		content : content,
		panel : panel,
		model: SessionSyncModel,
		config: AppConfig.storage,
		update: function() {
			GlobalEvents.emit('update-sessions');
		}
	};

	window.SessionSync = DevInfo;

	// Panel States
	var UI = content.parentElement;
	function setUIAtributes(props)
	{
		for (var key in props) {
			props[key] !== undefined ? UI.setAttribute(key, props[key]) : UI.removeAttribute(key);
		}
	};

	// ------------------------------------------------------------------------
	// App Events

	WindowEvents.on(document, 'DevAccess', function(options) {
		DevInfo[options.key] = options.value;
	});

	// var toggleUI = function togglePanel(pinned)
	// {
		// if (panel.toggle()) {
			// if (pinned) {
				// var btn = document.getElementById('action-button--session-syncgabrielivanicacom-syncbtn');
				// var rect = btn.getBoundingClientRect();
				// if (rect.left < 300)
					// panel.pin(rect.bottom, rect.right, 'left');
				// else
					// panel.pin(rect.bottom, rect.left, 'right');
			// }
			// else {
				// panel.center();
			// }
		// }
	// };

	GlobalEvents.on('ToggleUI', function() {
		if (mozWindow == browserWindows.activeWindow) {
			if (panel.isVisible()) {
				WindowEvents.emit(document, 'CloseUI');
			} else {
				panel.toggle();
				panel.center();
			}
		}
	}.bind(this));
	
	GlobalEvents.on('cfg.style.overlayOpacity', function() {
		content.style.background = 'rgba(255, 255, 255, ' + AppConfig.storage.style.overlayOpacity / 100 + ')';
	});
	GlobalEvents.emit('cfg.style.overlayOpacity');

	WindowEvents.on(document, 'CloseUI', function() {
		panel.hide();
	});

	// General events
	GlobalEvents.on('open-addon-config', function() {
		if (mozWindow == browserWindows.activeWindow) {
			panel.show();
			WindowEvents.emit(document, 'SetUIState', { config : 'on'});
			WindowEvents.emit(document, 'SetUIState', { config : 'on'});
		}
	});

	GlobalEvents.on('AddonDisabled', this.destroy.bind(this));

	WindowEvents.on(document, 'SetUIState', function(props) {
		var model = SessionSyncModel.getModel(document);
		for (var key in props) {
			model.state[key] = props[key];
		}

		setUIAtributes(props);
	});
	
	WindowEvents.on(document, 'CopyURL', function (url) {
		WindowEvents.emit(document, 'ShowUrlBar', url);
		WindowEvents.emit(document, 'UrlBar-CopyURL');
	});
	
	// SessionContextMenu events
	
	WindowEvents.on(document, 'SessionContextMenu-CreateEmptySession', function() {
		GlobalEvents.emit('lock-observer');

		var folderID = SessionManager.createEmptySession(AppConfig.storage.storageFolderID);
		WindowEvents.emit(document, 'SetPromiseSession', { sessionID: folderID, edit: true });

		GlobalEvents.emit('unlock-observer');
		GlobalEvents.emit('update-sessions');
	});
	

	WindowEvents.on(document, 'SessionContextMenu-EditSession', function (sessionID) {
		WindowEvents.emit(document, 'SessionFolderEditWidget-Invoke', {
			context : sessionID,
			fields : {
				title : SessionSyncModel.bookmarks[sessionID].title,
				desc : SessionSyncModel.bookmarks[sessionID].getDescription() 
			}
		});
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
				desc : SessionSyncModel.bookmarks[bookmarkID].getDescription()
			}
		});
	});
	
	WindowEvents.on(document, 'BookmarkCtxMenu-CopyURL', function (bookmarkID) {
		WindowEvents.emit(document, 'CopyURL', SessionSyncModel.bookmarks[bookmarkID].url);
	});	

	WindowEvents.on(document, 'BookmarkCtxMenu-OpenInNewTab', function (bookmarkID) {
		tabs.open(SessionSyncModel.bookmarks[bookmarkID].url);		
	});		
	
	WindowEvents.on(document, 'BookmarkCtxMenu-OpenInActiveTab', function (bookmarkID) {
		tabs.activeTab.url = SessionSyncModel.bookmarks[bookmarkID].url;
	});
	
	WindowEvents.on(document, 'BookmarkCtxMenu-OpenInNewWindow', function (bookmarkID) {
		tabs.open({
			url: SessionSyncModel.bookmarks[bookmarkID].url,
			inNewWindow: true
		});		
	});
	
	// HistoryMarksCtxMenu events
	
	WindowEvents.on(document, 'HistoryMarksCtxMenu-CopyURL', function (url) {
		WindowEvents.emit(document, 'CopyURL', url);
	});	

	WindowEvents.on(document, 'HistoryMarksCtxMenu-OpenInNewTab', function (url) {
		tabs.open(url);		
	});		
	
	WindowEvents.on(document, 'HistoryMarksCtxMenu-OpenInActiveTab', function (url) {
		tabs.activeTab.url = url;
	});
	
	WindowEvents.on(document, 'HistoryMarksCtxMenu-OpenInNewWindow', function (url) {
		tabs.open({
			url: url,
			inNewWindow: true
		});		
	});	
	
	// HistorySessionCtxMenu events
	
	WindowEvents.on(document, 'HistorySessionCtxMenu-Restore', function (context) {
		WindowEvents.emit(document, 'HistorySessionRestore', context.getAttribute('index'));
	});		

	WindowEvents.on(document, 'HistorySessionCtxMenu-Delete', function (context) {
		GlobalEvents.emit('HistorySessionDelete', context.getAttribute('index'));
	});

	// Edit events

	function updateBookmarkInfo(data)
	{
		GlobalEvents.emit('lock-observer');
		SessionSyncModel.updateBookmarkItem(data.context, data.fields);
		GlobalEvents.emit('unlock-observer');
	}

	WindowEvents.on(document, 'SessionFolderEditWidget-Save', updateBookmarkInfo);
	WindowEvents.on(document, 'BookmarkEditWidget-Save', updateBookmarkInfo);
	
	// ------------------------------------------------------------------------
	// Public data
	
	this.panel = panel;
	this.DOMRoot = content;
	this.document = document;
	this.init(document);	
}

// ****************************************************************************
// UI Methods

SessionSyncUI.prototype.init = function init(document) 
{
	var DomElem = HTMLCreator(document);
	this.promiseID = -1;

	// ------------------------------------------------------------------------
	// UI Modules

	var addonToolbar = new AddonToolbar(document);
	this.DOMRoot.appendChild(addonToolbar.DOMRoot);

	var configPanel = new ConfigPanel(document);
	this.DOMRoot.appendChild(configPanel.DOMRoot);
	
	// var filterPanel = new FilterPanel(document);
	// this.DOMRoot.appendChild(filterPanel.DOMRoot);
	
	var notificationSystem = new NotificationSystem(document);
	this.DOMRoot.appendChild(notificationSystem.DOMRoot);

	var tooltipSystem = new TooltipSystem(document);
	this.DOMRoot.appendChild(tooltipSystem.DOMRoot);

	// Center UI area
	var centralArea = DomElem('div', {class: 'sessions-area'});
	centralArea.style.width = AppConfig.storage.style.appPanelWidth + 'px';
	centralArea.style.height = AppConfig.storage.style.appPanelHeight + 'px';
	
	// -------------------------------------------------------------
	// Header bar
	
	var headerBar = new SessionHeaderBar(document);
	
	// -------------------------------------------------------------
	// Menu bar
	
	var toolbar = new SessionToolbar(document);
	
	// -------------------------------------------------------------
	// Center area
	
	var body = DomElem('div', {class: 'sessions-area-body'});
	var sessionList = new SessionList(document);
	var searchBar = new SearchBar(document);
	var sessionContainer = new SessionContainer(document);
	var resizeHandle = DomElem('div', {class: 'panel-resize-handle'});
	
	body.appendChild(sessionList.DOMRoot);
	body.appendChild(sessionContainer.DOMRoot);
	
	centralArea.appendChild(resizeHandle);
	centralArea.appendChild(headerBar.DOMRoot);
	centralArea.appendChild(toolbar.DOMRoot);
	centralArea.appendChild(body);
	centralArea.appendChild(searchBar.DOMRoot);
	this.DOMRoot.appendChild(centralArea);
	
	WindowEvents.emit(document, 'DevAccess', { key: 'list', value: sessionList});
	WindowEvents.emit(document, 'DevAccess', { key: 'container', value: sessionContainer});
	
	// ------------------------------------------------------------------------
	// URL bar

	var urlBar = new UrlBar(document);
	centralArea.appendChild(urlBar.DOMRoot);
	
	// -------------------------------------------------------------
	// Trash can
	
	var trashCan = new TrashCan(document);
	this.DOMRoot.appendChild(trashCan.DOMRoot);
	
	// ------------------------------------------------------------------------
	// Context Menues
	
	// Bookmark Item Context Menu
	var BM = new ContextMenu(document, {name : 'BookmarkCtxMenu'});
	BM.addMenuEntry({value: 'Open (new tab)', event: 'OpenInNewTab', icon: 'new-tab'});
	BM.addMenuEntry({value: 'Open (current tab)', event: 'OpenInActiveTab', icon: 'same-tab'});
	BM.addMenuEntry({value: 'Open (new window)', event: 'OpenInNewWindow', icon: 'new-window'});
	BM.addMenuEntry({value: 'Copy URL', event: 'CopyURL', icon: 'copy'});
	BM.addMenuEntry({value: 'Edit', event: 'EditBookmark', icon: 'edit'});
	BM.addMenuEntry({value: 'Delete', globalEvent: 'DeleteBookmarkItem', icon: 'delete', separator: 'top'});
	this.DOMRoot.appendChild(BM.DOMRoot);

	// Session Context Menu
	var SM = new ContextMenu(document, {name : 'SessionContextMenu', width: 155});
	SM.addMenuEntry({value: 'Restore', event: 'RestoreSession', icon: 'same-window'});
	SM.addMenuEntry({value: 'Restore (new window)', event: 'RestoreInNewWindow', icon: 'new-window'});
	SM.addMenuEntry({value: 'Edit', event: 'EditSession', icon: 'edit'});
	SM.addMenuEntry({value: 'Delete', globalEvent: 'DeleteBookmarkItem', icon: 'delete'});
	SM.addMenuEntry({value: 'Create new session', event: 'CreateEmptySession', icon: 'new-session', separator: 'top'});
	this.DOMRoot.appendChild(SM.DOMRoot);

	// History List Context Menu
	var confirmDeleteAll = function confirmDeleteAll(context, event)
	{
		WindowEvents.emit(document, 'ConfirmBox-Open', {
			event: event,
			message: 'Are you sure you want clear auto-save list?', 
			callback : function() {
				GlobalEvents.emit('HistorySessionDeleteAll');
			}
		});
	};
	
	var HSML = new ContextMenu(document, {name : 'HistoryListCtxMenu', width: 155});
	HSML.addMenuEntry({value: 'Delete All', callback: confirmDeleteAll, icon: 'delete'});
	this.DOMRoot.appendChild(HSML.DOMRoot);	

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
	HSM.addMenuEntry({value: 'Restore', event: 'Restore', icon: 'new-window'});
	HSM.addMenuEntry({value: 'Delete', callback: confirmDeleteOne, icon: 'delete', separator: 'top'});
	this.DOMRoot.appendChild(HSM.DOMRoot);

	// History Context Menu
	var HBM = new ContextMenu(document, {name : 'HistoryMarksCtxMenu', width: 155});
	HBM.addMenuEntry({value: 'Open (new tab)', event: 'OpenInNewTab', icon: 'new-tab'});
	HBM.addMenuEntry({value: 'Open (current tab)', event: 'OpenInActiveTab', icon: 'same-tab'});
	HBM.addMenuEntry({value: 'Open (new window)', event: 'OpenInNewWindow', icon: 'new-window'});
	HBM.addMenuEntry({value: 'Copy URL', event: 'CopyURL', icon: 'copy'});
	this.DOMRoot.appendChild(HBM.DOMRoot);

	// Field edit widgets
	var BEP = new FieldEditWdiget(document, {name: 'BookmarkEditWidget'});
	BEP.addField({label: 'Name', name: 'title'});
	BEP.addField({label: 'Location', name: 'url'});
	// BEP.addField({label: 'Description', name: 'desc'});
	centralArea.appendChild(BEP.DOMRoot);

	// Field edit Info
	var SEP = new FieldEditWdiget(document, {name: 'SessionFolderEditWidget'});
	SEP.addField({label: 'Title', name: 'title'});
	SEP.addField({label: 'Description', name: 'desc'});
	centralArea.appendChild(SEP.DOMRoot);

	// Confirm Box
	var CB = new ConfirmBox(document, {name: 'ConfirmBox'});	
	this.DOMRoot.appendChild(CB.DOMRoot);

	// ------------------------------------------------------------------------
	// Events
	
	GlobalEvents.on('cfg.style.appPanelWidth', function(value) {
		centralArea.style.width = AppConfig.storage.style.appPanelWidth + 'px';
	});

	GlobalEvents.on('cfg.style.appPanelHeight', function(value) {
		centralArea.style.height = AppConfig.storage.style.appPanelHeight + 'px';
	});

	var startResize = function startResize(e)
	{
		var startPosX = e.clientX;
		var startPosY = e.clientY;
		var initWidth = centralArea.clientWidth;
		var initHeight = centralArea.clientHeight;
		resizeHandle.setAttribute('resizing', 'true');
		WindowEvents.emit(document, 'SetUIState', {resize: 'true'});
		
		var step = SessionSyncModel.getModel(document).state.config ? 1 : 2; 
		
		function eventMove(e)
		{
			var deltaX = 2 * (e.clientX - startPosX);
			var deltaY = 2 * (e.clientY - startPosY);

			var newWidth = initWidth + deltaX;
			var newHeight = initHeight + deltaY;

			centralArea.style.width = newWidth + 'px';
			centralArea.style.height = newHeight + 'px';

			AppConfig.storage.style.appPanelWidth = newWidth;
			AppConfig.storage.style.appPanelHeight = newHeight;
			
			GlobalEvents.emit('cfg.style.appPanelWidth', newWidth);
			GlobalEvents.emit('cfg.style.appPanelHeight', newHeight);
		}
		
		function evenUp(e)
		{
			WindowEvents.emit(document, 'SetUIState', {resize: undefined});
			resizeHandle.removeAttribute('resizing');
			document.removeEventListener('mouseup', evenUp);
			document.removeEventListener('mousemove', eventMove);
		}
		
		document.addEventListener('mouseup', evenUp);
		document.addEventListener('mousemove', eventMove);
	};
	
	resizeHandle.addEventListener('mousedown', startResize);

	// ------------------------------------------------------------------------
	// Init
	
	var sessionHotkeys = new SessionHotkeys(document);

	WindowEvents.emit(document, 'ShowCurrentSession');
	WindowEvents.emit(document, 'SetUIState', {	list: 'sync' });
};

// ****************************************************************************
// General Methods

SessionSyncUI.prototype.destroy = function destroy()
{
	// In case of browser exit this will be undefined
	if (this.panel == undefined)
		return;
		
	// Free memory  
	this.panel.destroy();

	WindowEvents.emit(this.document, 'InstanceDestroy');
	WindowEvents.remove(this.document);

	this.panel = null;
	this.document = null;
	this.DOMRoot = null;
};

// ****************************************************************************
// Public API

exports.SessionSyncUI = SessionSyncUI;