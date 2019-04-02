define(function(require, exports) {
	'use strict';

	// ************************************************************************
	// Modules

	const { AppConfig } = require('../config');

	const { HTMLCreator } = require('../utils/dom');
	const { WindowEvents, GlobalEvents } = require('../utils/global-events');
	const { AutoScroll } = require('../utils/auto-scroll');

	const { SessionFolder, SessionHistoryFolder, SessionFolderSortBy } = require('./session-folder');
	const { SessionFolderEvents, SessionHistoryEvents } = require('./session-folder-events');
	const { SessionSyncModel } = require('./session-sync-model');
	const { SessionHistory } = require('./session-history');

	// ************************************************************************
	// API

	/*
	* Session List
	* UI Module for interacting with all the session
	*/

	function SessionList()
	{
		var DomElem = HTMLCreator();

		// ------------------------------------------------------------------------
		// Init UI

		// Session Area
		var root = DomElem('div', {class: 'sessions'});

		var resizeHandle = DomElem('div', {class: 'resize-handle'});
		root.appendChild(resizeHandle);

		// History list
		var historyList = this.createHistoryList();
		root.appendChild(historyList);

		// Session list
		var sessionList = DomElem('div', {class: 'session-list'});
		root.appendChild(sessionList);

		// ------------------------------------------------------------------------
		// Events

		AppConfig.onChange('style.sessions.list.width', function(width) {
			root.style.width = width + 'px';
		});

		AppConfig.onChange('style.scale.sessions', function(value) {
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

		WindowEvents.on(document, 'SelectSyncSession', function(context) {
			this.selectSyncSession(context, false);
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
			if (AppConfig.get('session.selected') != null) {
				AppConfig.set('session.selected', null);
				AppConfig.set('state.scrollTop.current', 0);
			}
			this.setState('active');
			this.setSelectedNode(undefined);
		}.bind(this));

		WindowEvents.on(document, 'ShowSyncList', function(options) {
			// Select first visible session
			if (this.promiseInfo.sessionID == null)
			{
				for (var i=0; i < this.sessions.length; i++)
				{
					if (this.sessions[i].isVisible())
					{
						this.selectSyncSession(this.sessions[i], true, false);
						break;
					}
				}
			}

			this.setState('sync');
			if (options.update == true) {
				GlobalEvents.emit('update-sessions');
			}
		}.bind(this));

		WindowEvents.on(document, 'SessionDescriptionChanged', function() {
			this.sortSessionsBy(AppConfig.get('session.sorting'));
			this.scrollToSelected();
		}.bind(this));

		WindowEvents.on(document, 'SessionScrollToSelected', function() {
			this.scrollToSelected();
		}.bind(this));

		GlobalEvents.on('BookmarkDeleted', function (itemID) {
			if (AppConfig.get('session.selected') == itemID) {
				WindowEvents.emit(this.document, 'ShowCurrentSession');
			}
		}.bind(this));

		WindowEvents.on(document, 'SelectHistorySession', function(context) {
			this.selectHistorySession(context);
		}.bind(this));

		AppConfig.onChange('session.selected', function(value) {
			if (value) {
				WindowEvents.emit(document, 'SetPromiseSession', { sessionID: value, update: false } );
			}
		});

		// ------------------------------------------------------------------------
		// Event Initialization

		SessionFolderEvents(sessionList);
		SessionHistoryEvents(historyList);
		SessionHistory.init();

		// ------------------------------------------------------------------------
		// Public data

		this.sessions = [];
		this.promiseInfo = {};
		this.DOMList = sessionList;
		this.DOMRoot = root;
		this.document = document;

		this.SyncModel = SessionSyncModel.getModel(document);
	}

	SessionList.prototype.setState = function setState(state)
	{
		AppConfig.set('session.view', state);
		WindowEvents.emit(document, 'SetUIState', { list: state });
	};

	SessionList.prototype.createHistoryList = function createHistoryList()
	{
		var DomElem = HTMLCreator();

		// ------------------------------------------------------------------------
		// Create UI

		var historyList = DomElem('div', {class: 'history-list'});

		// ------------------------------------------------------------------------
		// Events

		function refreshHistoryList()
		{
			var snap = AppConfig.isInitState();
			var selectedIndex = AppConfig.get('session.history.selected');

			historyList.textContent = '';
			SessionHistory.getFullHistory(function (historySessions, activeSession) {

				if (activeSession) {
					let activeSnapshot = new SessionHistoryFolder(activeSession, -1);
					activeSnapshot.setTitle('Active snapshot');
					historyList.appendChild(activeSnapshot.DOMRoot);
				}

				for (let i = historySessions.length - 1; i >= 0; i--) {
					if (historySessions[i] && historySessions[i].tabCount)
					{
						let historySession = new SessionHistoryFolder(historySessions[i], i);
						historyList.appendChild(historySession.DOMRoot);

						if (i == selectedIndex) {
							var node = historySession.DOMRoot;
							AutoScroll.scrollTo(historyList, node.offsetTop - historyList.parentNode.clientHeight / 2 + node.clientHeight, snap === true ? 0 : 0.25);
						}
					}
				}
			}.bind(this));
		}

		GlobalEvents.on('UpdateHistoryList', function() {
			refreshHistoryList();
		});

		WindowEvents.on(document, 'ShowHistoryList', function() {
			this.setState('history');
			refreshHistoryList();
		}.bind(this));

		historyList.addEventListener('click', function(e) {
			if (e.target.className === 'history-node')
			{
				this.selectHistorySession(e.target);
			}
		}.bind(this));

		// ------------------------------------------------------------------------
		// Public data

		return historyList;
	};

	SessionList.prototype.selectHistorySession = function selectHistorySession(node)
	{
		this.setSelectedNode(node);
		var index = node.getAttribute('index') | 0;

		SessionHistory.getHistorySession(index, function (sessionInfo) {
			WindowEvents.emit(document, 'ShowHistorySession', sessionInfo);

			if (AppConfig.get('session.history.selected') != index) {
				AppConfig.set('session.history.selected', index);
				AppConfig.set('state.scrollTop.history', 0);
			}
		});
	};

	SessionList.prototype.setSessions = function setSessions()
	{
		this.sessions = [];
		this.DOMList.textContent = '';

		// Position for active filtering
		var position = 0;
		var selectedSession;
		var filterExpression = AppConfig.get('session.active.filter');

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
				sessionFolder = new SessionFolder(session);
				sessionFolder.setVirtualPosition(session.index);
				this.SyncModel.setBookmark(session.id, sessionFolder);
			}

			if (session.id === this.promiseInfo.sessionID)
			{
				selectedSession = sessionFolder;
			}

			if (filterExpression.length) {
				if (sessionFolder.match(this.filter)) {
					sessionFolder.setVirtualPosition(position);
					position++;
				}
			}

			this.sessions.push(sessionFolder);
			this.DOMList.appendChild(sessionFolder.DOMRoot);

		}.bind(this));

		if (filterExpression.length > 0) {
			this.filterSessions(filterExpression);
		}

		this.sortSessionsBy(AppConfig.get('session.sorting'));

		// Switch to History View if this was the state before closing the UI
		if (AppConfig.get('session.view') == 'history')
		{
			WindowEvents.emit(document, 'ShowHistoryList');
			return;
		}

		// Preview the selected session if available
		if (selectedSession)
		{
			this.selectSyncSession(selectedSession, true, AppConfig.isInitState());
			return;
		}

		// Otherwise, preview the current session
		AppConfig.isInitState();
		WindowEvents.emit(this.document, 'ShowCurrentSession');
	};

	SessionList.prototype.scrollToSelected = function scrollToSelected(snap)
	{
		if (this.selectedNode == undefined)
			return;

		var offset = this.selectedNode.offsetTop - this.DOMList.clientHeight / 2 + this.selectedNode.clientHeight;

		AutoScroll.scrollTo(this.DOMList, offset, snap === true ? 0 : 0.25);
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

	SessionList.prototype.selectSyncSession = function selectSyncSession(selectedSession, scrollTo, snap)
	{
		if (AppConfig.get('session.selected') != selectedSession.bookmarkID)
		{
			AppConfig.set('session.selected', selectedSession.bookmarkID);
			AppConfig.set('state.scrollTop.restore', 0);
		}

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
			expression = expression.toLowerCase();
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