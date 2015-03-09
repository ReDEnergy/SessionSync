'use strict';

// *****************************************************************************
// SDK Modules
const { getFavicon } = require("sdk/places/favicon");
const tabs = require("sdk/tabs");
const clipboard = require("sdk/clipboard");

// *****************************************************************************
// Custom Modules

const { HTMLCreator } = require('./utils/dom');
const { Bookmarks } = require('./utils/bookmarks');
const { EventDestroyer } = require('./utils/event-destroyer');
const { WindowEvents, GlobalEvents } = require('./utils/global-events');
const { DragNDrop } = require('./utils/drag-n-drop');

// *****************************************************************************
// API

// TODO - really :D try to use event delegation - to many dynamic events

function SessionBookmark(document, bookmark) {
	var DomElem = HTMLCreator(document);

	var box = DomElem('div', {class : 'bookmark', 'draggable' : 'true'});
	var favicon = DomElem('div', {class : 'favicon'});
	var title = DomElem('div', {class : 'text'});

	getFavicon(bookmark.url).then(function(url) {
		favicon.style.background = 'url("' + url + '")';
		favicon.style.backgroundSize = '16px';
	}, function (err) {
		// favicon not found
	});

	var openInNewTab = function openInNewTab() {
		tabs.open(bookmark.url);
	};

	var onMouseDown = function onMouseDown(e) {
		this.lastEvent = e;
		// Middle Click
		if (e.button == 1) {
			this.openInCurrentTab();
		}
		// Right Click
		if (e.button == 2) {
			e.stopPropagation();			WindowEvents.emit(document, 'BookmarkContextMenu-Open', e);
			WindowEvents.emit(document, 'BookmarkContextMenu-Context', this);
		}
	}.bind(this);

	var showURL = function showURL() {
		WindowEvents.emit(document, 'showUrlBar', bookmark);
	};

	var hideURL = function hideURL() {
		WindowEvents.emit(document, 'hideUrlBar', bookmark);
	};

	box.addEventListener('click', openInNewTab);
	box.addEventListener('mousedown', onMouseDown);
	box.addEventListener('mouseover', showURL);
	box.addEventListener('mouseleave', hideURL);

	// Drag and drop
	var dragEnd = function dragEnd(info) {
		info.id = bookmark.id;
		WindowEvents.emit(document, 'MoveBookmark', info);
	};
	DragNDrop.setDraggable(box, dragEnd);

	// Remove Dynamic events
	EventDestroyer.add(box, 'click', openInNewTab);
	EventDestroyer.add(box, 'mousedown', onMouseDown);
	EventDestroyer.add(box, 'mouseenter', showURL);
	EventDestroyer.add(box, 'mouseleave', hideURL);

	// Properties
	title.textContent = bookmark.title;
	box.appendChild(favicon);
	box.appendChild(title);

	this.title = title;
	this.document = document;
	this.bookmark = bookmark;
	this.domRoot = box;
}

SessionBookmark.prototype.setTitle = function setTitle(title) {
	Bookmarks.setItemTitle(this.bookmark.id, title);
	this.title.textContent = title;
	this.bookmark.title = title;
};

SessionBookmark.prototype.setLocation = function setLocation(url) {
	try {
		Bookmarks.setItemLocation(this.bookmark.id, url);
		this.bookmark.url = url;
	} catch(err) {
		console.log(err);
	}
};

SessionBookmark.prototype.openInCurrentTab = function openInCurrentTab() {
	tabs.activeTab.url = this.bookmark.url;
};

SessionBookmark.prototype.openInNewTab = function openInNewTab() {
	tabs.open(this.bookmark.url);
};

SessionBookmark.prototype.openInNewWindow = function openInNewWindow() {
	tabs.open({
		url: this.bookmark.url,
		inNewWindow: true
	});
};

SessionBookmark.prototype.copyURLToClipboard = function copyURLToClipboard() {
	clipboard.set(this.bookmark.url);
};

SessionBookmark.prototype.edit = function edit() {
	WindowEvents.emit(this.document, 'BookmarkEditWidget-Invoke', {
		context : this,
		fields : {
			title : this.bookmark.title,
			url : this.bookmark.url
		}
	});
};

SessionBookmark.prototype.removeAction = function removeAction(event) {
	WindowEvents.emit(this.document, 'ConfirmBox-Open', event);
	WindowEvents.emit(this.document, 'ConfirmBox-Callback', function() {
		GlobalEvents.emit('lock-observer');
		GlobalEvents.emit('BookmarkRemoved');

		Bookmarks.removeItem(this.bookmark.id);

		GlobalEvents.emit('unlock-observer');
		GlobalEvents.emit('update-sessions');
	}.bind(this));
};

SessionBookmark.prototype.destroy = function destroy() {
	var box = this.domRoot;
	if (box.parentElement)
		box.parentElement.removeChild(box);
	EventDestroyer.execute(box);
};

function SessionTab(document, bookmark) {
	var DomElem = HTMLCreator(document);

	var box = DomElem('div', {class : 'bookmark'});
	var favicon = DomElem('div', {class : 'favicon'});
	var text = DomElem('div', {class : 'text'});

	getFavicon(bookmark.url).then(function(url) {
		favicon.style.background = 'url("' + url + '")';
		favicon.style.backgroundSize = '16px';
	}, function (err) {
		// favicon not found
	});

	var switchToTab = function switchToTab() {
		bookmark.activate();
	};

	var showURL = function showURL() {
		WindowEvents.emit(document, 'showUrlBar', bookmark);
	};

	box.addEventListener('click', switchToTab);
	box.addEventListener('mouseover', showURL);

	EventDestroyer.add(box, 'click', switchToTab);
	EventDestroyer.add(box, 'mouseover', showURL);

	text.textContent = bookmark.title;
	box.appendChild(favicon);
	box.appendChild(text);

	this.bookmark = bookmark;
	this.domRoot = box;
}

SessionTab.prototype.destroy = function destroy() {
	var box = this.domRoot;
	box.parentElement.removeChild(box);
	EventDestroyer.execute(box);
};


// *****************************************************************************
// Public API
exports.SessionBookmark = SessionBookmark;
exports.SessionTab = SessionTab;