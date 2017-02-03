'use strict';

// *****************************************************************************
// SDK Modules

const timers = require("sdk/timers");

// *****************************************************************************
// Custom Modules

const { AppConfig } = require('./config');

const { HTMLCreator } = require('./utils/dom');
const { WindowEvents, GlobalEvents } = require('./utils/global-events');
const { EventDestroyer } = require('./utils/event-destroyer');

const { BookmarkManager } = require('./session/bookmarks');
const { SessionFolder, SessionFolderSortBy, SessionFolderEvents } = require('./session-folder');
const { SessionSyncModel } = require('./session-sync-model');

// *****************************************************************************
// API

/*
 * Session List
 * UI Module for interacting with all the session
 */

function SessionList(document)
{
	var DomElem = HTMLCreator(document); 
	var window = document.ownerGlobal;

	// ------------------------------------------------------------------------
	// Init UI

	// Session Area
	var root = DomElem('div', {class: 'sessions'});
	root.style.width = AppConfig.storage.style.sessionListWidth + 'px';
	root.style.fontSize = AppConfig.storage.style.sessionListScaleFactor + 'px';

	var resizeHandle = DomElem('div', {class: 'resize-handle'});
	root.appendChild(resizeHandle);

	// History list
	var historyList = this.createHistoryList(document);
	root.appendChild(historyList);

	// Session list
	var list = DomElem('div', {class: 'list'});
	root.appendChild(list);
	
	// ------------------------------------------------------------------------
	// Events
	
	GlobalEvents.on('cfg.style.sessionListWidth', function() {
		root.style.width = AppConfig.storage.style.sessionListWidth + 'px';
	});

	GlobalEvents.on('cfg.style.sessionListScaleFactor', function(value) {
		root.style.fontSize = value + 'px';
	});

	var startResize = function startResize(e)
	{
		var startPos = e.clientX;
		var initWidth = root.clientWidth;
		resizeHandle.setAttribute('resizing', 'true');
		
		function eventMove(e) {
			var deltaX = e.clientX - startPos;
			var newWidth = initWidth + deltaX;
			AppConfig.storage.style.sessionListWidth = newWidth;  
			GlobalEvents.emit('cfg.style.sessionListWidth');
		}
		
		function evenUp(e) {
			resizeHandle.removeAttribute('resizing');
			document.removeEventListener('mouseup', evenUp);
			document.removeEventListener('mousemove', eventMove);
		}
		
		document.addEventListener('mouseup', evenUp);
		document.addEventListener('mousemove', eventMove);
	};
	
	resizeHandle.addEventListener('mousedown', startResize);
	
	WindowEvents.on(document, 'ListSessions', this.setSessions.bind(this));
		
	WindowEvents.on(document, 'SetPromiseSession', function(sessionInfo) {
		WindowEvents.emit(document, 'ShowSyncList');
		this.promiseInfo = sessionInfo;
	}.bind(this));	
	
	WindowEvents.on(document, 'FilterSessions', this.filterSessions.bind(this));

	WindowEvents.on(document, 'ShowCurrentSession', function() {
		this.setSelectedNode();
	}.bind(this));

	WindowEvents.on(document, 'SortSessionsBy', function(method) {
		this.sortSessionsBy(method);
	}.bind(this));
	
	WindowEvents.on(document, 'SessionsPositionChanged', function(indices) {
		if (this.sortMethod == 'position-asc' && this.filterExpression.length == 0)
		{
			var len = indices.length;
			for (var i = 0; i < len; i++) {
				var node = this.SyncModel.getBookmark(indices[i]);
				node.setVirtualPosition(SessionSyncModel.bookmarks[node.bookmarkID].position);
			}		
		}
	}.bind(this));	
	
	// App Events
	WindowEvents.on(document, 'MoveSession', function(info) {
		GlobalEvents.emit('lock-observer');

		if (info.from > info.to) info.to--;
		BookmarkManager.moveItem(info.id, AppConfig.storage.storageFolderID, info.to);

		GlobalEvents.emit('unlock-observer');
		GlobalEvents.emit('update-sessions');
	}.bind(this));	
	
	WindowEvents.on(document, 'ShowSyncList', function() {
		WindowEvents.emit(document, 'SetUIState', {	list: 'sync' });
	});
	
	WindowEvents.on(document, 'ShowHistoryList', function() {
		WindowEvents.emit(document, 'SetUIState', { list: 'history' });
	});

	WindowEvents.on(document, 'SessionDescriptionChanged', function(sessionID) {
		this.sortSessionsBy(this.sortMethod);

		// auto-scroll to the selected node
		this.scrollToSelected(500);		

	}.bind(this));
			
	SessionFolderEvents(document, list, this);
	
	// ------------------------------------------------------------------------
	// Public data

	this.filterExpression = '';
	this.promiseInfo = { sessionID: -1 };
	this.sortMethod = 'position-asc';
	this.DOMList = list;
	this.DOMRoot = root;
	this.document = document;

	this.SyncModel = SessionSyncModel.getModel(document);
};

