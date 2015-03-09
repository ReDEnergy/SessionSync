'use strict';

// *****************************************************************************
// SDK Modules
const { data } = require('sdk/self');
const { setTimeout, clearTimeout } = require("sdk/timers");

// *****************************************************************************
// 3rd Party Modules
require('3rd/userstyles').load(data.url('overlay.css'));

// *****************************************************************************
// Custom Modules

const { AppConfig } = require('./config');
const { HTMLCreator } = require('./utils/dom');
const { XULPanel } = require('./utils/xul-panel');
const { Bookmarks } = require('./utils/bookmarks');
const { Session } = require('session-container');
const { SessionBookmark } = require('session-bookmark');
const { EventDestroyer } = require('./utils/event-destroyer');
const { WindowEvents, GlobalEvents } = require('./utils/global-events');
const { ContextMenu } = require('./utils/context-menu');
const { ConfirmBox } = require('./utils/confirm-box');
const { FieldEditWdiget } = require('./utils/field-edit-widget');
const { SessionManager } = require('./session/management');
const { DragNDrop } = require('./utils/drag-n-drop');

// *****************************************************************************
// Awesome Session Sync UI

function SessionSyncUI(ChromeWindow) {
	var document = ChromeWindow.document;
	var DomElem = HTMLCreator(document);
	// *************************************************************************
	// Create UI compontents

	// Add XUL Overlay and base HTML content
	var content = DomElem('div', {class: 'content'});
	var panel = XULPanel({
		window: ChromeWindow,
		id: AppConfig.get('addonID'),
		blur: true,
		append: 'addon-bar',
		content: content,
		onShow: function () {
			WindowEvents.emit(document, 'UIToggleOn');
		},
		onHide: function () {
			WindowEvents.emit(document, 'UIToggleOff');
		}
	});

	this.panel = panel;
	this.document = document;
	this.UINode = {content: content};
	this.DomElem = DomElem;
	this.init();
	this.StorageFolderID = AppConfig.get('StorageFolderID');

	// Panel States
	var UI = content.parentElement;
	function setPanelAtribute(props) {
		for (var key in props) {
			props[key] !== undefined ? UI.setAttribute(key, props[key]) : UI.removeAttribute(key);
		}
	};

	// App Events

	WindowEvents.register(document, 'ChangeUIState', setPanelAtribute);
	WindowEvents.register(document, 'SessionContextMenu-OpenSession', SessionManager.restoreSession);
	WindowEvents.register(document, 'SessionContextMenu-OpenInNewWindow', SessionManager.restoreNewWindow);

	WindowEvents.register(document, 'SessionContextMenu-EditSession', function(folderID) {
		var title = Bookmarks.getItemTitle(folderID);
		var desc = Bookmarks.getItemDescription(folderID);

		WindowEvents.emit(document, 'SessionInfoWidget-Invoke', {
			context : folderID,
			fields : {
				title : title,
				desc : desc
			}
		});
	});

	WindowEvents.register(document, 'SessionInfoWidget-Save', function(data) {
		SessionManager.updateProperties({
			id : data.context,
			title : data.fields['title'],
			desc : data.fields['desc']
		});
	});

	WindowEvents.register(document, 'BookmarkEditWidget-Save', function(data) {
		GlobalEvents.emit('lock-observer');

		var bookmark = data.context;
		bookmark.setTitle(data.fields['title']);
		bookmark.setLocation(data.fields['url']);

		GlobalEvents.emit('unlock-observer');
		GlobalEvents.emit('update-sessions');
	});

	WindowEvents.register(document, 'SessionListContextMenu-EmptySession', function() {
		GlobalEvents.emit('lock-observer');

		var folderID = SessionManager.createEmptySession(AppConfig.get('StorageFolderID'));
		this.setPromiseSession(folderID);

		GlobalEvents.emit('unlock-observer');
		GlobalEvents.emit('update-sessions');
	}.bind(this));
}

// *****************************************************************************
// UI Methods

