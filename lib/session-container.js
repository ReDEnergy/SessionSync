'use strict';

// *****************************************************************************
// SDK Modules

const { browserWindows } = require("sdk/windows");
const { getFavicon } = require("sdk/places/favicon");
const { EventTarget } = require("sdk/event/target");
const { emit } = require("sdk/event/core");
const { setTimeout, clearTimeout } = require("sdk/timers");
const tabs = require("sdk/tabs");


// *****************************************************************************
// Custom Modules

const { HTMLCreator } = require('./utils/dom');
const { Bookmarks } = require('./utils/bookmarks');
const { SessionBookmark, SessionTab } = require('./session-bookmark');
const { GlobalEvents } = require('./utils/global-events');
const { EventDestroyer } = require('./utils/event-destroyer');

// *****************************************************************************
// Global Variables

const monthNames = [ 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December' ];


// *****************************************************************************
// Session Info UI

function Session(syncUI) {
	var DomElem = syncUI.DomElem;
	var container = DomElem('div', {class: 'session-info'});
	this.container = container;
	this.SyncUI = syncUI;
	this.DomElem = DomElem;
	this.createUI(container);
};

Session.prototype = Object.create(EventTarget.prototype);

Session.prototype.createUI = function createUI(container) {
	var DomElem = this.DomElem;
	this.DomNode = {};

	// Display information about the session
	var description = DomElem('div', {class: 'description'});
	container.appendChild(description);

	// Create UI
	var menu = this.createMenu();
	var edit_panel = this.createEditPanel();
	var bookmarks = DomElem('div', {class: 'bookmarks'});
	var bookmark_url = DomElem('div', {class: 'bookmark-url'});

	container.appendChild(menu);
	container.appendChild(edit_panel);
	container.appendChild(bookmarks);
	container.appendChild(bookmark_url);

	var timeout_url = null;

	this.on('bookmark-url-hide', function() {
		timeout_url = setTimeout(function() {
			bookmark_url.removeAttribute('data-active');
			timeout_url = null;
		}, 1000);
	});

	this.on('bookmark-url', function(bookmark) {
		if (timeout_url === null)
			bookmark_url.setAttribute('data-active', 'true');
		bookmark_url.textContent = bookmark.url;
		clearTimeout(timeout_url);
	});

	this.menu = menu;
	this.bookmarks = [];
	this.DomNode.url = bookmark_url;
	this.DomNode.description = description;
	this.DomNode.bookmarks = bookmarks;
};

Session.prototype.createMenu = function createMenu() {
	var DomElem = this.DomElem;

	// Session menu
	var menu = DomElem('div', {class: 'menu'});
	var del = DomElem('div', {class : 'delete'});
	var save = DomElem('div', {class: 'save'});
	var edit = DomElem('div', {class: 'edit'});
	var restore = DomElem('div', {class: 'restore'});

	del.textContent = 'Delete';
	save.textContent = 'Save session';
	edit.textContent = 'Edit';
	restore.textContent = 'Restore session';

	menu.appendChild(save);
	menu.appendChild(restore);
	menu.appendChild(edit);
	menu.appendChild(del);

	var restoreSession = this.restoreSession.bind(this);
	var editSession = this.editSession.bind(this);
	var deleteSession = this.deleteSession.bind(this);

	// Events
	restore.addEventListener('click', restoreSession);
	edit.addEventListener('click', editSession);
	save.addEventListener('click', editSession);
	del.addEventListener('click', deleteSession);

	EventDestroyer.add(restore, 'click', restoreSession);
	EventDestroyer.add(edit, 'click', editSession);
	EventDestroyer.add(save, 'click', editSession);
	EventDestroyer.add(del, 'click', deleteSession);

	this.DomNode.restore = restore;
	this.DomNode.editMenu = edit;
	this.DomNode.saveMenu = save;
	this.DomNode.del = del;

	return menu;
};

Session.prototype.createEditPanel = function createEditPanel() {
	var DomElem = this.DomElem;

	// Edit session panel
	var edit_panel = DomElem('div', {class: 'edit-panel'});
	var save = DomElem('div', {class: 'button'});
	var cancel = DomElem('div', {class: 'button'});

	save.textContent = 'Save';
	cancel.textContent = 'Cancel';

	var groupName = DomElem('div', {class: 'group'});
	var labelName = DomElem('label', {for: 'red-ss-edit-title'});
	var inputName = DomElem('input', {id: 'red-ss-edit-title'});
	labelName.textContent = 'Name';
	groupName.appendChild(labelName);
	groupName.appendChild(inputName);

	var groupDesc = DomElem('div', {class: 'group'});
	var labelDesc = DomElem('label', {for: 'red-ss-edit-description'});
	var inputDesc = DomElem('input', {id: 'red-ss-edit-description'});
	labelDesc.textContent = 'Description';
	groupDesc.appendChild(labelDesc);
	groupDesc.appendChild(inputDesc);

	edit_panel.appendChild(groupName);
	edit_panel.appendChild(groupDesc);
	edit_panel.appendChild(cancel);
	edit_panel.appendChild(save);

	var setDefaultState = this.setDefaultState.bind(this);
	var updateSession = this.updateSession.bind(this);

	cancel.addEventListener('click', setDefaultState);
	save.addEventListener('click', updateSession);

	EventDestroyer.add(cancel, 'click', setDefaultState);
	EventDestroyer.add(save, 'click', updateSession);

	this.DomNode.savePanel = save;
	this.DomNode.cancel = cancel;
	this.DomNode.inputName = inputName;
	this.DomNode.inputName = inputName;
	this.DomNode.inputDesc = inputDesc;

	return edit_panel;
};

Session.prototype.showUrlBar = function showUrlBar(bookmark) {
	if (this.timeoutURL === null)
		this.DomNode.url.setAttribute('data-active', 'true');
	this.DomNode.url.textContent = bookmark.url;
	clearTimeout(this.timeoutURL);
};

Session.prototype.hideUrlBar = function hideUrlBar() {
	this.timeoutURL = setTimeout(function() {
		this.DomNode.url.removeAttribute('data-active');
		this.timeoutURL = null;
	}, 1000);
};

Session.prototype.toggleNode = function toggleNode(node, state) {
	node.style.display = state;
};

Session.prototype.setDate = function setDate(container, date) {
	var d = new Date(date);
	container.textContent = d.getDay() + ' ' + monthNames[d.getMonth()] + ' ' + d.getFullYear();
};

Session.prototype.setState = function setState(state) {
	var panel = this.SyncUI.UINode.content.parentElement;
	panel.setAttribute('session', state);
	this.state = state;
};

Session.prototype.setDefaultState = function setDefaultState(state) {
	this.session.id ? this.setState('restore') : this.setState('current');
};

Session.prototype.deleteSession = function deleteSession() {
	try {
		Bookmarks.removeItem(this.session.id);
	} catch (err){
	}
};

Session.prototype.updateSession = function updateSession() {
	emit(GlobalEvents, 'lock-observer');

	if (this.state === 'edit') {
		this.SyncUI.setPromiseSession(this.session.id);
		if (this.DomNode.inputName.value !== this.session.title)
			Bookmarks.setItemTitle(this.session.id, this.DomNode.inputName.value);
		if (this.DomNode.inputDesc.value !== this.session.description) {
			Bookmarks.setItemDescription(this.session.id, this.DomNode.inputDesc.value);
		}
	}

	if (this.state === 'save-session') {
			var folderID = Bookmarks.createFolder(this.SyncUI.storageFolderID, this.DomNode.inputName.value);
			this.SyncUI.setPromiseSession(folderID);
			Bookmarks.setItemDescription(folderID, this.DomNode.inputDesc.value);

			var tabs = browserWindows.activeWindow.tabs;
			for (var i in tabs) {
				Bookmarks.addBookmark(folderID, tabs[i].title, tabs[i].url);
			}

			this.setDefaultState();
	}

	emit(GlobalEvents, 'unlock-observer');
	emit(GlobalEvents, 'update-sessions');
};

Session.prototype.editSession = function editSession() {
	this.session.id ? this.setState('edit') : this.setState('save-session');
	this.DomNode.inputName.value = this.session.title;
	this.DomNode.inputDesc.value = this.session.description;
};

Session.prototype.showCurrentSession = function showCurrentSession() {
	var date = new Date();
	var session = {
		id : 0,
		title : date.toDateString(),
		description : '',
		date : date,
		modified : date,
		tabs : browserWindows.activeWindow.tabs
	};
	this.session = session;
	this.DomNode.description.textContent = '';

	this.bookmarks.forEach(function (bookmark) {
		bookmark.destroy();
	});
	this.bookmarks = [];

	// this.DomNode.bookmarks.textContent = '';

	for (var i in session.tabs) {
		var bookmark = new SessionTab(this, session.tabs[i]);
		this.DomNode.bookmarks.appendChild(bookmark.domRoot);
		this.bookmarks.push(bookmark);
	}
	this.setDefaultState();
	this.SyncUI.setActiveSessionNode();
};

Session.prototype.previewSession = function previewSession(session) {
	session.tabs = Bookmarks.getFolderBookmarks(session.id, {
		types : ['uri'],
		properties : {title : 'title', uri : 'url', itemId : 'id'}
	});
	session.description = Bookmarks.getDescription(session.id);
	this.session = session;
	this.DomNode.description.textContent = session.description ? session.description : session.title;

	this.bookmarks.forEach(function (bookmark) {
		bookmark.destroy();
	});
	this.bookmarks = [];

	// this.DomNode.bookmarks.textContent = '';
	for (var i in session.tabs) {
		var bookmark = new SessionBookmark(this, session.tabs[i]);
		this.DomNode.bookmarks.appendChild(bookmark.domRoot);
		this.bookmarks.push(bookmark);
	}

	this.setDefaultState();
	this.SyncUI.setPromiseSession(session.id);
};

Session.prototype.restoreSession = function restoreSession() {
	for (var i in this.session.tabs) {
		tabs.open(this.session.tabs[i].url);
	}
	this.SyncUI.toggle();
};

Session.prototype.destroy = function destroy() {
	EventDestroyer.execute(this.DomNode.savePanel);
	EventDestroyer.execute(this.DomNode.cancel);
	EventDestroyer.execute(this.DomNode.restore);
	EventDestroyer.execute(this.DomNode.editMenu);
	EventDestroyer.execute(this.DomNode.saveMenu);
	EventDestroyer.execute(this.DomNode.del);

	this.bookmarks.forEach(function (bookmark) {
		bookmark.destroy();
	});
	this.SyncUI = null;
	this.menu = null;
	this.DomNode = null;
	this.DomElem = null;
};

// Public API
exports.Session = Session;