SessionList.prototype.createHistoryList = function createHistoryList(document)
{

	var DomElem = HTMLCreator(document); 

	// ------------------------------------------------------------------------
	// Create UI

	var historyList = DomElem('div', {class: 'history-list'});

	// ------------------------------------------------------------------------
	// Events
	
	function createHistoryList()
	{
		historyList.textContent = '';
		var autoSave = AppConfig.storage.autoSave;
		var historyIndex = 0;	
		autoSave.sessions.forEach(function(session) {
			if (session && session.tabCount)
			{
				var node = DomElem('div', {class: 'history-node'});
				node.textContent = new Date(session.lastSave).toLocaleString();
				node.setAttribute('index', historyIndex);
				historyList.appendChild(node);
			}
			historyIndex++;
		});		
	};
	
	GlobalEvents.on('UpdateHistoryList', function() {
		createHistoryList();
	});

	WindowEvents.on(document, 'ShowHistoryList', function() {
		createHistoryList();
	});

	historyList.addEventListener('mousedown', function(e) {

		if (e.button != 2)
			return;

		e.stopPropagation();

		var target = e.target;
		if (target.className == 'history-node') {
			WindowEvents.emit(document, 'HistorySessionCtxMenu-Open', {
				context: e.target,
				event: e
			});
		}
		else {
			WindowEvents.emit(document, 'HistoryListCtxMenu-Open', {event: e });
		}
	});

	historyList.addEventListener('click', function(e) {
		var target = e.target;
		if (target.className === 'history-node')
		{
			this.setSelectedNode(e.target);
			var index = target.getAttribute('index') | 0;
			WindowEvents.emit(document, 'ShowHistorySession', AppConfig.storage.autoSave.sessions[index]);
		}
	}.bind(this));	

	// ------------------------------------------------------------------------
	// Public data
	
	return historyList; 
};

SessionList.prototype.setSessions = function setSessions()
{
	this.sessions = [];
	this.DOMList.textContent = '';

	// Position for active filtering
	var position = 0;
	var selectedSession;
	
	SessionSyncModel.sessions.forEach(function(session) {

		SessionSyncModel.bookmarks[session.id] = session;

		// find if a cache instance is already created and update it
		var sessionFolder = this.SyncModel.getBookmark(session.id);
		if (sessionFolder instanceof SessionFolder) {
			sessionFolder.updateFrom(session);
		} else {
			sessionFolder = new SessionFolder(this.document, session);
			sessionFolder.setVirtualPosition(session.position);
			this.SyncModel.setBookmark(session.id, sessionFolder);
		}
		
		if (session.id === this.promiseInfo.sessionID)
		{
			selectedSession = sessionFolder;
		}

		// TODO maybe remove the if ?
		if (this.filterExpression.length) {
			if (sessionFolder.match(this.filter)) {
				sessionFolder.setVirtualPosition(position);
				position++;
			}
		}

		this.sessions.push(sessionFolder);
		this.DOMList.appendChild(sessionFolder.DOMRoot);
	}.bind(this));
	
	if (this.filterExpression.length) {
		this.filterSessions(this.filterExpression);
	}
	
	// By default bookmarks are sorted ascending by internal position
	this.sortSessionsBy(this.sortMethod);

	// Preview the selected session
	if (selectedSession)
	{
		this.setSelectedNode(selectedSession.DOMRoot);
		WindowEvents.emit(this.document, 'ViewSession', selectedSession.bookmarkID);
		if (this.promiseInfo.edit == true) {
			WindowEvents.emit(this.document, 'SessionContextMenu-EditSession', selectedSession.bookmarkID);
		}
	
		// auto-scroll to the selected node
		this.scrollToSelected(500);		

	} else {
		WindowEvents.emit(this.document, 'ShowCurrentSession');
	}
};

SessionList.prototype.scrollToSelected = function scrollToSelected(delay)
{
	if (delay) {
		timers.setTimeout(this.scrollToSelected.bind(this), delay);
		return;
	}
	
	if (this.selectedNode) {
		var offsetStep = AppConfig.storage.style.sessionListScaleFactor * 2.7;
		var offset = this.selectedNode.offsetTop - this.DOMList.clientHeight / 2 + offsetStep; 
		this.DOMList.scrollTop = offset;
	}		
};

SessionList.prototype.setSelectedNode = function setSelectedNode(node) 
{
	if (this.selectedNode)
		this.selectedNode.removeAttribute('active');
		
	this.selectedNode = node;
	
	if (node) {
		node.setAttribute('active', 'true');
	}
};

SessionList.prototype.filterSessions = function filterSessions(expression)
{
	this.filterExpression = expression;
	
	if (expression.length)
	{
		var exactMatch = false;
		var expLength = expression.length;
		var document = this.document;

		var position = 0;
		this.sessions.forEach(function(session) {
			if (session.match(expression)) {
				session.setVirtualPosition(position);
				position++;
				
				if (!exactMatch) {
					// test same length
					exactMatch = session.bookmark.title_lowercase.length == expLength;
				}	
			}
		});

		this.DOMList.parentNode.scrollTop = 0;
		WindowEvents.emit(document, 'FilterSessionsExactMatch', exactMatch);
	}
	else {
		this.sessions.forEach(function(session) {
			session.setVisible();
		});
		this.sortSessionsBy(this.sortMethod);
	}
};

SessionList.prototype.sortSessionsBy = function sortSessionsBy(method)
{
	this.sortMethod = method;
	this.sessions.sort(SessionFolderSortBy[method]);
	var position = 0;
	this.sessions.forEach(function(session) {
		if (session.isVisible()) {
			session.setVirtualPosition(position);
			position++;
		}
	});
};

// Public API
exports.SessionList = SessionList;