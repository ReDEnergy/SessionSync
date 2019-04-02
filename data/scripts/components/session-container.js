define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	// App
	const { AppConfig } = require('../config');
	const { SessionBookmark, SessionTab, SessionWindow, HistoryWindow, HistoryTab } = require('./session-bookmark');
	const { SessionBookmarkEvents } = require('./session-bookmark-events');
	const { SessionSyncModel } = require('./session-sync-model');

	// Utils
	const { HTMLCreator } = require('../utils/dom');
	const { WindowEvents, GlobalEvents } = require('../utils/global-events');

	// Components
	const { BookmarkManager } = require('../session/bookmarks');
	const { SessionManager } = require('../session/management');
	const { SessionHistory } = require('./session-history');

	// *****************************************************************************
	// APIconst { WindowEvents, GlobalEvents } = require('../utils/global-events');

	/*
	* SessionContainer UI
	* Panel for listing session information (Firefox Bookmark Folder) and children bookmarks
	*/

	function SessionContainer()
	{
		var DomElem = HTMLCreator();

		// ------------------------------------------------------------------------
		// Init UI

		var container = DomElem('div', {class: 'session-container'});
		container.style.fontSize = AppConfig.get('style.scale.bookmarks') + 'px';

		var bookmarks = DomElem('div', {class: 'bookmarks'});
		container.appendChild(bookmarks);

		// ------------------------------------------------------------------------
		// User events

		function isValidSessionID(ID)
		{
			return (SessionSyncModel.bookmarks[ID] !== undefined &&
					SessionSyncModel.bookmarks[ID].type === 'folder' &&
					SessionSyncModel.bookmarks[ID].parentId == AppConfig.get('storageID'));
		}

		function restoreHistoryWindow(sessionInfo)
		{
			var list = [];
			sessionInfo.windows.forEach(historyWindow => {
				list.push(historyWindow.tabs);
			});
			SessionManager.loadBookmarksNewWindow(list);
		}

		WindowEvents.on(document, 'HistorySessionSave', this.saveHistorySession.bind(this));

		WindowEvents.on(document, 'HistorySessionRestore', function (index) {
			SessionHistory.getHistorySession(index, function (sessionInfo) {
				restoreHistoryWindow(sessionInfo);
			});
		});

		WindowEvents.on(document, 'HistorySessionRestoreWindow', function (windowID) {
			if (this.SyncModel.state.session === 'history') {
				if (this.selectedHistorySession.active == true)
				{
					var activeSessionWindows = Object.values(this.selectedHistorySession.windows);
					if (activeSessionWindows[windowID].active) {
						SessionManager.activateWindow(activeSessionWindows[windowID].id);
					}
					else {
						SessionManager.loadBookmarksNewWindow([activeSessionWindows[windowID].tabs]);
					}
				}
				else {
					SessionManager.loadBookmarksNewWindow([this.selectedHistorySession.windows[windowID].tabs]);
				}
			}
		}.bind(this));

		WindowEvents.on(document, 'MenuRestoreClick', function() {
			if (isValidSessionID(this.activeSessionID)) {
				SessionManager.restoreSession(this.activeSessionID);
			}
		}.bind(this));

		WindowEvents.on(document, 'MenuRestoreNewWindow', function() {

			if (isValidSessionID(this.activeSessionID)) {
				SessionManager.restoreNewWindow(this.activeSessionID);
			}

			// history session
			if (this.SyncModel.state.session === 'history') {
				restoreHistoryWindow(this.selectedHistorySession);
			}
		}.bind(this));

		WindowEvents.on(document, 'MenuMergeSessions', function(e) {
			if (isValidSessionID(this.activeSessionID)) {
				WindowEvents.emit(document, 'ConfirmBox-Open', {
					event: e,
					message: 'Merge selected session and active window session?',
					callback: function() {
						SessionManager.mergeSessions(this.activeSessionID);
					}.bind(this)
				});
			}
		}.bind(this));

		WindowEvents.on(document, 'MenuReplaceSession', function(e) {
			if (isValidSessionID(this.activeSessionID)) {
				WindowEvents.emit(document, 'ConfirmBox-Open', {
					event: e,
					message: 'Overwrite the selected session with active window session?',
					callback: function() {
						SessionManager.overwriteSession(this.activeSessionID);
					}.bind(this)
				});
			}
		}.bind(this));

		WindowEvents.on(document, 'MenuAddCurrentTab', function() {
			if (isValidSessionID(this.activeSessionID)) {
				this.bookmarkCurrentTab();
			}
		}.bind(this));

		WindowEvents.on(document, 'MenuSaveSession', function() {
			// do not save if the session is already saved
			if (isValidSessionID(this.activeSessionID)) {
				return;
			}

			switch(this.SyncModel.state.session)
			{
				case 'current':
					SessionManager.saveActiveSession();
					break;

				case 'history':
					this.saveHistorySession();
					break;
			}

		}.bind(this));

		WindowEvents.on(document, 'UpdateCurrentSession', function() {
			if (this.SyncModel.state.session == 'current') {
				this.showCurrentSession();
			}
		}.bind(this));

		WindowEvents.on(document, 'EditSelectedSession', function() {
			WindowEvents.emit(document, 'SessionContextMenu-EditSession', this.activeSessionID);
		}.bind(this));

		WindowEvents.on(document, 'ShowCurrentSession', this.showCurrentSession.bind(this));

		WindowEvents.on(document, 'ShowHistorySession', this.showHistorySession.bind(this));

		WindowEvents.on(document, 'ViewSession', this.previewSession.bind(this));

		AppConfig.onChange('style.scale.bookmarks', function(size) {
			container.style.fontSize = size + 'px';
		});

		AppConfig.onChange('session.save', function(obj) {
			if (this.SyncModel.state.session == 'current') {
				this.showCurrentSession();
			}
		}.bind(this));

		WindowEvents.on(document, 'SessionDescriptionChanged', function(sessionID) {
			if (this.activeSessionID == sessionID)
			{
				this.updateSessionInfo();
			}
		}.bind(this));

		// Tracked events

		SessionBookmarkEvents(bookmarks);

		var updateTimeout = null;
		function updateOnTabEvent()
		{
			if (SessionManager.tabTracking())
			{
				if (updateTimeout == null) {
					updateTimeout = setTimeout(function () {
						updateTimeout = null;
						WindowEvents.emit(document, 'UpdateCurrentSession');
					}, 1000);
				}
			}
		}

		// Tab updates tracking
		var trackedEvents = ['onUpdated', 'onCreated', 'onDetached', 'onMoved', 'onAttached', 'onRemoved'];
		trackedEvents.forEach(function (eventType) {
			browser.tabs[eventType].addListener(updateOnTabEvent);
		}.bind(this));

		// ------------------------------------------------------------------------
		// Public data

		this.DOMBookmarks = bookmarks;
		this.DOMRoot = container;

		this.SyncModel = SessionSyncModel.getModel(document);
	}

	SessionContainer.prototype.setUIState = function setUIState(state, headerTitle, sessionID)
	{
		WindowEvents.emit(document, 'SetUIState', {'session': state});
		WindowEvents.emit(document, 'SetSessionDescription', headerTitle);

		this.DOMBookmarks.textContent = '';
		this.activeSessionID = sessionID;
		this.selectedHistorySession = undefined;
	};

	SessionContainer.prototype.updateSessionInfo = function updateSessionInfo()
	{
		var session = SessionSyncModel.bookmarks[this.activeSessionID];
		WindowEvents.emit(document, 'SetSessionDescription', session.title);
		WindowEvents.emit(document, 'SetSessionDate', session.dateAdded);
	};

	SessionContainer.prototype.showCurrentSession = function showCurrentSession()
	{
		var DOMBookmarks = this.DOMBookmarks;
		this.setUIState('current', 'Active session', 0);

		SessionManager.getCurrentWindow(function(mozWindow) {

			// Get non-private windows
			if (mozWindow.incognito == true || AppConfig.get('session.save').allWindows == false)
			{
				mozWindow.tabs.forEach(function (tab) {
					let sessionTab = new SessionTab(tab, 0, -1);
					this.SyncModel.tabs[sessionTab.tab.id] = sessionTab;
					DOMBookmarks.appendChild(sessionTab.DOMRoot);
				}.bind(this));

				this.restoreScrollTop('current');
			}
			else
			{
				// Get non-private windows
				var tabIndex = 0;
				var windowIndex = 0;	// display index in UI - ignores private windows

				SessionManager.getAllWindows(function(windows) {
					for (let mozWindow of windows)
					{
						if (!mozWindow.incognito)
						{
							// Add window separator
							var sessionWindow = new SessionWindow(mozWindow.id, windowIndex, tabIndex);
							DOMBookmarks.appendChild(sessionWindow.DOMRoot);
							tabIndex++;

							var globalOffset = tabIndex;

							// Add window tabs
							for (let i in mozWindow.tabs)
							{
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
				}.bind(this));
			}
		}.bind(this));
	};

	SessionContainer.prototype.showHistorySession = function showHistorySession(sessionInfo)
	{
		var newSession = (this.selectedHistorySession != undefined) && (this.selectedHistorySession != sessionInfo);

		this.setUIState('history', (new Date(sessionInfo.lastSave)).toLocaleString(), -1);
		this.selectedHistorySession = sessionInfo;

		var tabIndex = 0;
		var windowIndex = 0;

		for (let key in sessionInfo.windows)
		{
			// Add window separator
			var sessionWindow = new HistoryWindow(sessionInfo.windows[key], windowIndex, tabIndex);
			this.DOMBookmarks.appendChild(sessionWindow.DOMRoot);
			tabIndex++;

			var globalOffset = tabIndex;

			// Add window tabs
			var windowTabs = sessionInfo.windows[key].tabs;
			for (var i in windowTabs)
			{
				var tab = windowTabs[i];
				tab.index = i | 0;
				var sessionTab = new HistoryTab(tab, globalOffset);
				this.DOMBookmarks.appendChild(sessionTab.DOMRoot);
				tabIndex++;
			}

			windowIndex++;
		}

		this.restoreScrollTop('history', newSession ? 0 : undefined);
	};

	SessionContainer.prototype.previewSession = function previewSession(sessionID)
	{
		var session = SessionSyncModel.bookmarks[sessionID];
		this.setUIState('restore', '', sessionID);

		BookmarkManager.getFolderBookmarks(session.id, function (marks) {

			WindowEvents.emit(document, 'SetPromiseSession', { sessionID: session.id, update: false } );

			var len = marks.length;
			for (var i = 0; i < len; i++)
			{
				var bookmark = new SessionBookmark(marks[i]);
				bookmark.setVirtualPosition(marks[i].index);

				SessionSyncModel.bookmarks[marks[i].id] = marks[i];
				this.SyncModel.setBookmark(marks[i].id, bookmark);
				this.DOMBookmarks.appendChild(bookmark.DOMRoot);
			}

			this.updateSessionInfo();
			this.restoreScrollTop('restore');

		}.bind(this));
	};

	SessionContainer.prototype.restoreScrollTop = function restoreScrollTop(state, forcedValue)
	{
		var scrollTop = AppConfig.get('state.scrollTop.' + state);
		this.DOMBookmarks.scrollTop = (forcedValue !== undefined) ? forcedValue : scrollTop;
	};

	SessionContainer.prototype.bookmarkCurrentTab = function bookmarkCurrentTab()
	{
		// Test if already saved in this session
		SessionManager.getCurrentTab(function(activeTab) {

			var sessionID = this.activeSessionID;
			var bookmarks = SessionSyncModel.bookmarks;

			for (var i in bookmarks)
			{
				if (bookmarks[i].parentId == sessionID && bookmarks[i].url == activeTab.url)
				{
					WindowEvents.emit(document, 'Notification', {
						message: 'Already Saved',
					});

					var bookmarkElem = this.SyncModel.getBookmark(bookmarks[i].id);
					bookmarkElem.highlight();
					return;
				}
			}

			// Add bookmark into the session

			BookmarkManager.createBookmarkFromTab(activeTab, sessionID)
			.then(function (mark) {
				var bookmark = new SessionBookmark(mark);

				SessionSyncModel.bookmarks[mark.id] = mark;
				this.SyncModel.setBookmark(mark.id, bookmark);
				this.DOMBookmarks.appendChild(bookmark.DOMRoot);

				bookmark.setVirtualPosition(mark.index);
				bookmark.highlight();

			}.bind(this));

		}.bind(this));
	};

	SessionContainer.prototype.saveHistorySession = function saveHistorySession(sessionIndex)
	{
		if (sessionIndex == undefined)
		{
			// When Save button from toolbar is pressed
			SessionManager.saveHistorySession(this.selectedHistorySession);
		}
		else
		{
			// Save from context menu
			SessionHistory.getHistorySession(sessionIndex, function (sessionInfo) {
				SessionManager.saveHistorySession(sessionInfo);
			});
		}
	};

	// *****************************************************************************
	// Public API

	exports.SessionContainer = SessionContainer;
});