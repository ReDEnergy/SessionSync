'use strict';

// *****************************************************************************
// SDK Modules

const { browserWindows } = require("sdk/windows");
const { getFavicon } = require("sdk/places/favicon");
const { EventTarget } = require("sdk/event/target");
const { setTimeout, clearTimeout } = require("sdk/timers");
const clipboard = require("sdk/clipboard");
const tabs = require("sdk/tabs");

// *****************************************************************************
// Custom Modules

const { SessionBookmark, SessionTab } = require('./session-bookmark');
const { Bookmarks, BookmarksService } = require('./utils/bookmarks');
const { WindowEvents, GlobalEvents } = require('./utils/global-events');
const { EventDestroyer } = require('./utils/event-destroyer');
const { Tooltip } = require('./utils/tooltip');
const { AppConfig } = require('./config');
const { UrlBar } = require('./url-bar');
const { SessionManager } = require('./session/management');
const L10N = require('./l10n');


// *****************************************************************************
// Global Variables

const monthNames = [ 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December' ];


// *****************************************************************************
// Session Info UI

function Session(SyncUI) {
	var DomElem = SyncUI.DomElem;
	var container = DomElem('div', {class: 'session-info'});
	this.container = container;
	this.SyncUI = SyncUI;
	this.DomElem = DomElem;
	this.createUI(container);
	this.document = SyncUI.document;


	// App Events
	WindowEvents.register(this.document, 'MoveBookmark', function(info) {
		GlobalEvents.emit('lock-observer');

		if (info.from > info.to) info.to--;
		BookmarksService.moveItem(info.id, this.session.id, info.to);

		GlobalEvents.emit('unlock-observer');
		GlobalEvents.emit('update-sessions');
	}.bind(this));

	WindowEvents.register(this.document, 'UIToggleOn', function() {
		if (this.session.id === 0) {
			this.showCurrentSession();
		}
	}.bind(this));
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
	var bookmarks = DomElem('div', {class: 'bookmarks'});
	var urlBar = new UrlBar(this.SyncUI.document);

	container.appendChild(menu);
	container.appendChild(bookmarks);
	container.appendChild(urlBar.DOMRoot);

	this.menu = menu;
	this.bookmarks = [];
	this.DomNode.description = description;
	this.DomNode.bookmarks = bookmarks;
};

Session.prototype.createMenu = function createMenu() {
	var DomElem = this.DomElem;

	// Session menu
	var menu = DomElem('div', {class: 'menu'});
	var save = DomElem('div', {class: 'button save'});
	var add = DomElem('div', {class: 'button add'});
	var restore = DomElem('div', {class: 'button restore'});
	var restoreW = DomElem('div', {class: 'button restore new-w'});

	Tooltip(add, L10N.get('add-tab'));
	Tooltip(restore, L10N.get('restore-session'));
	Tooltip(restoreW, L10N.get('restore-new-window'));

	save.textContent = L10N.get('save-session');

	menu.appendChild(save);
	menu.appendChild(restore);
	menu.appendChild(restoreW);
	menu.appendChild(add);

	var saveSession = this.saveSession.bind(this);

	// Events
	restore.addEventListener('click', function() {
		SessionManager.restoreSession(this.session.id);
	}.bind(this));

	restoreW.addEventListener('click', function() {
		SessionManager.restoreNewWindow(this.session.id);
	}.bind(this));

	save.addEventListener('click', saveSession);
	add.addEventListener('click', this.addCurrentTab.bind(this));

	EventDestroyer.add(save, 'click', saveSession);

	this.DomNode.restore = restore;
	this.DomNode.saveMenu = save;

	return menu;
};

Session.prototype.toggleNode = function toggleNode(node, state) {
	node.style.display = state;
};

Session.prototype.setDate = function setDate(container, date) {
	var d = new Date(date);
	container.textContent = d.getDay() + ' ' + monthNames[d.getMonth()] + ' ' + d.getFullYear();
};

Session.prototype.setState = function setState(state) {
	WindowEvents.emit(this.document, 'ChangeUIState', {'session': state});
	this.state = state;
};

Session.prototype.setDefaultState = function setDefaultState(state) {
	this.session.id ? this.setState('restore') : this.setState('current');
};

Session.prototype.addCurrentTab = function addCurrentTab() {
	GlobalEvents.emit('lock-observer');

	this.SyncUI.setPromiseSession(this.session.id);
	Bookmarks.addBookmark(this.session.id, tabs.activeTab.title, tabs.activeTab.url);

	GlobalEvents.emit('unlock-observer');
	GlobalEvents.emit('update-sessions');
};


Session.prototype.saveSession = function saveSession() {
	GlobalEvents.emit('lock-observer');

	var folderID = SessionManager.saveCurrentSession(AppConfig.get('StorageFolderID'));
	this.SyncUI.setPromiseSession(folderID);
	this.setDefaultState();

	GlobalEvents.emit('unlock-observer');
	GlobalEvents.emit('update-sessions');
};

Session.prototype.clearList = function clearList() {
	this.bookmarks.forEach(function (bookmark) {
		bookmark.destroy();
	});
	this.bookmarks = [];
};

Session.prototype.showCurrentSession = function showCurrentSession() {
	var date = new Date();
	var session = {
		id : 0,
		title : date.toDateString(),
		description : '',
		date : date,
		modified : date
	};
	this.session = session;
	this.DomNode.description.textContent = '';

	this.clearList();

	// this.DomNode.bookmarks.textContent = '';

	var ctabs = browserWindows.activeWindow.tabs;

	for (var i in ctabs) {
		var bookmark = new SessionTab(this.document, ctabs[i]);
		this.DomNode.bookmarks.appendChild(bookmark.domRoot);
		this.bookmarks.push(bookmark);
	}
	this.setDefaultState();
	this.SyncUI.setActiveSessionNode();
};

Session.prototype.previewSession = function previewSession(session) {
	var options = {
		folder: session.id,
		types : ['uri'],
		properties : {title : 'title', uri : 'url', itemId : 'id'}
	};

	this.clearList();

	Bookmarks.getFolderBookmarks(options).then( function (tabs) {
		for (var i in tabs) {
			var bookmark = new SessionBookmark(this.document, tabs[i]);
			this.DomNode.bookmarks.appendChild(bookmark.domRoot);
			this.bookmarks.push(bookmark);
		}
	}.bind(this));

	session.description = Bookmarks.getItemDescription(session.id);
	this.session = session;
	this.DomNode.description.textContent = session.description ? session.description : session.title;
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

	this.clearList();

	EventDestroyer.execute(this.DomNode.savePanel);
	EventDestroyer.execute(this.DomNode.cancel);
	EventDestroyer.execute(this.DomNode.restore);
	EventDestroyer.execute(this.DomNode.saveMenu);

	this.SyncUI = null;
	this.menu = null;
	this.DomNode = null;
	this.DomElem = null;
};

// Public API
exports.Session = Session;