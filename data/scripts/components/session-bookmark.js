'use strict';

// *****************************************************************************
// Custom Modules

import { HTMLCreator } from '../utils/dom';
import { AutoScroll } from '../utils/auto-scroll';
import { BookmarkManager } from '../session/bookmarks';

// *****************************************************************************
// API

const bookmarkOffset = 2.2; // height + 2 in em

function setTabFavicon(faviconNode, faviconURL) {
	faviconNode.style.background = 'url("' + faviconURL + '")';
	faviconNode.style.backgroundRepeat = 'no-repeat';
	faviconNode.style.backgroundPosition = 'center center';
	faviconNode.style.backgroundSize = 'contain';
}

/*
* Session Bookmark
* Used for interacting with a Firefox bookmark item
*/

export class SessionBookmark {
	constructor(bookmark) {
		const DomElem = HTMLCreator();

		const box = DomElem('div', { class: 'bookmark' });
		box.setAttribute('pinned', bookmark.pinned);

		const favicon = DomElem('div', { class: 'favicon' });
		favicon.setAttribute('bookmarkID', bookmark.id);
		favicon.setAttribute('over', '');

		const title = DomElem('div', { class: 'text' });
		title.setAttribute('bookmarkID', bookmark.id);
		title.setAttribute('over', '');
		title.textContent = bookmark.title;

		box.appendChild(favicon);
		box.appendChild(title);

		BookmarkManager.getFaviconUrl(bookmark.url, (url) => {
			setTabFavicon(favicon, url);
		});

		this.bookmark = bookmark;
		this.DOMtitle = title;
		this.DOMfavicon = favicon;
		this.bookmarkID = bookmark.id;
		this.DOMRoot = box;
	}

	setTitle(title) {
		this.DOMtitle.textContent = title;
	}

	restorePosition() {
		this.DOMRoot.style.left = '0px';
		this.DOMRoot.style.top = this.position * bookmarkOffset + 'em';
	}

	setVirtualPosition(position) {
		this.position = position;
		this.DOMRoot.style.top = position * bookmarkOffset + 'em';
	}

	remove() {
		const box = this.DOMRoot;
		if (box.parentElement) {
			box.parentElement.removeChild(box);
		}
	}

	highlight() {
		this.DOMRoot.setAttribute('highlight', 'true');
		setTimeout(() => {
			this.DOMRoot.removeAttribute('highlight');
		}, 2000);

		const offsetStep = this.DOMRoot.clientHeight;
		const parentNode = this.DOMRoot.parentElement;
		const offset = this.DOMRoot.offsetTop - parentNode.clientHeight / 2 + offsetStep;
		AutoScroll.scrollTo(parentNode, offset, 0.25);
	}
}

/*
* SessionWindow
* Used as separator for different windows
*/
export class SessionWindow {
	constructor(windowID, windowIndex, index) {
		const DomElem = HTMLCreator();

		const box = DomElem('div', { class: 'window-separator' });
		box.style.top = index * bookmarkOffset + 'em';

		const text = DomElem('div', { class: 'text' });
		text.textContent = 'Window ' + (windowIndex + 1);
		text.setAttribute('windowID', windowID);

		box.appendChild(text);

		this.DOMRoot = box;
	}
}

/*
* SessionTab
* Used for displaying tabs from the current window
*/
export class SessionTab {
	constructor(tab, indexOffset) {
		const DomElem = HTMLCreator();

		const box = DomElem('div', { class: 'bookmark' });
		box.style.top = (tab.index + indexOffset) * bookmarkOffset + 'em';
		box.setAttribute('pinned', tab.pinned);
		box.setAttribute('url', tab.url);

		const favicon = DomElem('div', { class: 'favicon' });
		favicon.setAttribute('tabID', tab.id);
		favicon.setAttribute('windowID', tab.windowId);
		favicon.setAttribute('url', tab.url);
		favicon.setAttribute('over', '');

		const text = DomElem('div', { class: 'text' });
		text.setAttribute('tabID', tab.id);
		text.setAttribute('windowID', tab.windowId);
		text.setAttribute('url', tab.url);
		text.setAttribute('over', '');

		if (tab.favIconUrl) {
			setTabFavicon(favicon, tab.favIconUrl);
		}

		text.textContent = tab.title;
		box.appendChild(favicon);
		box.appendChild(text);

		this.tab = tab;
		this.position = tab.index + indexOffset;
		this.DOMRoot = box;
	}

	restorePosition() {
		this.DOMRoot.style.left = '0px';
		this.DOMRoot.style.top = this.position * bookmarkOffset + 'em';
	}
}

/*
* HistoryWindow
* Used as separator for different windows
*/
export class HistoryWindow {
	constructor(sessionWindowInfo, windowID, index) {
		const DomElem = HTMLCreator();

		const box = DomElem('div', { class: 'history-window-separator' });
		box.style.top = index * bookmarkOffset + 'em';
		box.setAttribute('windowID', windowID);

		const text = DomElem('div', { class: 'text' });
		text.setAttribute('windowID', windowID);
		text.textContent = 'Window ' + windowID;

		if (!sessionWindowInfo.active) {
			text.textContent += ' (closed)';
		}

		box.appendChild(text);

		this.DOMRoot = box;
	}
}

/*
* HistoryTab
* Used for displaying tabs from the history windows
*/
export class HistoryTab {
	constructor(tab, indexOffset) {
		const DomElem = HTMLCreator();

		const box = DomElem('div', { class: 'bookmark' });
		box.style.top = (tab.index + indexOffset) * bookmarkOffset + 'em';
		box.setAttribute('url', tab.url);
		box.setAttribute('pinned', tab.pinned);

		const favicon = DomElem('div', { class: 'favicon' });
		favicon.setAttribute('url', tab.url);
		favicon.setAttribute('over', '');

		const text = DomElem('div', { class: 'text' });
		text.setAttribute('url', tab.url);
		text.setAttribute('over', '');
		text.textContent = tab.title;

		if (tab.favIconUrl) {
			setTabFavicon(favicon, tab.favIconUrl);
		}

		box.appendChild(favicon);
		box.appendChild(text);

		this.DOMRoot = box;
	}
}
