define(function(require, exports) {
	'use strict';

	// ************************************************************************
	// Modules

	const { AppConfig } = require('../config');

	const { HTMLCreator } = require('../utils/dom');
	const { WindowEvents, GlobalEvents } = require('../utils/global-events');
	const { AutoScroll } = require('../utils/auto-scroll');

	const { SessionFolder, SessionFolderSortBy, SessionFolderEvents } = require('./session-folder');
	const { SessionSyncModel } = require('./session-sync-model');
	const { SessionHistory } = require('./session-history');

	// ************************************************************************
	// API

	/*
	* Session List
	* UI Module for interacting with all the session
	*/

	function SessionList(document)
	{
		var DomElem = HTMLCreator(document);

		// ------------------------------------------------------------------------
		// Init UI

		// Session Area
		var root = DomElem('div', {class: 'sessions'});

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

		GlobalEvents.on('style.sessions.list.width', function(width) {
			root.style.width = width + 'px';
		});

		GlobalEvents.on('style.scale.sessions', function(value) {
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
				AppConfig.set('style.sessions.list.width', newWidth);
			}

			function evenUp() {
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
			this.promiseInfo = sessionInfo;
			WindowEvents.emit(document, 'ShowSyncList', { update: sessionInfo.update });
		}.bind(this));

		WindowEvents.on(document, 'FilterSessions', this.filterSessions.bind(this));
		WindowEvents.on(document, 'SortSessionsBy', this.sortSessionsBy.bind(this));

		WindowEvents.on(document, 'SessionsPositionChanged', function(indices) {
			if (AppConfig.get('session.sorting') == 'position-asc' && AppConfig.get('session.active.filter').length == 0)
			{
				var len = indices.length;
				for (var i = 0; i < len; i++) {
					var node = this.SyncModel.getBookmark(indices[i]);
					node.setVirtualPosition(SessionSyncModel.bookmarks[node.bookmarkID].index);
				}
			}
		}.bind(this));

		WindowEvents.on(document, 'ShowCurrentSession', function() {
			WindowEvents.emit(document, 'SetUIState', {	list: 'none' });
			AppConfig.set('session.selected', undefined);
			this.setSelectedNode(undefined);
		}.bind(this));

		WindowEvents.on(document, 'ShowSyncList', function(options) {
			// Select first visible session
			if (this.promiseInfo.sessionID == undefined)
			{
				for (var i=0; i < this.sessions.length; i++)
				{
					if (this.sessions[i].isVisible())
					{
						this.selectSession(this.sessions[i], true, false);
						break;
					}
				}
			}
			WindowEvents.emit(document, 'SetUIState', {	list: 'sync' });
			if (options.update == true) {
				GlobalEvents.emit('update-sessions');
			}
		}.bind(this));

		WindowEvents.on(document, 'ShowHistoryList', function() {
			WindowEvents.emit(document, 'SetUIState', { list: 'history' });
		});

		WindowEvents.on(document, 'SessionDescriptionChanged', function() {
			this.sortSessionsBy(AppConfig.get('session.sorting'));
			this.scrollToSelected();
		}.bind(this));

		WindowEvents.on(document, 'SessionScrollToSelected', function() {
			this.scrollToSelected();
		}.bind(this));

		SessionFolderEvents(document, list, this);

		// ------------------------------------------------------------------------
		// Public data

		this.sessions = [];
		this.promiseInfo = { sessionID: AppConfig.get('session.selected') };
		this.DOMList = list;
		this.DOMRoot = root;
		this.document = document;

		this.SyncModel = SessionSyncModel.getModel(document);
	}

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
			SessionHistory.getHistory(function (historySessions) {
				for (let i = historySessions.length - 1; i >= 0; i--) {
					if (historySessions[i] && historySessions[i].tabCount)
					{
						var node = DomElem('div', {class: 'history-node'});
						node.textContent = new Date(historySessions[i].lastSave).toLocaleString();
						if (historySessions[i].active == true) {
							node.textContent = 'Current session';
						}
						node.setAttribute('index', i);
						historyList.appendChild(node);
					}
				}
			});
		}

		GlobalEvents.on('UpdateHistoryList', function() {
			createHistoryList();
		});

		WindowEvents.on(document, 'ShowHistoryList', function() {
			createHistoryList();
		});

		historyList.addEventListener('mousedown', function(e) {

			if (e.button != 2)
				return;

			var target = e.target;
			if (target.className == 'history-node') {
				WindowEvents.emit(document, 'HistorySessionCtxMenu-Open', {
					context: e.target,
					event: e
				});
			}
			else
			{
				WindowEvents.emit(document, 'HistoryListCtxMenu-Open', {event: e });
			}
		});

		historyList.addEventListener('click', function(e) {
			var target = e.target;
			if (target.className === 'history-node')
			{
				this.setSelectedNode(e.target);
				var index = target.getAttribute('index') | 0;
				SessionHistory.getHistory(function (sessions) {
					WindowEvents.emit(document, 'ShowHistorySession', sessions[index]);
				});
			}
		}.bind(this));

		// ------------------------------------------------------------------------
		// Public data

		return historyList;
	};

	SessionList.prototype.setSessions = function setSessions(jump)
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
			if (sessionFolder instanceof SessionFolder)
			{
				sessionFolder.updateFrom(session);
			}
			else
			{
				sessionFolder = new SessionFolder(this.document, session);
				sessionFolder.setVirtualPosition(session.index);
				this.SyncModel.setBookmark(session.id, sessionFolder);
			}

			if (session.id === this.promiseInfo.sessionID)
			{
				selectedSession = sessionFolder;
			}

			if (AppConfig.get('session.active.filter').length) {
				if (sessionFolder.match(this.filter)) {
					sessionFolder.setVirtualPosition(position);
					position++;
				}
			}

			this.sessions.push(sessionFolder);
			this.DOMList.appendChild(sessionFolder.DOMRoot);

		}.bind(this));

		var filterExpression = AppConfig.get('session.active.filter');
		if (filterExpression.length > 0) {
			this.filterSessions(filterExpression);
		}

		this.sortSessionsBy(AppConfig.get('session.sorting'));

		// Preview the selected session
		if (selectedSession)
		{
			this.selectSession(selectedSession, true, jump);
		}
		else
		{
			WindowEvents.emit(this.document, 'ShowCurrentSession');
		}
	};

	SessionList.prototype.scrollToSelected = function scrollToSelected(snap)
	{
		if (this.selectedNode == undefined)
			return;

		var offset = this.selectedNode.offsetTop - this.DOMList.clientHeight / 2 + this.selectedNode.clientHeight;

		if (snap === true)
		{
			this.DOMList.scrollTop = offset;
		}
		else
		{
			AutoScroll.scrollTo(this.DOMList, offset, 0.25);
		}
	};

	SessionList.prototype.setSelectedNode = function setSelectedNode(node)
	{
		if (this.selectedNode != undefined) {
			this.selectedNode.removeAttribute('active');
		}

		this.selectedNode = node;

		if (node) {
			node.setAttribute('active', 'true');
		}
	};

	SessionList.prototype.selectSession = function selectSession(selectedSession, scrollTo, snap)
	{
		AppConfig.set('session.selected', selectedSession.bookmarkID);
		this.setSelectedNode(selectedSession.DOMRoot);

		WindowEvents.emit(this.document, 'ViewSession', selectedSession.bookmarkID);
		if (this.promiseInfo.edit == true) {
			WindowEvents.emit(this.document, 'SessionContextMenu-EditSession', selectedSession.bookmarkID);
		}

		// auto-scroll to the selected node
		if (scrollTo) {
			this.scrollToSelected(snap);
		}
	};

	SessionList.prototype.filterSessions = function filterSessions(expression)
	{
		AppConfig.set('session.active.filter', expression);

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
			this.sortSessionsBy(AppConfig.get('session.sorting'));
		}
	};

	SessionList.prototype.sortSessionsBy = function sortSessionsBy(method)
	{
		AppConfig.set('session.sorting', method);
		this.sessions.sort(SessionFolderSortBy[method]);
		var position = 0;
		this.sessions.forEach(function(session) {
			if (session.isVisible()) {
				session.setVirtualPosition(position);
				position++;
			}
		});
	};

	// ------------------------------------------------------------------------
	// Module exports

	exports.SessionList = SessionList;

});