'use strict';

// *****************************************************************************
// SDK Modules
const windowUtils = require('sdk/window/utils');
const { browserWindows } = require("sdk/windows");
const { getFavicon } = require("sdk/places/favicon");
const { data } = require('sdk/self');
const { EventTarget } = require("sdk/event/target");
const { emit } = require("sdk/event/core");
const {setTimeout, clearTimeout} = require("sdk/timers");
const tabs = require("sdk/tabs");

// *****************************************************************************
// Custom Modules

const { HTMLCreator } = require('dom');
const { XULPanel } = require('xul-panel');
const { Bookmarks } = require('bookmarks');
const PP = require('prettyprint');

require('userstyles').load(data.url('overlay.css'));

const monthNames = [ 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December' ];

// *****************************************************************************
// Session Info UI

var SessionInfo = function SessionInfo(syncUI, container) {
	this.InfoContainer = container;
	this.SyncUI = syncUI;
	this.newDomElem = HTMLCreator(container.ownerDocument);
	this.createUI(container);
};

SessionInfo.prototype.createMenu = function createMenu() {
	var DomElem = this.newDomElem;

	// Session menu
	var menu = DomElem('div', {id: 'menu'});
	var del = DomElem('div', {id : 'delete'});
	var save = DomElem('div', {id: 'save'});
	var edit = DomElem('div', {id: 'edit'});
	var restore = DomElem('div', {id: 'restore'});

	del.textContent = 'Delete';
	save.textContent = 'Save session';
	edit.textContent = 'Edit';
	restore.textContent = 'Restore session';

	menu.appendChild(save);
	menu.appendChild(restore);
	menu.appendChild(edit);
	menu.appendChild(del);

	restore.addEventListener('click', this.restoreSession.bind(this));
	edit.addEventListener('click', this.editSession.bind(this));
	save.addEventListener('click', this.editSession.bind(this));
	del.addEventListener('click', this.deleteSession.bind(this));

	return menu;
};

SessionInfo.prototype.createEditPanel = function createEditPanel() {
	var DomElem = this.newDomElem;

	// Edit session panel
	var edit_panel = DomElem('div', {id: 'edit-panel'});
	var save = DomElem('div', {class: 'button'});
	var cancel = DomElem('div', {class: 'button'});

	save.textContent = 'Save';
	cancel.textContent = 'Cancel';

	var groupName = DomElem('div', {class: 'group'});
	var labelName = DomElem('label', {for: 'edit-title'});
	var inputName = DomElem('input', {id: 'edit-title'});
	labelName.textContent = 'Name';
	groupName.appendChild(labelName);
	groupName.appendChild(inputName);

	var groupDesc = DomElem('div', {class: 'group'});
	var labelDesc = DomElem('label', {for: 'edit-description'});
	var inputDesc = DomElem('input', {id: 'edit-description'});
	labelDesc.textContent = 'Description';
	groupDesc.appendChild(labelDesc);
	groupDesc.appendChild(inputDesc);

	edit_panel.appendChild(groupName);
	edit_panel.appendChild(groupDesc);
	edit_panel.appendChild(cancel);
	edit_panel.appendChild(save);

	cancel.addEventListener('click', this.setDefaultState.bind(this));
	save.addEventListener('click', this.updateSession.bind(this));

	this.DomNode.inputName = inputName;
	this.DomNode.inputDesc = inputDesc;

	return edit_panel;
};

SessionInfo.prototype.createUI = function createUI(container) {
	var DomElem = this.newDomElem;
	this.DomNode = {};

	// Display information about the session
	var description = DomElem('div', {id: 'description'});
	container.appendChild(description);

	// Session menu
	var menu = this.createMenu();
	container.appendChild(menu);

	// Edit session panel
	var edit_panel = this.createEditPanel();
	container.appendChild(edit_panel);

	// Preview Session tabs
	var tabs = DomElem('div', {class: 'tabs'});
	container.appendChild(tabs);

	this.menu = menu;
	this.descriptionNode = description;
	this.tabs = tabs;
};

SessionInfo.prototype.createTabTile = function createTabTile(tab) {
	var DomElem = this.newDomElem;
	var box = DomElem('div', {class : 'tab'});
	var title = DomElem('div', {class : 'title'});
	var favicon = DomElem('div', {class : 'favicon'});
	var text = DomElem('div', {class : 'text'});
	var url = DomElem('div', {class : 'url'});

	getFavicon(tab.url).then(function(url) {
		favicon.style.background = 'url("' + url + '")';
	});

	box.addEventListener('click', function() {
		this.hasAttribute('active') ? this.removeAttribute('active') : this.setAttribute('active','');
	});

	url.addEventListener('click', function(event) {
		event.stopPropagation();
		tabs.open(tab.url);
	});

	if (tab.id > 0) {
		var remove = DomElem('div', {class : 'remove'});
		remove.addEventListener('click', function() {
			Bookmarks.removeBookmark(tab.id);
			box.parentNode.removeChild(box);
		});
		box.appendChild(remove);
	}

	url.textContent = tab.url;
	text.textContent = tab.title;
	title.appendChild(favicon);
	title.appendChild(text);
	box.appendChild(title);
	box.appendChild(url);
	return box;
};

SessionInfo.prototype.toggleNode = function toggleNode(node, state) {
	node.style.display = state;
};

SessionInfo.prototype.setDate = function setDate(container, date) {
	var d = new Date(date);
	container.textContent = d.getDay() + ' ' + monthNames[d.getMonth()] + ' ' + d.getFullYear();
};

SessionInfo.prototype.setState = function setState(state) {
	this.InfoContainer.setAttribute('state', state);
	this.state = state;
};

SessionInfo.prototype.setDefaultState = function setDefaultState(state) {
	this.session.id ? this.setState('restore') : this.setState('current');
};

SessionInfo.prototype.deleteSession = function deleteSession() {
	Bookmarks.BServ.removeItem(this.session.id);
	this.SyncUI.setPromiseSession(0);
	this.SyncUI.showCurrentSession();
};

SessionInfo.prototype.updateSession = function updateSession() {
	var inputName = this.DomNode.inputName;
	var inputDesc = this.DomNode.inputDesc;

	emit(this.SyncUI, 'freeze-observer');

	if (this.state === 'edit') {
		this.SyncUI.setPromiseSession(this.session.id);
		if (inputName.value !== this.session.title)
			Bookmarks.setItemTitle(this.session.id, inputName.value);
		if (inputDesc.value !== this.session.description)
			Bookmarks.setItemDescription(this.session.id, inputDesc.value);
	}

	if (this.state === 'save-session') {
			var folderID = Bookmarks.createFolder(this.SyncUI.storageFolderID, inputName.value, -1);

			this.SyncUI.setPromiseSession(folderID);
			this.setDefaultState();

			Bookmarks.setItemDescription(folderID, inputDesc.value);

			var tabs = browserWindows.activeWindow.tabs;
			for (var i in tabs) {
				Bookmarks.addBookmark(folderID, tabs[i].title, tabs[i].url);
			}
	}

	emit(this.SyncUI, 'unfreeze-observer');
	emit(this.SyncUI, 'update');
};

SessionInfo.prototype.editSession = function editSession() {
	this.session.id ? this.setState('edit') : this.setState('save-session');
	this.DomNode.inputName.value = this.session.title;
	this.DomNode.inputDesc.value = this.session.description;
};

SessionInfo.prototype.previewSession = function previewSession(session) {
	this.session = session;
	this.setDefaultState();

	if (session.description)
		this.descriptionNode.textContent = session.description;
	else
		this.descriptionNode.textContent = session.title;
	// this.setDate(this.created, session.date);
	// this.setDate(this.modified, session.modified);

	this.tabs.textContent = '';
	for (var i in session.tabs) {
		var tile = this.createTabTile(session.tabs[i]);
		this.tabs.appendChild(tile);
	}

	// Inspect event delagation alternative
	// this.tabs.addEventListener('click', function(e) {
		// var target = e.target;
		// if (target.className === 'title') {
			// target.hasAttribute('active') ? target.removeAttribute('active') : target.setAttribute('active','');
		// }
	// });
};

SessionInfo.prototype.restoreSession = function restoreSession() {
	for (var i in this.session.tabs) {
		tabs.open(this.session.tabs[i].url);
	}
	this.SyncUI.toggle();
};


// *****************************************************************************
// Awesome Session Sync UI

function SessionSyncUI(window) {
	var document = window.document;
	var DomElem = HTMLCreator(document);
	// *************************************************************************
	// Create UI compontents

	// Add XUL Overlay and base HTML content
	var content = DomElem('div', {id: 'content'});
	var panel = XULPanel({
		window: window,
		id: 'sessions-sync',
		append: 'nav-bar',
		content: content
	});

	// content.setAttribute('draggable', 'true');
	// content.addEventListener('drop', function(e) {});
	// content.addEventListener('dragover', allowDropEvent);

	this.panel = panel;
	this.UINode = {content: content};
	this.newDomElem = DomElem;
	this.document = document;
	this.init();
}

SessionSyncUI.prototype = Object.create(EventTarget.prototype);

// *****************************************************************************
// UI Methods

SessionSyncUI.prototype.init = function init() {
	var DomElem = this.newDomElem;
	this.promiseID = -1;

	// UI compoments
	var container = DomElem('div', {id: 'body'});
	var sessions = DomElem('div', {id: 'sessions'});
	var session = DomElem('div', {id: 'session-info'});

	// Search Session
	var search = this.createFilterBox();
	sessions.appendChild(search);

	// Curent Session
	var category = DomElem('div', {class: 'category'});
	var title = DomElem('div', {class: 'title'});
	var currentTabs = DomElem('div', {class: 'folder'});
	currentTabs.setAttribute('active', 'true');
	currentTabs.textContent = 'Tabs';
	title.textContent = 'Current Session';
	category.appendChild(title);
	category.appendChild(currentTabs);
	sessions.appendChild(category);

	// Active Sesssion
	this.activeSessionNode = currentTabs;
	currentTabs.addEventListener('click', this.showCurrentSession.bind(this));

	// Saved Sesssions
	category = DomElem('div', {class: 'category'});
	title = DomElem('div', {class: 'title'});
	title.textContent = 'Saved Session';
	category.appendChild(title);
	sessions.appendChild(category);

	// Session list
	var list = DomElem('div', {class: 'list'});
	list.addEventListener('click', function sessionClick(e) {
		var target = e.target;
		if (target.className !== 'folder')
			return;
		var sessionID = target.getAttribute('sessionID') | 0;
		this.showSession(sessionID);
		this.setActiveSessionNode(target);
	}.bind(this));
	sessions.appendChild(list);

	// Attach main components
	container.appendChild(sessions);
	container.appendChild(session);

	this.currentTabs = currentTabs;
	this.UINode.content.appendChild(container);
	this.UINode.sessionsList = list;
	this.SessionInfo = new SessionInfo(this, session);
	this.showCurrentSession();
};

SessionSyncUI.prototype.createFilterBox = function createFilterBox() {
	var DomElem = this.newDomElem;
	var search = DomElem('input', {type: 'text', id: 'search', placeholder:'Search Session'});
	var timeOut = null;
	var filterCallback = this.filterSessions.bind(this);
	var onKeyDown = function(e) {
		timeOut ? clearTimeout(timeOut) : 0;
		timeOut = setTimeout(filterCallback, 200);
	};

	search.addEventListener('focus', function onFocus() {
		this.document.addEventListener('keyup', onKeyDown);
	}.bind(this));

	search.addEventListener('blur', function onBlur() {
		this.document.removeEventListener('keyup', onKeyDown);
	}.bind(this));

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
	if (this.activeSessionNode === node)
		return;
	this.activeSessionNode.removeAttribute('active');
	this.activeSessionNode = node;
	node.setAttribute('active', 'true');
};

SessionSyncUI.prototype.createDateSeparator = function createDateSeparator(time) {
	var DomElem = this.newDomElem;
	var separator = DomElem('div', {class: 'date'});
	var d = new Date(time);
	separator.textContent = d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
	return separator;
};

SessionSyncUI.prototype.createSessionFolder = function createSessionFolder(ss, index) {
	var DomElem = this.newDomElem;
	var folder = DomElem('div', {class: 'folder'});
	folder.textContent = ss.title;
	folder.setAttribute('sessionID', index);

	if (ss.id === this.promiseID) {
		this.setActiveSessionNode(folder);
		this.showSession(index);
	}

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

SessionSyncUI.prototype.showCurrentSession = function showCurrentSession() {
	var session = {
		id : 0,
		title : 'Active Session',
		description : '',
		date : new Date(),
		modified : new Date(),
		tabs : browserWindows.activeWindow.tabs
	};
	this.SessionInfo.previewSession(session);
	this.setActiveSessionNode(this.currentTabs);
};

SessionSyncUI.prototype.showSession = function showSession(sessionID) {
	var session = this.sessions[sessionID];
	session.tabs = Bookmarks.getFolderBookmarks(session.id, {
		types : ['uri'],
		properties : {title : 'title', uri : 'url', itemId : 'id'}
	});
	this.SessionInfo.previewSession(session);
};

SessionSyncUI.prototype.setSessions = function setSessions(sessions) {
	this.sessions = sessions;
	this.lastD = new Date(0);
	var SessionsNode = this.UINode.sessionsList;
	SessionsNode.textContent = '';
	for (var i in sessions) {
		var d = new Date(sessions[i].modified);
		if (this.lastD.getDate() !== d.getDate() ||
			this.lastD.getMonth() !== d.getMonth() ||
			this.lastD.getFullYear() !== d.getFullYear()) {
			this.lastD = d;
			var separator = this.createDateSeparator(sessions[i].modified);
			SessionsNode.appendChild(separator);
		}

		var session = this.createSessionFolder(sessions[i], i);
		SessionsNode.appendChild(session);
	}
};

// *****************************************************************************
// General Methods

SessionSyncUI.prototype.setStorageFolderID = function setStorageFolderID(storageFolderID) {
	this.storageFolderID = storageFolderID;
};

SessionSyncUI.prototype.toggle = function togglePanel(pinned) {
	if (pinned) {
		var btn = this.document.getElementById('session-sync-btn');
		var rect = btn.getBoundingClientRect();
		// console.log("Pinned Mode", rect.top, rect.right, rect.bottom, rect.left);
		if (rect.left < 300)
			this.panel.pin(rect.bottom, rect.right, 'left');
		else
			this.panel.pin(rect.bottom, rect.left, 'right');
	}
	else
		this.panel.center();

	this.panel.toggle() ? this.focusFilterBox() : this.blurFilterBox();
};

SessionSyncUI.prototype.destroy = function destroy() {
	// TODO unregiser all events
	this.panel.destroy();
};

// *****************************************************************************
// Module exports
exports.SessionSyncUI = SessionSyncUI;