'use strict';

// *****************************************************************************
// Custom Modules

// App
import { AppConfig } from '../config';
import { SessionBookmark, SessionTab, SessionWindow, HistoryWindow, HistoryTab } from './session-bookmark';
import { SessionBookmarkEvents } from './session-bookmark-events';
import { SessionSyncModel } from './session-sync-model';
import { HistoryManager } from '../session/history';

// Utils
import { HTMLCreator } from '../utils/dom';
import { WindowEvents, GlobalEvents } from '../utils/global-events';

// Components
import { BookmarkManager } from '../session/bookmarks';
import { SessionManager } from '../session/management';
import { SessionHistory } from './session-history';

// *****************************************************************************
// API

/*
 * SessionContainer UI
 * Panel for listing session information (Firefox Bookmark Folder) and children bookmarks
 */

export class SessionContainer {
	constructor() {
		var DomElem = HTMLCreator();

		// ------------------------------------------------------------------------
		// Init UI

		var container = DomElem('div', { class: 'session-container' });
		container.style.fontSize = AppConfig.get('style.scale.bookmarks') + 'px';

		var bookmarks = DomElem('div', { class: 'bookmarks' });
		container.appendChild(bookmarks);

		// ------------------------------------------------------------------------
		// User events

		function isValidSessionID(ID) {
			return (
				SessionSyncModel.bookmarks[ID] !== undefined &&
				SessionSyncModel.bookmarks[ID].type === 'folder' &&
				SessionSyncModel.bookmarks[ID].parentId == AppConfig.get('storageID')
			);
		}

		function restoreHistorySession(sessionInfo) {
			var list = [];
			sessionInfo.windows.forEach((historyWindow) => {
				list.push(historyWindow.tabs);
			});
			SessionManager.loadHistoryTabsNewWindow(list);
		}

		if (typeof document !== 'undefined') {
			WindowEvents.on(document, 'HistorySessionSave', this.saveHistorySession.bind(this));

			WindowEvents.on(document, 'HistorySessionRestore', (index) => {
				SessionHistory.getHistorySession(index, (sessionInfo) => {
					restoreHistorySession(sessionInfo);
				});
			});

			WindowEvents.on(document, 'HistorySessionRestoreWindow', (windowID) => {
				if (this.SyncModel.state.session === 'history') {
					if (this.selectedHistorySession.active == true) {
						var activeSessionWindows = Object.values(this.selectedHistorySession.windows);
						if (activeSessionWindows[windowID].active) {
							SessionManager.activateWindow(activeSessionWindows[windowID].id);
						} else {
							SessionManager.loadHistoryTabsNewWindow([activeSessionWindows[windowID].tabs]);
						}
					} else {
						SessionManager.loadHistoryTabsNewWindow([this.selectedHistorySession.windows[windowID].tabs]);
					}
				}
			});

			WindowEvents.on(document, 'MenuRestoreClick', () => {
				if (isValidSessionID(this.activeSessionID)) {
					SessionManager.restoreSession(this.activeSessionID);
				}
			});

			WindowEvents.on(document, 'MenuRestoreNewWindow', () => {
				if (isValidSessionID(this.activeSessionID)) {
					SessionManager.restoreNewWindow(this.activeSessionID);
				}

				// history session
				if (this.SyncModel.state.session === 'history') {
					restoreHistorySession(this.selectedHistorySession);
				}
			});

			WindowEvents.on(document, 'ReplaceSessionAll', () => {
				if (isValidSessionID(this.activeSessionID)) {
					SessionManager.replaceSessionAll(this.activeSessionID);
				}
			});

			WindowEvents.on(document, 'ReplaceSession', () => {
				if (isValidSessionID(this.activeSessionID)) {
					SessionManager.replaceSession(this.activeSessionID);
				}
			});

			WindowEvents.on(document, 'MenuMergeSessions', (e) => {
				if (isValidSessionID(this.activeSessionID)) {
					WindowEvents.emit(document, 'ConfirmBox-Open', {
						event: e,
						message: 'Merge selected session and active window session?',
						callback: () => {
							SessionManager.mergeSessions(this.activeSessionID);
						}
					});
				}
			});

			WindowEvents.on(document, 'MenuReplaceSession', (e) => {
				if (isValidSessionID(this.activeSessionID)) {
					WindowEvents.emit(document, 'ConfirmBox-Open', {
						event: e,
						message: 'Overwrite the selected session with active window session?',
						callback: () => {
							SessionManager.overwriteSession(this.activeSessionID);
						}
					});
				}
			});

			WindowEvents.on(document, 'MenuAddCurrentTab', () => {
				if (isValidSessionID(this.activeSessionID)) {
					this.bookmarkCurrentTab();
				}
			});

			WindowEvents.on(document, 'MenuSaveSession', () => {
				// do not save if the session is already saved
				if (isValidSessionID(this.activeSessionID)) {
					return;
				}

				switch (this.SyncModel.state.session) {
					case 'current':
						SessionManager.saveActiveSession();
						break;

					case 'history':
						this.saveHistorySession();
						break;
				}
			});

			WindowEvents.on(document, 'EditSelectedSession', () => {
				WindowEvents.emit(document, 'SessionContextMenu-EditSession', this.activeSessionID);
			});

			WindowEvents.on(document, 'ShowCurrentSession', this.showCurrentSession.bind(this));

			WindowEvents.on(document, 'ShowHistorySession', this.showHistorySession.bind(this));

			WindowEvents.on(document, 'ViewSession', this.previewSession.bind(this));

			WindowEvents.on(document, 'SessionDescriptionChanged', (sessionID) => {
				if (this.activeSessionID == sessionID) {
					this.updateSessionInfo();
				}
			});
		}

		GlobalEvents.on('UpdateCurrentSession', () => {
			if (this.SyncModel.state.session == 'current') {
				this.showCurrentSession();
			}
		});

		AppConfig.onChange('style.scale.bookmarks', function (size) {
			container.style.fontSize = size + 'px';
		});

		AppConfig.onChange('session.save', () => {
			if (this.SyncModel.state.session == 'current') {
				this.showCurrentSession();
			}
		});

		// Tracked events

		SessionBookmarkEvents(bookmarks);

		var updateTimeout = null;
		function updateOnTabEvent() {
			if (SessionManager.tabTracking()) {
				if (updateTimeout == null) {
					updateTimeout = setTimeout(function () {
						updateTimeout = null;
						GlobalEvents.emit('UpdateCurrentSession');
					}, 1000);
				}
			}
		}

		// Tab updates tracking
		if (typeof browser !== 'undefined' && browser.tabs) {
			var trackedEvents = ['onUpdated', 'onCreated', 'onDetached', 'onMoved', 'onAttached', 'onRemoved'];
			trackedEvents.forEach((eventType) => {
				browser.tabs[eventType].addListener(updateOnTabEvent);
			});
		}

		// ------------------------------------------------------------------------
		// Public data

		this.DOMBookmarks = bookmarks;
		this.DOMRoot = container;

		this.SyncModel = SessionSyncModel.getModel(typeof document !== 'undefined' ? document : null);
	}

