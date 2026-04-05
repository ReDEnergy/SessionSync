'use strict';

// *****************************************************************************
// Custom Modules

// Utils
import { HTMLCreator } from '../utils/dom';

// *****************************************************************************
// API

/*
* Session Folder
* Used for interacting with a Firefox bookmark item
*/
export class SessionFolder {
	static folderOffset = 2.7; // em;

	constructor(bookmark) {
		const DomElem = HTMLCreator();
		const folder = DomElem('div', { class: 'folder', type: bookmark.type });
		folder.setAttribute('sessionID', bookmark.id);

		this.DOMRoot = folder;
		this.visible = true;
		this.bookmarkID = bookmark.id;
		this.updateFrom(bookmark);
	}

	updateFrom(bookmark) {
		this.bookmark = bookmark;
		this.bookmark.title_lowercase = this.bookmark.title.toLowerCase();
		this.setTitle(bookmark.title);
	}

	isVisible() {
		return this.visible;
	}

	setVisible() {
		this.visible = true;
		this.DOMRoot.removeAttribute('filter');
	}

	match(expression) {
		const name = this.bookmark.title_lowercase;
		if (name.indexOf(expression) !== -1) {
			this.visible = true;
			this.DOMRoot.removeAttribute('filter');
			return true;
		}

		this.visible = false;
		this.DOMRoot.setAttribute('filter', '');
		return false;
	}

	restorePosition() {
		this.DOMRoot.style.left = '0px';
		this.DOMRoot.style.top = this.position * SessionFolder.folderOffset + 'em';
	}

	setVirtualPosition(position) {
		if (this.position === position) return;

		this.position = position;
		this.DOMRoot.style.top = (position * SessionFolder.folderOffset).toFixed(2) + 'em';
	}

	setTitle(title) {
		this.DOMRoot.textContent = title;
	}

	remove() {
		const box = this.DOMRoot;
		if (box.parentElement) {
			box.parentElement.removeChild(box);
		}
	}
}

export const SessionFolderSortBy = {
	'name-asc': (a, b) => a.bookmark.title_lowercase > b.bookmark.title_lowercase,
	'name-desc': (a, b) => a.bookmark.title_lowercase < b.bookmark.title_lowercase,
	'position-asc': (a, b) => a.bookmark.index > b.bookmark.index,
	'position-desc': (a, b) => a.bookmark.index < b.bookmark.index,
	'date-asc': (a, b) => a.bookmark.dateAdded > b.bookmark.dateAdded,
	'date-desc': (a, b) => a.bookmark.dateAdded < b.bookmark.dateAdded
};

/*
* SessionHistoryFolder
* Used as separator for different windows
*/
export class SessionHistoryFolder {
	constructor(sessionInfo, index) {
		const DomElem = HTMLCreator();
		const folder = DomElem('div', { class: 'history-node' });

		folder.textContent = new Date(sessionInfo.lastSave).toLocaleString();
		folder.setAttribute('index', index);

		this.DOMRoot = folder;
		this.sessionInfo = sessionInfo;
	}

	setTitle(title) {
		this.DOMRoot.textContent = title;
	}
}
