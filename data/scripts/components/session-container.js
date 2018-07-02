define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	// App
	const { AppConfig } = require('../config');
	const { SessionBookmark, SessionBookmarkEvents, SessionTab,	SessionWindow, HistoryWindow, HistoryTab } = require('./session-bookmark');
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

	function SessionContainer(document)
	{
		var DomElem = HTMLCreator(document);

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

		WindowEvents.on(document, 'HistorySessionSave', this.saveHistorySession.bind(this));

		WindowEvents.on(document, 'HistorySessionRestore', function (index) {
			SessionHistory.getHistory(function (historySessions) {
				SessionManager.loadBookmarksNewWindow(historySessions[index].windows);
			});

		}.bind(this));

		WindowEvents.on(document, 'HistorySessionRestoreWindow', function (windowID) {
			if (this.SyncModel.state.session === 'history') {
				SessionManager.loadBookmarksNewWindow([this.selectedHistorySession.windows[windowID]]);
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
				SessionManager.loadBookmarksNewWindow(this.selectedHistorySession.windows);
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

		GlobalEvents.on('style.scale.bookmarks', function(size) {
			container.style.fontSize = size + 'px';
		});

		WindowEvents.on(document, 'SessionDescriptionChanged', function(sessionID) {
			if (this.activeSessionID == sessionID)
			{
				this.updateSessionInfo();
			}
		}.bind(this));

		// Tracked events

		SessionBookmarkEvents(document, bookmarks);

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
		if (AppConfig.isAddonContext()) {
			var trackedEvents = ['onUpdated', 'onCreated', 'onDetached', 'onMoved', 'onAttached', 'onRemoved'];
			trackedEvents.forEach(function (eventType) {
				browser.tabs[eventType].addListener(updateOnTabEvent);
			}.bind(this));
		}

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
					let sessionTab = new SessionTab(document, tab, 0, -1);
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
							var sessionWindow = new SessionWindow(document, mozWindow.id, windowIndex, tabIndex);
							DOMBookmarks.appendChild(sessionWindow.DOMRoot);
							tabIndex++;

							var globalOffset = tabIndex;

							// Add window tabs
							for (let i in mozWindow.tabs)
							{
								let tab = mozWindow.tabs[i];
								let sessionTab = new SessionTab(document, tab, globalOffset);
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

		for (let historyTabs of sessionInfo.windows)
		{
			// Add window separator
			var sessionWindow = new HistoryWindow(document, windowIndex, tabIndex);
			this.DOMBookmarks.appendChild(sessionWindow.DOMRoot);
			tabIndex++;

			var globalOffset = tabIndex;

			// Add window tabs
			for (var i in historyTabs)
			{
				var tab = historyTabs[i];
				tab.index = i | 0;
				var sessionTab = new HistoryTab(document, tab, globalOffset);
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
				var bookmark = new SessionBookmark(document, marks[i]);
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
				var bookmark = new SessionBookmark(document, mark);

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
			save(this.selectedHistorySession);
		}
		else
		{
			SessionHistory.getHistory(function (historySessions) {
				save(historySessions[sessionIndex]);
			});
		}

		function save(sessionInfo) {
			var windowCount = sessionInfo.windows.length;

			var windowID = 0;

			function onSave(bookmark) {
				WindowEvents.emit(document, 'SetPromiseSession', { sessionID: bookmark.id, edit: false, update: true } );
			}

			// save all history windows
			for (let tabs of sessionInfo.windows)
			{
				var date = new Date(sessionInfo.lastSave);
				var sessionTitle = date.toLocaleString() + ((windowCount > 1) ? (' #' + windowID) : '');
				windowID++;

				SessionManager.saveHistorySession({
					title: sessionTitle,
					tabs: tabs
				}, onSave);
			}
		}
	};

	// *****************************************************************************
	// Public API

	exports.SessionContainer = SessionContainer;
});