	setUIState(state, headerTitle, sessionID) {
		if (typeof document !== 'undefined') {
			WindowEvents.emit(document, 'SetUIState', { session: state });
			WindowEvents.emit(document, 'SetSessionDescription', headerTitle);
		}

		this.DOMBookmarks.textContent = '';
		this.activeSessionID = sessionID;
		this.selectedHistorySession = undefined;
	}

	updateSessionInfo() {
		var session = SessionSyncModel.bookmarks[this.activeSessionID];
		if (typeof document !== 'undefined') {
			WindowEvents.emit(document, 'SetSessionDescription', session.title);
			WindowEvents.emit(document, 'SetSessionInfo', session);
		}
	}

	showCurrentSession() {
		var DOMBookmarks = this.DOMBookmarks;
		this.setUIState('current', 'Active session', 0);

		SessionManager.getCurrentWindow((mozWindow) => {
			// Get non-private windows
			if (mozWindow.incognito == true || AppConfig.get('session.save').allWindows == false) {
				mozWindow.tabs.forEach((tab) => {
					let sessionTab = new SessionTab(tab, 0, -1);
					this.SyncModel.tabs[sessionTab.tab.id] = sessionTab;
					DOMBookmarks.appendChild(sessionTab.DOMRoot);
				});

				this.restoreScrollTop('current');
			} else {
				// Get non-private windows
				var tabIndex = 0;
				var windowIndex = 0; // display index in UI - ignores private windows

				SessionManager.getAllWindows((windows) => {
					for (let mozWindow of windows) {
						if (!mozWindow.incognito) {
							// Add window separator
							var sessionWindow = new SessionWindow(mozWindow.id, windowIndex, tabIndex);
							DOMBookmarks.appendChild(sessionWindow.DOMRoot);
							tabIndex++;

							var globalOffset = tabIndex;

							// Add window tabs
							for (let i in mozWindow.tabs) {
								let tab = mozWindow.tabs[i];
								let sessionTab = new SessionTab(tab, globalOffset);
								this.SyncModel.tabs[sessionTab.tab.id] = sessionTab;
								DOMBookmarks.appendChild(sessionTab.DOMRoot);
								tabIndex++;
							}

							windowIndex++;
						}
					}

					this.restoreScrollTop('current');
				});
			}
		});
	}

