'use strict';

// *****************************************************************************
// Custom Modules

import { HTMLCreator } from '../utils/dom';
import { AutoScroll } from '../utils/auto-scroll';
import { BookmarkManager } from '../session/bookmarks';
import { BookmarkProperties } from '../../common/bookmark-properties';
import { FirefoxContainers } from '../../common/services/firefox-containers';
import { BrowserTabGroups } from '../../common/services/tab-groups';

// *****************************************************************************
// API

const bookmarkOffset = 2.2; // height + 2 in em

function setTabFavicon(faviconNode, faviconURL) {
	faviconNode.style.background = 'url("' + faviconURL + '")';
	faviconNode.style.backgroundRepeat = 'no-repeat';
	faviconNode.style.backgroundPosition = 'center center';
	faviconNode.style.backgroundSize = 'contain';
}

function configureHoverItem(item, url) {
	item.setAttribute('over', '');
	item.setAttribute('url', url);
}

/*
 * Session Bookmark
 * Used for interacting with a Firefox bookmark item
 */

export class SessionBookmark {
	constructor(bookmark) {
		const DomElem = HTMLCreator();

		// Decode bookmark title
		var info = BookmarkProperties.parseTitle(bookmark.title);

		const box = DomElem('div', { class: 'bookmark' });

		const favicon = DomElem('div', { class: 'favicon' });
		favicon.setAttribute('bookmarkID', bookmark.id);
		favicon.setAttribute('over', '');

		const title = DomElem('div', { class: 'title' });
		title.setAttribute('bookmarkID', bookmark.id);
		title.setAttribute('over', '');
		title.textContent = info.title;

		const propertiesBox = DomElem('div', { class: 'properties' });
		propertiesBox.setAttribute('over', '');

		if (bookmark.pinned || info.properties.pinned) {
			const pin = DomElem('div', { class: 'pin' });
			propertiesBox.appendChild(pin);
		}

		if (info.properties.group) {
			const groupTag = BrowserTabGroups.getGroupElement(info.properties.group.title, info.properties.group.color);
			if (groupTag) {
				propertiesBox.appendChild(groupTag);
			}
		}

		if (info.properties.container) {
			const container = FirefoxContainers.getContainerElement(info.properties.container);
			if (container) {
				propertiesBox.appendChild(container);
			}
		}

		box.appendChild(favicon);
		box.appendChild(title);
		box.appendChild(propertiesBox);

		BookmarkManager.getFaviconUrl(bookmark.url, (url) => {
			setTabFavicon(favicon, url);
		});

		this.bookmark = bookmark;
		this.properties = info.properties;
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

		const title = DomElem('div', { class: 'title' });
		title.textContent = 'Window ' + (windowIndex + 1);
		title.setAttribute('windowID', windowID);

		box.appendChild(title);

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
		box.setAttribute('url', tab.url);

		const favicon = DomElem('div', { class: 'favicon' });
		favicon.setAttribute('tabID', tab.id);
		favicon.setAttribute('windowID', tab.windowId);
		configureHoverItem(favicon, tab.url);

		const title = DomElem('div', { class: 'title' });
		title.setAttribute('tabID', tab.id);
		title.setAttribute('windowID', tab.windowId);
		title.textContent = tab.title;
		configureHoverItem(title, tab.url);

		if (tab.favIconUrl) {
			setTabFavicon(favicon, tab.favIconUrl);
		}

		const propertiesBox = DomElem('div', { class: 'properties' });

		if (tab.pinned) {
			const pin = DomElem('div', { class: 'pin' });
			propertiesBox.appendChild(pin);
		}

		if (tab.cookieStoreId) {
			const container = FirefoxContainers.getContainerElement(tab.cookieStoreId);
			if (container) {
				propertiesBox.appendChild(container);
			}
		}

		if (tab.groupId !== undefined && tab.groupId > -1) {
			const group = BrowserTabGroups.getGroup(tab.groupId);
			const groupTag = BrowserTabGroups.getGroupElement(group?.title, group?.color);
			if (groupTag) {
				propertiesBox.appendChild(groupTag);
			}
		}

		box.appendChild(favicon);
		box.appendChild(title);
		box.appendChild(propertiesBox);

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

		const title = DomElem('div', { class: 'title' });
		title.setAttribute('windowID', windowID);
		title.textContent = 'Window ' + windowID;

		if (!sessionWindowInfo.active) {
			title.textContent += ' (closed)';
		}

		box.appendChild(title);

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

		const favicon = DomElem('div', { class: 'favicon' });
		configureHoverItem(favicon, tab.url);

		const title = DomElem('div', { class: 'title' });
		configureHoverItem(title, tab.url);
		title.textContent = tab.title;
		title.setAttribute('windowID', tab.windowId);
		title.setAttribute('tabID', tab.id);

		BookmarkManager.getFaviconUrl(tab.url, (url) => {
			setTabFavicon(favicon, url);
		});

		const propertiesBox = DomElem('div', { class: 'properties' });
		propertiesBox.setAttribute('over', '');

		if (tab.cookieStoreId) {
			const container = FirefoxContainers.getContainerElement(tab.cookieStoreId);
			if (container) {
				propertiesBox.appendChild(container);
			}
		}

		if (tab.groupId > -1) {
			const groupTag = BrowserTabGroups.getGroupElement(tab.groupTitle, tab.groupColor);
			if (groupTag) {
				propertiesBox.appendChild(groupTag);
			}
		}

		if (tab.pinned) {
			const pin = DomElem('div', { class: 'pin' });
			propertiesBox.appendChild(pin);
		}

		box.appendChild(favicon);
		box.appendChild(title);
		box.appendChild(propertiesBox);

		this.DOMRoot = box;
	}
}
