'use strict';

// ************************************************************************
// Modules

import { AppConfig } from '../config';

import { HTMLCreator } from '../utils/dom';
import { WindowEvents, GlobalEvents } from '../utils/global-events';
import { AutoScroll } from '../utils/auto-scroll';

import { SessionFolder, SessionHistoryFolder, SessionFolderSortBy } from './session-folder';
import { SessionFolderEvents, SessionHistoryEvents } from './session-folder-events';
import { SessionSyncModel } from './session-sync-model';
import { SessionHistory } from './session-history';

// ************************************************************************
// API

/*
* Session List
* UI Module for interacting with all the session
*/

export class SessionList {
	constructor() {
		var DomElem = HTMLCreator();

		// ------------------------------------------------------------------------
		// Init UI

		// Session Area
		var root = DomElem('div', { class: 'sessions' });

		var resizeHandle = DomElem('div', { class: 'resize-handle' });
		root.appendChild(resizeHandle);

		// History list
		var historyList = this.createHistoryList();
		root.appendChild(historyList);

		// Session list
		var sessionList = DomElem('div', { class: 'session-list' });
		root.appendChild(sessionList);

		// ------------------------------------------------------------------------
		// Events

		AppConfig.onChange('style.sessions.list.width', function (width) {
			root.style.width = width + 'px';
		});

		AppConfig.onChange('style.scale.sessions', function (value) {
			root.style.fontSize = value + 'px';
		});

		var startResize = function startResize(e) {
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

		if (typeof document !== 'undefined') {
			WindowEvents.on(document, 'ListSessions', this.setSessions.bind(this));

			WindowEvents.on(document, 'SetPromiseSession', function (sessionInfo) {
				this.promiseInfo = sessionInfo;
				WindowEvents.emit(document, 'ShowSyncList', { update: sessionInfo.update });
			}.bind(this));

			WindowEvents.on(document, 'SelectSyncSession', function (context) {
				this.selectSyncSession(context, false);
			}.bind(this));

			WindowEvents.on(document, 'FilterSessions', this.filterSessions.bind(this));
			WindowEvents.on(document, 'SortSessionsBy', this.sortSessionsBy.bind(this));

			WindowEvents.on(document, 'SessionsPositionChanged', function (indices) {
				if (AppConfig.get('session.sorting') == 'position-asc' && AppConfig.get('session.active.filter').length == 0) {
					var len = indices.length;
					for (var i = 0; i < len; i++) {
						var node = this.SyncModel.getBookmark(indices[i]);
						node.setVirtualPosition(SessionSyncModel.bookmarks[node.bookmarkID].index);
					}
				}
			}.bind(this));

			WindowEvents.on(document, 'ShowCurrentSession', function () {
				if (AppConfig.get('session.selected') != null) {
					AppConfig.set('session.selected', null);
					AppConfig.set('state.scrollTop.current', 0);
				}
				this.setState('active');
				this.setSelectedNode(undefined);
			}.bind(this));

			WindowEvents.on(document, 'ShowSyncList', function (options) {
				// Select first visible session
				if (this.promiseInfo.sessionID == null) {
					for (var i = 0; i < this.sessions.length; i++) {
						if (this.sessions[i].isVisible()) {
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

			WindowEvents.on(document, 'SessionDescriptionChanged', function () {
				this.sortSessionsBy(AppConfig.get('session.sorting'));
				this.scrollToSelected();
			}.bind(this));

			WindowEvents.on(document, 'SessionScrollToSelected', function () {
				this.scrollToSelected();
			}.bind(this));

			GlobalEvents.on('BookmarkDeleted', function (itemID) {
				if (AppConfig.get('session.selected') == itemID) {
					WindowEvents.emit(this.document, 'ShowCurrentSession');
				}
			}.bind(this));

			WindowEvents.on(document, 'SelectHistorySession', function (context) {
				this.selectHistorySession(context);
			}.bind(this));
		}

		AppConfig.onChange('session.selected', function (value) {
			if (value && typeof document !== 'undefined') {
				WindowEvents.emit(document, 'SetPromiseSession', { sessionID: value, update: false });
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
		this.document = typeof document !== 'undefined' ? document : null;

		this.SyncModel = SessionSyncModel.getModel(this.document);
	}

	setState(state) {
		AppConfig.set('session.view', state);
		if (this.document) {
			WindowEvents.emit(this.document, 'SetUIState', { list: state });
		}
	}

	createHistoryList() {
		var DomElem = HTMLCreator();

		// ------------------------------------------------------------------------
		// Create UI

		var historyList = DomElem('div', { class: 'history-list' });

		// ------------------------------------------------------------------------
		// Events

		var refreshHistoryList = () => {
			var snap = AppConfig.isInitState();
			var selectedIndex = AppConfig.get('session.history.selected');

			historyList.textContent = '';
			SessionHistory.getFullHistory((historySessions, activeSession) => {

				if (activeSession) {
					let activeSnapshot = new SessionHistoryFolder(activeSession, -1);
					activeSnapshot.setTitle('Active snapshot');
					historyList.appendChild(activeSnapshot.DOMRoot);
				}

				for (let i = historySessions.length - 1; i >= 0; i--) {
					if (historySessions[i] && historySessions[i].tabCount) {
						let historySession = new SessionHistoryFolder(historySessions[i], i);
						historyList.appendChild(historySession.DOMRoot);

						if (i == selectedIndex) {
							var node = historySession.DOMRoot;
							AutoScroll.scrollTo(historyList, node.offsetTop - historyList.parentNode.clientHeight / 2 + node.clientHeight, snap === true ? 0 : 0.25);
						}
					}
				}
			});
		}

		GlobalEvents.on('UpdateHistoryList', function () {
			refreshHistoryList();
		});

		WindowEvents.on(document, 'ShowHistoryList', () => {
			this.setState('history');
			refreshHistoryList();
		});

		historyList.addEventListener('click', (e) => {
			if (e.target.className === 'history-node') {
				this.selectHistorySession(e.target);
			}
		});

		// ------------------------------------------------------------------------
		// Public data

		return historyList;
	}

	selectHistorySession(node) {
		this.setSelectedNode(node);
		var index = node.getAttribute('index') | 0;

		SessionHistory.getHistorySession(index, (sessionInfo) => {
			if (this.document) {
				WindowEvents.emit(this.document, 'ShowHistorySession', sessionInfo);
			}

			if (AppConfig.get('session.history.selected') != index) {
				AppConfig.set('session.history.selected', index);
				AppConfig.set('state.scrollTop.history', 0);
			}
		});
	}

	setSessions() {
		this.sessions = [];
		this.DOMList.textContent = '';

		// Position for active filtering
		var position = 0;
		var selectedSession;
		var filterExpression = AppConfig.get('session.active.filter');

		SessionSyncModel.sessions.forEach(function (session) {

			SessionSyncModel.bookmarks[session.id] = session;

			// find if a cache instance is already created and update it
			var sessionFolder = this.SyncModel.getBookmark(session.id);
			if (sessionFolder instanceof SessionFolder) {
				sessionFolder.updateFrom(session);
			}
			else {
				sessionFolder = new SessionFolder(session);
				sessionFolder.setVirtualPosition(session.index);
				this.SyncModel.setBookmark(session.id, sessionFolder);
			}

			if (session.id === this.promiseInfo.sessionID) {
				selectedSession = sessionFolder;
			}

			if (filterExpression.length > 0) {
				if (sessionFolder.match(filterExpression)) {
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
		if (AppConfig.get('session.view') == 'history' && this.document) {
			WindowEvents.emit(this.document, 'ShowHistoryList');
			return;
		}

		// Preview the selected session if available
		if (selectedSession) {
			this.selectSyncSession(selectedSession, true, AppConfig.isInitState());
			return;
		}

		// Otherwise, preview the current session
		AppConfig.isInitState();
		if (this.document) {
			WindowEvents.emit(this.document, 'ShowCurrentSession');
		}
	}

	scrollToSelected(snap) {
		if (this.selectedNode == undefined)
			return;

		var offset = this.selectedNode.offsetTop - this.DOMList.clientHeight / 2 + this.selectedNode.clientHeight;

		AutoScroll.scrollTo(this.DOMList, offset, snap === true ? 0 : 0.25);
	}

	setSelectedNode(node) {
		if (this.selectedNode != undefined) {
			this.selectedNode.removeAttribute('active');
		}

		this.selectedNode = node;

		if (node) {
			node.setAttribute('active', 'true');
		}
	}

	selectSyncSession(selectedSession, scrollTo, snap) {
		if (AppConfig.get('session.selected') != selectedSession.bookmarkID) {
			AppConfig.set('session.selected', selectedSession.bookmarkID);
			AppConfig.set('state.scrollTop.restore', 0);
		}

		this.setSelectedNode(selectedSession.DOMRoot);

		if (this.document) {
			WindowEvents.emit(this.document, 'ViewSession', selectedSession.bookmarkID);
			if (this.promiseInfo.edit == true) {
				WindowEvents.emit(this.document, 'SessionContextMenu-EditSession', selectedSession.bookmarkID);
			}
		}

		// auto-scroll to the selected node
		if (scrollTo) {
			this.scrollToSelected(snap);
		}
	}

	filterSessions(expression) {
		AppConfig.set('session.active.filter', expression);

		if (expression.length) {
			expression = expression.toLowerCase();
			var exactMatch = false;
			var expLength = expression.length;
			var doc = this.document;

			var position = 0;
			this.sessions.forEach(function (session) {
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
			if (doc) {
				WindowEvents.emit(doc, 'FilterSessionsExactMatch', exactMatch);
			}
		}
		else {
			this.sessions.forEach(function (session) {
				session.setVisible();
			});
			this.sortSessionsBy(AppConfig.get('session.sorting'));
		}
	}

	sortSessionsBy(method) {
		AppConfig.set('session.sorting', method);
		this.sessions.sort(SessionFolderSortBy[method]);
		var position = 0;
		this.sessions.forEach(function (session) {
			if (session.isVisible()) {
				session.setVirtualPosition(position);
				position++;
			}
		});
	}
}