	showHistorySession(sessionInfo) {
		var newSession = this.selectedHistorySession != undefined && this.selectedHistorySession != sessionInfo;

		this.setUIState('history', new Date(sessionInfo.lastSave).toLocaleString(), -1);
		this.selectedHistorySession = sessionInfo;
		HistoryManager.selectSession(sessionInfo);

		console.log('sessionInfo', sessionInfo);

		var tabIndex = 0;
		var windowIndex = 0;

		for (let windowID in sessionInfo.windows) {
			// Add window separator
			var sessionWindow = new HistoryWindow(sessionInfo.windows[windowID], windowIndex, tabIndex);
			this.DOMBookmarks.appendChild(sessionWindow.DOMRoot);
			tabIndex++;

			var globalOffset = tabIndex;

			// Add window tabs
			var windowTabs = sessionInfo.windows[windowID].tabs;
			for (var i in windowTabs) {
				var tab = windowTabs[i];
				tab.id = i;
				tab.windowId = windowID;
				tab.index = i | 0;
				var sessionTab = new HistoryTab(tab, globalOffset);
				this.DOMBookmarks.appendChild(sessionTab.DOMRoot);
				tabIndex++;
			}

			windowIndex++;
		}

		this.restoreScrollTop('history', newSession ? 0 : undefined);
	}

	previewSession(sessionID) {
		var session = SessionSyncModel.bookmarks[sessionID];
		this.setUIState('restore', '', sessionID);

		BookmarkManager.getFolderBookmarks(session.id, (marks) => {
			if (typeof document !== 'undefined') {
				WindowEvents.emit(document, 'SetPromiseSession', { sessionID: session.id, update: false });
			}

			marks.forEach((mark) => {
				var bookmark = new SessionBookmark(mark);
				bookmark.setVirtualPosition(mark.index);

				SessionSyncModel.bookmarks[mark.id] = mark;
				this.SyncModel.setBookmark(mark.id, bookmark);
				this.DOMBookmarks.appendChild(bookmark.DOMRoot);
			});

			this.updateSessionInfo();
			this.restoreScrollTop('restore');
		});
	}

	restoreScrollTop(state, forcedValue) {
		var scrollTop = AppConfig.get('state.scrollTop.' + state);
		this.DOMBookmarks.scrollTop = forcedValue !== undefined ? forcedValue : scrollTop;
	}

	bookmarkCurrentTab() {
		// Test if already saved in this session
		SessionManager.getCurrentTab((activeTab) => {
			var sessionID = this.activeSessionID;
			var bookmarks = SessionSyncModel.bookmarks;

			for (var i in bookmarks) {
				if (bookmarks[i].parentId == sessionID && bookmarks[i].url == activeTab.url) {
					if (typeof document !== 'undefined') {
						WindowEvents.emit(document, 'Notification', {
							message: 'Already Saved'
						});
					}

					var bookmarkElem = this.SyncModel.getBookmark(bookmarks[i].id);
					bookmarkElem.highlight();
					return;
				}
			}

			// Add bookmark into the session

			BookmarkManager.createBookmarkFromTab(activeTab, sessionID).then((mark) => {
				var bookmark = new SessionBookmark(mark);

				SessionSyncModel.bookmarks[mark.id] = mark;
				this.SyncModel.setBookmark(mark.id, bookmark);
				this.DOMBookmarks.appendChild(bookmark.DOMRoot);

				bookmark.setVirtualPosition(mark.index);
				bookmark.highlight();
			});
		});
	}

	saveHistorySession(sessionIndex) {
		if (sessionIndex == undefined) {
			// When Save button from toolbar is pressed
			SessionManager.saveHistorySession(this.selectedHistorySession);
		} else {
			// Save from context menu
			SessionHistory.getHistorySession(sessionIndex, function (sessionInfo) {
				SessionManager.saveHistorySession(sessionInfo);
			});
		}
	}
}
