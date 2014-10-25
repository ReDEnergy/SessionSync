'use strict';

// *****************************************************************************
// SDK Modules
const windowUtils = require('sdk/window/utils');
const { getFavicon } = require("sdk/places/favicon");
const { data } = require('sdk/self');
const { setTimeout, clearTimeout } = require("sdk/timers");
const tabs = require("sdk/tabs");

// *****************************************************************************
// 3rd Party Modules
require('3rd/userstyles').load(data.url('overlay.css'));

// *****************************************************************************
// Custom Modules

const { HTMLCreator } = require('./utils/dom');
const { XULPanel } = require('./utils/xul-panel');
const { Bookmarks } = require('./utils/bookmarks');
const { Session } = require('session-container');
const { EventDestroyer } = require('./utils/event-destroyer');

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
		id: 'sessions-sync',
		blur: true,
		append: 'addon-bar',
		content: content
	});
	this.panel = panel;
	this.UINode = {content: content};
	this.DomElem = DomElem;
	this.document = document;
	this.init();
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

	// Active Sesssion
	this.activeSessionNode = currentTabs;

	// Saved Sesssions
	category = DomElem('div', {class: 'category'});
	title = DomElem('div', {class: 'title'});
	title.textContent = 'Saved Session';
	category.appendChild(title);
	sessions.appendChild(category);

	// Session list
	var list = DomElem('div', {class: 'list'});
	sessions.appendChild(list);


	// Events
	list.addEventListener('click', sessionClick);
	currentTabs.addEventListener('click', showCurrentTabs);

	EventDestroyer.add(list, 'click', sessionClick);
	EventDestroyer.add(currentTabs, 'click', showCurrentTabs);

	// Context Menu
	this.ContextMenu = new BookmarkContextMenu(this);;
	this.bookmarkEditPanel = new BookmarkEditPanel(this);

	sessions.appendChild(this.bookmarkEditPanel.RootNode);
	this.UINode.content.appendChild(this.ContextMenu.RootNode);
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
	var folder = DomElem('div', {class: 'folder'});
	folder.textContent = ss.title;
	folder.setAttribute('sessionID', index);

	if (ss.id === this.promiseID) {
		this.setActiveSessionNode(folder);
		this.SessionInfo.previewSession(this.sessions[index]);
		this.promiseFound = true;
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

SessionSyncUI.prototype.setSessions = function setSessions(sessions) {
	this.promiseFound = false;
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
	if (!this.promiseFound) {
		this.promiseFound = true;
		this.SessionInfo.showCurrentSession();
	}
};

// *****************************************************************************
// General Methods

SessionSyncUI.prototype.setStorageFolderID = function setStorageFolderID(storageFolderID) {
	this.storageFolderID = storageFolderID;
};

SessionSyncUI.prototype.toggle = function togglePanel(pinned) {
	if (pinned) {
		var btn = this.document.getElementById('action-button--sessionsyncgabrielivanicacom-syncbtn');
		var rect = btn.getBoundingClientRect();
		// console.log("Pinned Mode", rect.top, rect.right, rect.bottom, rect.left);
		if (rect.left < 300)
			this.panel.pin(rect.bottom, rect.right, 'left');
		else
			this.panel.pin(rect.bottom, rect.left, 'right');
	}
	else
		this.panel.center();

	if (this.panel.toggle()) {
		this.focusFilterBox();
	} else {
		this.ContextMenu.hide();
		this.blurFilterBox();
	}
};

SessionSyncUI.prototype.destroy = function destroy() {
	this.panel.destroy();
	this.SessionInfo.destroy();
	this.ContextMenu.destroy();
	this.bookmarkEditPanel.destroy();

	EventDestroyer.execute(this.UINode.sessionsList);
	EventDestroyer.execute(this.UINode.currentSession);
	EventDestroyer.execute(this.searchBox);

	this.panel = null;
	this.document = null;
	this.UINode = null;
	this.DomElem = null;
	this.SessionInfo = null;
	this.ContextMenu = null;
	this.bookmarkEditPanel = null;
	this.UINode = null;
};


/**
 * Bookmark Context Menu
 **/

function BookmarkContextMenu(SyncUI) {
	var DomElem = SyncUI.DomElem;

	var menu = DomElem('div', {class : 'context-menu'});
	var openw = DomElem('div', {class : 'button'});
	var edit = DomElem('div', {class : 'button'});
	var remove = DomElem('div', {class : 'button'});

	openw.textContent = 'Open in a New Window';
	edit.textContent = 'Edit';
	remove.textContent = 'Remove';
	menu.appendChild(openw);
	menu.appendChild(edit);
	menu.appendChild(remove);

	var openInNewWindow = function openInNewWindow() {
		this.Bookmark.openInNewWindow();
		this.hide();
	}.bind(this);

	var editBookmark = function editBookmark() {
		SyncUI.bookmarkEditPanel.open(this.Bookmark);
		this.hide();
	}.bind(this);

	var deleteBookmark = function deleteBookmark() {
		this.Bookmark.delete();
		this.hide();
	}.bind(this);

	this.blur = function(e) {
		var target = e.target;
		while (target) {
			if (target === menu)
				return;
			target = target.parentElement;
		}
		this.hide();
	}.bind(this);

	// Events
	openw.addEventListener('click', openInNewWindow);
	edit.addEventListener('click', editBookmark);
	remove.addEventListener('click', deleteBookmark);

	EventDestroyer.add(openw, 'click', openInNewWindow);
	EventDestroyer.add(edit, 'click', editBookmark);
	EventDestroyer.add(edit, 'click', deleteBookmark);

	this.RootNode = menu;
	this.DomNode = {};
	this.DomNode.openw = openw;
	this.DomNode.edit = edit;
	this.DomNode.remove = remove;
	this.SyncUI = SyncUI;
}

BookmarkContextMenu.prototype.show = function show(Bookmark, e) {
	this.RootNode.setAttribute('data-active', 'true');
	this.RootNode.style.left = e.pageX + 'px';
	this.RootNode.style.top = e.pageY + 'px';

	this.Bookmark = Bookmark;
	this.SyncUI.document.addEventListener('mousedown', this.blur);
};

BookmarkContextMenu.prototype.hide = function hide() {
	this.RootNode.removeAttribute('data-active');
	this.SyncUI.document.removeEventListener('mousedown', this.blur);
};

BookmarkContextMenu.prototype.destroy = function destroy() {
	EventDestroyer.execute(this.DomNode.openw);
	EventDestroyer.execute(this.DomNode.edit);
	EventDestroyer.execute(this.DomNode.remove);

	this.SyncUI.document.removeEventListener('mousedown', this.blur);
	this.RootNode.parentElement.removeChild(this.RootNode);
	this.SyncUI = null;
	this.Bookmark = null;
};


/**
 * Bookmark Edit Panel
 **/

function BookmarkEditPanel(SyncUI) {
	var DomElem = SyncUI.DomElem;
	var container = DomElem('div', {class : 'bookmark-edit'});

	function Group(children) {
		var group = DomElem('div', {class : 'group'});
		children.forEach(function (child) {
			group.appendChild(child);
		});
		return group;
	}

	function LabelGroup(value, children) {
		var group = DomElem('label', {class : 'group'});
		var message = DomElem('div');
		message.textContent = value;

		group.appendChild(message);
		children.forEach(function (child) {
			group.appendChild(child);
		});
		return group;
	}

	var save = DomElem('div', {class : 'button'});
	var close = DomElem('div', {class : 'button'});
	save.textContent = 'Save';
	close.textContent = 'Cancel';

	var inputTitle = DomElem('input', {type: 'text'});
	var inputURL = DomElem('input', {type: 'text'});
	var textDesc = DomElem('textarea');

	// Create UI
	container.appendChild(LabelGroup('Name', [inputTitle]));
	container.appendChild(LabelGroup('Location', [inputURL]));
	// container.appendChild(LabelGroup('Description', [textDesc]));
	container.appendChild(Group([close, save]));

	var saveSession = function saveSession() {
		this.Bookmark.setTitle(inputTitle.value);
		this.Bookmark.setLocation(inputURL.value);
		// this.Bookmark.setDescription(textDesc.value);
		this.hide();
	}.bind(this);

	var closePanel = function closePanel() {
		this.hide();
	}.bind(this);


	// Events
	save.addEventListener('click', saveSession);
	close.addEventListener('click', closePanel);

	EventDestroyer.add(save, 'click', saveSession);
	EventDestroyer.add(close, 'click', closePanel);

	this.SyncUI = SyncUI;
	this.RootNode = container;
	this.DomNode = {};
	this.DomNode.save = save;
	this.DomNode.close = close;
	this.inputTitle = inputTitle;
	this.inputURL = inputURL;
	this.textDesc = textDesc;
}

BookmarkEditPanel.prototype.open = function open(Bookmark) {
	var panel = this.SyncUI.UINode.content.parentElement;
	panel.setAttribute('edit-bookmark', '');
	this.inputTitle.value = Bookmark.bookmark.title;
	this.inputURL.value = Bookmark.bookmark.url;
	// this.textDesc.value = Bookmark.tab.description ? Bookmark.tab.description : '';
	this.Bookmark = Bookmark;
};

BookmarkEditPanel.prototype.hide = function hide() {
	var panel = this.SyncUI.UINode.content.parentElement;
	panel.removeAttribute('edit-bookmark');
};


BookmarkEditPanel.prototype.destroy = function destroy() {
	EventDestroyer.execute(this.DomNode.save);
	EventDestroyer.execute(this.DomNode.close);
	this.SyncUI = null;
};



// *****************************************************************************
// Public API
exports.SessionSyncUI = SessionSyncUI;