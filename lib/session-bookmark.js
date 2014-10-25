'use strict';

// *****************************************************************************
// SDK Modules
const { getFavicon } = require("sdk/places/favicon");
const { emit } = require("sdk/event/core");
const tabs = require("sdk/tabs");

// *****************************************************************************
// Custom Modules

const { HTMLCreator } = require('./utils/dom');
const { Bookmarks } = require('./utils/bookmarks');
const { EventDestroyer } = require('./utils/event-destroyer');

// *****************************************************************************
// API

function SessionBookmark(SessionContainer, bookmark) {
	var document = SessionContainer.SyncUI.document;
	var DomElem = HTMLCreator(document);

	var box = DomElem('div', {class : 'bookmark'});
	var favicon = DomElem('div', {class : 'favicon'});
	var title = DomElem('div', {class : 'text'});

/*	getFavicon(bookmark.url).then(function(url) {
		favicon.style.background = 'url("' + url + '")';
	});
*/
	var openInNewTab = function openInNewTab() {
		tabs.open(bookmark.url);
	};

	var openContextMenu = function openContextMenu(e) {
		if (e.button == 2) {
			e.stopPropagation();
			SessionContainer.SyncUI.ContextMenu.show(this, e);
		}
	}.bind(this);

	var showURL = function showURL() {
		emit(SessionContainer, 'bookmark-url', bookmark);
	};

	var hideURL = function hideURL() {
		emit(SessionContainer, 'bookmark-url-hide');
	};

	box.addEventListener('click', openInNewTab);
	box.addEventListener('mousedown', openContextMenu);
	box.addEventListener('mouseover', showURL);
	box.addEventListener('mouseleave', hideURL);

	EventDestroyer.add(box, 'click', openInNewTab);
	EventDestroyer.add(box, 'mousedown', openContextMenu);
	EventDestroyer.add(box, 'mouseover', showURL);
	EventDestroyer.add(box, 'mouseleave', hideURL);

	// box.addEventListener('mouseover', function() {
		// SessionContainer.showUrlBar(bookmark);
	// });

	title.textContent = bookmark.title;
	box.appendChild(favicon);
	box.appendChild(title);

	this.title = title;
	this.bookmark = bookmark;
	this.domRoot = box;
}

SessionBookmark.prototype.delete = function deleteBookmark() {
	Bookmarks.removeItem(this.bookmark.id);
	this.domRoot.parentElement.removeChild(this.domRoot);
};

SessionBookmark.prototype.setTitle = function setTitle(title) {
	Bookmarks.setItemTitle(this.bookmark.id, title);
	this.title.textContent = title;
};

SessionBookmark.prototype.setLocation = function setLocation(url) {
	try {
		Bookmarks.setItemLocation(this.bookmark.id, url);
		this.bookmark.url = url;
	} catch(err) {
		console.log(err);
	}

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

SessionBookmark.prototype.destroy = function destroy() {
	var box = this.domRoot;
	box.parentElement.removeChild(box);
	EventDestroyer.execute(box);
};

function SessionTab(SessionContainer, bookmark) {
	var document = SessionContainer.SyncUI.document;
	var DomElem = HTMLCreator(document);

	var box = DomElem('div', {class : 'bookmark simple'});
	var favicon = DomElem('div', {class : 'favicon'});
	var text = DomElem('div', {class : 'text'});

/*	getFavicon(bookmark.url).then(function(url) {
		favicon.style.background = 'url("' + url + '")';
	});
*/

	var showURL = function showURL() {
		emit(SessionContainer, 'bookmark-url', bookmark);
	};

	box.addEventListener('mouseover', showURL);
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