SessionSyncUI.prototype.init = function init() {
	var DomElem = this.DomElem;
	this.promiseID = -1;

	// UI compoments
	var container = DomElem('div', {class: 'body'});
	var sessions = DomElem('div', {class: 'sessions'});

	// Search Session
	// var search = this.createFilterBox();
	// sessions.appendChild(search);

	// Curent Session
	var category = DomElem('div', {class: 'category'});
	var currentTabs = DomElem('div', {class: 'folder'});
	currentTabs.setAttribute('active', 'true');
	currentTabs.textContent = 'Current Session';
	category.appendChild(currentTabs);
	sessions.appendChild(category);

	var showCurrentTabs = function showCurrentTabs() {
		this.SessionInfo.showCurrentSession();
		this.setActiveSessionNode();
	}.bind(this);

	var sessionClick = function sessionClick(e) {
		var target = e.target;
		if (target.className !== 'folder')
			return;
		var sessionID = target.getAttribute('sessionID') | 0;
		this.SessionInfo.previewSession(this.sessions[sessionID]);
		this.setActiveSessionNode(target);
	}.bind(this);

	var handleRightClick = function handleRightClick(e) {
		// Right Click
		if (e.button == 2) {
			e.stopPropagation();
			WindowEvents.emit(this.document, 'SessionListContextMenu-Open', e);
		}
	}.bind(this);

	var confirmDelete = function confirmDelete(context, event) {
		WindowEvents.emit(this.document, 'ConfirmBox-Open', event);
		WindowEvents.emit(this.document, 'ConfirmBox-Callback', function() {
			if (context instanceof SessionBookmark) {
				SessionManager.deleteItem(context.bookmark.id);
			} else {
				SessionManager.deleteItem(context);
			}
		});
	}.bind(this);

	// Active Sesssion
	this.activeSessionNode = currentTabs;

	// Session list
	var list = DomElem('div', {class: 'list'});
	sessions.appendChild(list);


	// Events
	list.addEventListener('click', sessionClick);
	list.addEventListener('mousedown', handleRightClick);

	currentTabs.addEventListener('mousedown', handleRightClick);
	currentTabs.addEventListener('click', showCurrentTabs);

	EventDestroyer.add(list, 'click', sessionClick);
	EventDestroyer.add(currentTabs, 'click', showCurrentTabs);

	// UI Modules
	var BM = new ContextMenu(this.document, {name : 'BookmarkContextMenu'});
	BM.addMenuEntry({value: 'Open (current tab)', func: 'openInCurrentTab'});
	BM.addMenuEntry({value: 'Open (new window)', func: 'openInNewWindow'});
	BM.addMenuEntry({value: 'Copy URL', func: 'copyURLToClipboard'});
	BM.addMenuEntry({value: 'Edit', func: 'edit'});
	BM.addMenuEntry({value: 'Remove', callback: confirmDelete});

	// Session Context Menu
	var CM = new ContextMenu(this.document, {name : 'SessionContextMenu'});
	CM.addMenuEntry({value: 'Restore session', event: 'OpenSession'});
	CM.addMenuEntry({value: 'Restore (new window)', event: 'OpenInNewWindow'});
	CM.addMenuEntry({value: 'Edit', event: 'EditSession'});
	CM.addMenuEntry({value: 'Delete', callback: confirmDelete});

	// Session List Context Menu
	var SL = new ContextMenu(this.document, {name : 'SessionListContextMenu'});
	SL.addMenuEntry({value: 'New Empty Session', event: 'EmptySession'});

	// Field edit widgets
	var BEP = new FieldEditWdiget(this.document, {name: 'BookmarkEditWidget', parent: container});
	BEP.addField({label: 'Name', name: 'title'});
	BEP.addField({label: 'Location', name: 'url'});

	var SEP = new FieldEditWdiget(this.document, {name: 'SessionInfoWidget', parent: container});
	SEP.addField({label: 'Title', name: 'title'});
	SEP.addField({label: 'Description', name: 'desc'});

	var CB = new ConfirmBox(this.document, {name: 'ConfirmBox'});

	// Create UI
	this.UINode.content.appendChild(container);
	this.UINode.sessionsList = list;
	this.UINode.currentSession = currentTabs;
	this.SessionInfo = new Session(this);

	// Attach main components
	container.appendChild(sessions);
	container.appendChild(this.SessionInfo.container);

	// Set current session
	this.SessionInfo.showCurrentSession();
	this.setActiveSessionNode();
};

SessionSyncUI.prototype.createFilterBox = function createFilterBox() {
	var DomElem = this.DomElem;
	var search = DomElem('input', {type: 'text', class: 'search', placeholder:'Search Session'});
	var timeOut = null;
	var filterCallback = this.filterSessions.bind(this);
	var onKeyDown = function(e) {
		timeOut ? clearTimeout(timeOut) : 0;
		timeOut = setTimeout(filterCallback, 200);
	};

	var onFocus = function onFocus() {
		this.document.addEventListener('keyup', onKeyDown);
	}.bind(this);

	var onBlur = function onBlur() {
		this.document.removeEventListener('keyup', onKeyDown);
	}.bind(this);

	// Events
	search.addEventListener('focus', onFocus);
	search.addEventListener('blur', onBlur);

	EventDestroyer.add(search, 'focus', onFocus);
	EventDestroyer.add(search, 'blur', onBlur);

	this.searchBox = search;
	return search;
};

SessionSyncUI.prototype.focusFilterBox = function focusFilterBox() {
	this.searchBox.value = '';
	this.searchBox.focus();
};

SessionSyncUI.prototype.blurFilterBox = function blurFilterBox() {
	this.searchBox.blur();
};

