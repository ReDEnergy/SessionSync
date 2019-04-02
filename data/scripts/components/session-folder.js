define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	// Utils
	const { HTMLCreator } = require('../utils/dom');

	// *****************************************************************************
	// API

	/*
	* Session Bookmark
	* Used for interacting with a Firefox bookmark item
	*/
	function SessionFolder(bookmark)
	{
		var DomElem = HTMLCreator();
		var folder = DomElem('div', {class: 'folder', type: bookmark.type});
		folder.setAttribute('sessionID', bookmark.id);

		this.DOMRoot = folder;
		this.updateFrom(bookmark);

		// ------------------------------------------------------------------------
		// Public data

		this.visible = true;
		this.bookmarkID = bookmark.id;
	}

	SessionFolder.prototype.folderOffset = 2.7; // em;

	SessionFolder.prototype.updateFrom = function updateFrom(bookmark)
	{
		this.bookmark = bookmark;
		this.bookmark.title_lowercase = this.bookmark.title.toLowerCase();
		this.setTitle(bookmark.title);
	};

	SessionFolder.prototype.isVisible = function isVisible()
	{
		return this.visible;
	};

	SessionFolder.prototype.setVisible = function setVisible()
	{
		this.visible = true;
		this.DOMRoot.removeAttribute('filter');
	};

	SessionFolder.prototype.match = function match(expression)
	{
		var name = this.bookmark.title_lowercase;
		if (name.indexOf(expression) != -1) {
			this.visible = true;
			this.DOMRoot.removeAttribute('filter');
			return true;
		}

		this.visible = false;
		this.DOMRoot.setAttribute('filter', '');
		return false;
	};

	SessionFolder.prototype.restorePosition = function restorePosition()
	{
		this.DOMRoot.style.left = '0px';
		this.DOMRoot.style.top = this.position * this.folderOffset + 'em';
	};

	SessionFolder.prototype.setVirtualPosition = function setVirtualPosition(position)
	{
		if (this.position == position)
			return;

		this.position = position;
		this.DOMRoot.style.top = (position * this.folderOffset).toFixed(2) + 'em';
	};

	SessionFolder.prototype.setTitle = function setTitle(title)
	{
		this.DOMRoot.textContent = title;
	};

	SessionFolder.prototype.remove = function remove()
	{
		var box = this.DOMRoot;
		if (box.parentElement)
			box.parentElement.removeChild(box);
	};

	var SortMethods = {

		'name-asc' : function sortByNameAscending(a, b) {
			return a.bookmark.title_lowercase > b.bookmark.title_lowercase;
		},

		'name-desc' : function sortByNameDescending(a, b) {
			return a.bookmark.title_lowercase < b.bookmark.title_lowercase;
		},

		'position-asc' : function sortByPositionAscending(a, b) {
			return a.bookmark.index > b.bookmark.index;
		},

		'position-desc' : function sortByPositionDescending(a, b) {
			return a.bookmark.index < b.bookmark.index;
		},

		'date-asc' : function sortByDateAscending(a, b) {
			return a.bookmark.dateAdded > b.bookmark.dateAdded;
		},

		'date-desc' : function sortByDateDescending(a, b) {
			return a.bookmark.dateAdded < b.bookmark.dateAdded;
		}
	};


	/*
	* SessionHistoryFolder
	* Used as separator for different windows
	*/

	function SessionHistoryFolder(sessionInfo, index)
	{
		var DomElem = HTMLCreator();
		var folder = DomElem('div', { class: 'history-node' });

		folder.textContent = new Date(sessionInfo.lastSave).toLocaleString();
		folder.setAttribute('index', index);

		// Public data

		this.DOMRoot = folder;
		this.sessionInfo = sessionInfo;
	}

	SessionHistoryFolder.prototype.setTitle = function setTitle(title)
	{
		this.DOMRoot.textContent = title;
	};

	// *****************************************************************************
	// Public API
	exports.SessionFolder = SessionFolder;
	exports.SessionFolderSortBy = SortMethods;
	exports.SessionHistoryFolder = SessionHistoryFolder;

});