SessionSyncUI.prototype.setActiveSessionNode = function setActiveSessionNode(node) {
	if (!node || !node.nodeName) node = this.UINode.currentSession;
	if (this.activeSessionNode === node)
		return;
	this.activeSessionNode.removeAttribute('active');
	this.activeSessionNode = node;
	node.setAttribute('active', 'true');
};

SessionSyncUI.prototype.createDateSeparator = function createDateSeparator(time) {
	var DomElem = this.DomElem;
	var separator = DomElem('div', {class: 'date'});
	var d = new Date(time);
	separator.textContent = d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
	return separator;
};

SessionSyncUI.prototype.createSessionFolder = function createSessionFolder(ss, index) {
	var DomElem = this.DomElem;
	var folder = DomElem('div', {class: 'folder', 'draggable' : 'true'});
	folder.textContent = ss.title;
	folder.setAttribute('sessionID', index);

	if (ss.id === this.promiseID) {
		this.setActiveSessionNode(folder);
		this.SessionInfo.previewSession(this.sessions[index]);
		this.promiseFound = true;
	}

	var self = this;
	folder.addEventListener('mousedown', function(e) {
		// Right Click
		if (e.button == 2) {
			e.stopPropagation();
			WindowEvents.emit(self.document, 'SessionContextMenu-Context', ss.id);
			WindowEvents.emit(self.document, 'SessionContextMenu-Open', e);
		}
	});

	// Drag and drop
	var dragEnd = function dragEnd(info) {
		if (info.from > info.to) info.to--;
		SessionManager.moveItem({
			id : ss.id,
			parent: self.StorageFolderID,
			index: info.to
		});
	};
	DragNDrop.setDraggable(folder, dragEnd);

	return folder;
};

// *****************************************************************************
// Session Methods

SessionSyncUI.prototype.filterSessions = function filterSessions(e) {
	var filter = this.searchBox.value.toLowerCase();
	var sessions = this.sessions;
	var list = this.UINode.sessionsList;
	var items = this.UINode.sessionsList.childElementCount;
	for (var i = 0; i < items; i++) {
		if (list.children[i].className !== 'folder')
			continue;
		if(list.children[i].textContent.toLowerCase().indexOf(filter) !== -1)
			list.children[i].removeAttribute('filter');
		else
			list.children[i].setAttribute('filter', 'true');
	}
	var hide_date = true;
	for (var i = items-1; i >= 0; i--) {
		if (list.children[i].className === 'date') {
			if (hide_date)
				list.children[i].setAttribute('filter', 'true');
			else
				list.children[i].removeAttribute('filter');
			hide_date = true;
			continue;
		}
		if (list.children[i].hasAttribute('filter'))
			hide_date &= true;
		else
			hide_date &= false;
	}
};

SessionSyncUI.prototype.setPromiseSession = function setPromiseSession(sessionsID) {
	this.promiseID = sessionsID;
};

SessionSyncUI.prototype.setSessions = function setSessions(sessions) {
	this.promiseFound = false;
	this.sessions = sessions;
	this.lastD = new Date(0);
	var SessionsNode = this.UINode.sessionsList;
	SessionsNode.textContent = '';

	for (var i in sessions) {
		/*
		var d = new Date(sessions[i].modified);
		if (this.lastD.getDate() !== d.getDate() ||
			this.lastD.getMonth() !== d.getMonth() ||
			this.lastD.getFullYear() !== d.getFullYear()) {
			this.lastD = d;
			var separator = this.createDateSeparator(sessions[i].modified);
			SessionsNode.appendChild(separator);
		}
		*/
		var session = this.createSessionFolder(sessions[i], i);
		SessionsNode.appendChild(session);
	}
	if (!this.promiseFound) {
		this.promiseFound = true;
		this.SessionInfo.showCurrentSession();
	}
};

// *****************************************************************************
// General Methods

SessionSyncUI.prototype.toggle = function togglePanel(pinned) {
	if (this.panel.toggle()) {
		if (pinned) {
			var btn = this.document.getElementById('action-button--session-syncgabrielivanicacom-syncbtn');
			var rect = btn.getBoundingClientRect();
			if (rect.left < 300)
				this.panel.pin(rect.bottom, rect.right, 'left');
			else
				this.panel.pin(rect.bottom, rect.left, 'right');
		}
		else {
			this.panel.center();
		}
	}
};

SessionSyncUI.prototype.destroy = function destroy() {
	this.panel.destroy();
	this.SessionInfo.destroy();

	EventDestroyer.execute(this.UINode.sessionsList);
	EventDestroyer.execute(this.UINode.currentSession);
	EventDestroyer.execute(this.searchBox);

	WindowEvents.emit(this.document, 'InstanceDestroy');
	WindowEvents.remove(this.document);

	this.panel = null;
	this.document = null;
	this.UINode = null;
	this.DomElem = null;
	this.SessionInfo = null;
	this.UINode = null;

};

// *****************************************************************************
// Public API
exports.SessionSyncUI = SessionSyncUI;