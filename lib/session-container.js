'use strict';

// *****************************************************************************
// SDK Modules

const { browserWindows } = require("sdk/windows");
const privateBrowsing = require("sdk/private-browsing")
const { getFavicon } = require("sdk/places/favicon");
const { modelFor } = require("sdk/model/core");
const clipboard = require("sdk/clipboard");
const tabs = require("sdk/tabs");
const timers = require("sdk/timers");

// *****************************************************************************
// Custom Modules

// App
const { AppConfig } = require('./config');
const { SessionBookmark, SessionBookmarkEvents, 
		SessionTab, SessionWindow,
		HistoryWindow, HistoryTab } = require('./session-bookmark');
const { SessionSyncModel } = require('./session-sync-model');

// Utils
const { HTMLCreator } = require('./utils/dom');
const { EventDestroyer } = require('./utils/event-destroyer');
const { WindowEvents, GlobalEvents } = require('./utils/global-events');

// Components
const { MozBookmark } = require('./session/moz-bookmark');
const { BookmarkManager } = require('./session/bookmarks');
const { SessionManager } = require('./session/management');

// *****************************************************************************
// API

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
	container.style.fontSize = AppConfig.storage.style.bookmarkAreaScaleFactor + 'px';
		
	// TODO: backup code and remove
	// var save = DomElem('div', {class: 'save-session'});
	// save.setAttribute('tooltip', 'Save Session');	
	// container.appendChild(save);

	var bookmarks = DomElem('div', {class: 'bookmarks'});
	container.appendChild(bookmarks);

	// ------------------------------------------------------------------------
	// Browser events
	
	var onTabEvent = function onTabEvent(mozTab)
	{
		if (this.isActiveSessionShown()) {
			if (AppConfig.storage.bookmarkConfig.completeSession) {
				this.showCurrentSession();
			} else {
				var mozWindow = modelFor(this.document.ownerGlobal);
				if (mozWindow == browserWindows.activeWindow)
				{
					this.showCurrentSession();
				} 
			}
		}
	}.bind(this);

	var onWindowEvent = function onWindowEvent(mozWindow) {
		if (this.isActiveSessionShown() && AppConfig.storage.bookmarkConfig.completeSession) {
			this.showCurrentSession();
		}
	}.bind(this);

	tabs.on('ready', onTabEvent);
	tabs.on('close', onTabEvent);
	browserWindows.on('open', onWindowEvent);
	browserWindows.on('close', onWindowEvent);
	
	WindowEvents.on(document, 'InstanceDestroy', function() {
		tabs.off('ready', onTabEvent);
		tabs.off('close', onTabEvent);
		browserWindows.off('open', onWindowEvent);
		browserWindows.off('close', onWindowEvent);
	});

	// ------------------------------------------------------------------------
	// Methods

	// TODO: move to management
	var saveActiveSession = function saveActiveSession()
	{
		if (isValidSessionID(this.activeSessionID))
			return;
		
		this.updateWrapper(function() {
			
			var sessionCount = 1;
			var folderID;
			if (privateBrowsing.isPrivate(browserWindows.activeWindow) || AppConfig.storage.bookmarkConfig.completeSession == false)
			{
				var sessionTitle = (new Date()).toLocaleString(); 
				// save just the current window session
				folderID = SessionManager.saveWindowSession(browserWindows.activeWindow, sessionTitle);
			} else {
				// Get all non private windows
				var mozWindows = [];
				for (let mozWindow of browserWindows)
				{
					if (!privateBrowsing.isPrivate(mozWindow))
					{
						mozWindows.push(mozWindow);
					}
				}
				
				sessionCount = mozWindows.length;
				
				// Save windows as separate sessions
				var date = new Date();
				for (var i = 0; i < sessionCount; i++) {
					var sessionTitle = date.toLocaleString() + ((sessionCount > 1) ? (' #' + (i + 1)) : '');
					folderID = SessionManager.saveWindowSession(mozWindows[i], sessionTitle);
				}
			}

			WindowEvents.emit(this.document, 'SetPromiseSession', { 
				sessionID: folderID, 
				edit: sessionCount == 1 && AppConfig.storage.bookmarkConfig.editSessionOnSave,
			});

		}.bind(this));
	}.bind(this);
	
	var saveHistorySession = function saveHistorySession()
	{
		this.updateWrapper(function() {
			
			var folderID;
			var sessionInfo = SessionSyncModel.getModel(this.document).state['activeContainer']; 
			var windowCount = sessionInfo.sessions.length; 
			
			var windowID = 0;
			// save all history windows
			for (let session of sessionInfo.sessions)
			{
				var date = new Date(sessionInfo.lastSave);
				var sessionTitle = date.toLocaleString() + ((windowCount > 1) ? (' #' + windowID) : '');
				windowID++;
				
				// create storage folder 
				folderID = BookmarkManager.createFolder(AppConfig.storage.storageFolderID, sessionTitle);
				if (folderID)
				{
					var savedTabs = {};
					for (var i in session)
					{
						var tab = session[i];
						if (tab.isPinned && !AppConfig.storage.bookmarkConfig.savePinnedTabs)
						{
							continue;
						}
			
						// prevent duplicate tabs from saving
						if (savedTabs[tab.url] == undefined)
						{
							savedTabs[tab.url] = true;
							var bookmark = BookmarkManager.addBookmark({
								url: tab.url,
								title: tab.title,
								parent: folderID
							});
			
							if (tab.isPinned && AppConfig.storage.bookmarkConfig.preservePinnedState)
							{
								bookmark.setAnnotation('pinned', 'yes');
							}
						}
					}
				}				
			}

			WindowEvents.emit(this.document, 'SetPromiseSession', { sessionID: folderID, edit: false } );

		}.bind(this));
	}.bind(this);
	
	var restoreHistorySession = function restoreHistorySession(index)
	{
		var sessionInfo;
		var windowIndex = 0;
		
		if (index && AppConfig.storage.autoSave.sessions[index]) {
			sessionInfo = AppConfig.storage.autoSave.sessions[index];
		} else {
			sessionInfo = SessionSyncModel.getModel(document).state['activeContainer'];
		}
		
		function restoreWindow() {
			if (windowIndex < sessionInfo.sessions.length) {
				SessionManager.loadTabsNewWindow(sessionInfo.sessions[windowIndex], restoreWindow);
				windowIndex++;
			}
		}
		restoreWindow();
	};
	
	// ------------------------------------------------------------------------
	// User events
	
	function isValidSessionID(ID)
	{
		return (ID > 0 && SessionSyncModel.bookmarks[ID] !== undefined && 
				SessionSyncModel.bookmarks[ID].parent == AppConfig.storage.storageFolderID);
	}
	
	WindowEvents.on(document, 'HistorySessionRestore', restoreHistorySession);

	WindowEvents.on(document, 'MenuRestoreClick', function() {
		if (isValidSessionID(this.activeSessionID)) {
			SessionManager.restoreSession(this.activeSessionID);
		}
		
		// history session 
		if (this.activeSessionID === -1) {
			restoreHistorySession();
		}
		
	}.bind(this));
	
	WindowEvents.on(document, 'MenuRestoreNewWindow', function() {
		if (isValidSessionID(this.activeSessionID)) {
			SessionManager.restoreNewWindow(this.activeSessionID);
		}
	}.bind(this));
	
	WindowEvents.on(document, 'MenuMergeSessions', function(e) {
		if (isValidSessionID(this.activeSessionID)) {
			WindowEvents.emit(document, 'ConfirmBox-Open', {
				event: e,
				message: 'Merge selected session and active window seesion?',
				callback: function() {
					this.mergeSessions();
				}.bind(this) 
			});
		}
	}.bind(this));
	
	WindowEvents.on(document, 'MenuReplaceSession', function(e) {
		if (isValidSessionID(this.activeSessionID)) {
			WindowEvents.emit(document, 'ConfirmBox-Open', {
				event: e,
				message: 'Replace selected session with active window session?',
				callback: function() {
					this.replaceSession();
				}.bind(this) 
			});
		}		
		if (isValidSessionID(this.activeSessionID)) {
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
		
		// active session 
		if (this.activeSessionID === 0) {
			saveActiveSession();
		}
		
		// history session 
		if (this.activeSessionID === -1) {
			saveHistorySession();
		}
		
	}.bind(this));

	WindowEvents.on(document, 'SessionContainer-RefreshUI', function() {
		if (this.isActiveSessionShown()) {
			this.showCurrentSession();
		}
	}.bind(this));

	WindowEvents.on(document, 'UIToggledOff', function() {
		this.activeUI = false;
	}.bind(this));

	WindowEvents.on(document, 'UIToggledOn', function() {
		this.activeUI = true;
		if (this.activeSessionID === 0) {
			this.showCurrentSession();
		}
	}.bind(this));
	
	WindowEvents.on(document, 'EditSelectedSession', function(){
		if (isValidSessionID(this.activeSessionID)) {
			WindowEvents.emit(document, 'SessionFolderEditWidget-Invoke', {
				context : this.activeSessionID,
				fields : {
					title : SessionSyncModel.bookmarks[this.activeSessionID].title,
					desc : SessionSyncModel.bookmarks[this.activeSessionID].getDescription() 
				}
			});
		}
	}.bind(this));
	
	WindowEvents.on(document, 'ShowCurrentSession', this.showCurrentSession.bind(this));

	WindowEvents.on(document, 'ShowHistorySession', this.showHistorySession.bind(this));

	WindowEvents.on(document, 'ViewSession', this.previewSession.bind(this));
	
	GlobalEvents.on('cfg.style.bookmarkAreaScaleFactor', function(size) {
		container.style.fontSize = size + 'px';
	});
	
	WindowEvents.on(document, 'SessionDescriptionChanged', function(sessionID) {
		if (this.activeSessionID == sessionID)
		{
			this.updateSessionDescription();
		}
	}.bind(this));

	SessionBookmarkEvents(document, bookmarks);
	
	// ------------------------------------------------------------------------
	// Public data

	this.activeUI = false;
	this.document = document; 
	this.DOMBookmarks = bookmarks;
	this.DOMRoot = container;
	
	this.SyncModel = SessionSyncModel.getModel(document);
};

SessionContainer.prototype.updateWrapper = function(callback)
{
	GlobalEvents.emit('lock-observer');
	WindowEvents.emit(this.document, 'SetPromiseSession', { sessionID: this.activeSessionID } );
	
	var shouldUpdate = callback();

	GlobalEvents.emit('unlock-observer');
	if (shouldUpdate != false)
		GlobalEvents.emit('update-sessions');	
};

SessionContainer.prototype.clearList = function clearList()
{
	this.DOMBookmarks.textContent = "";
};

SessionContainer.prototype.updateSessionDescription = function updateSessionDescription()
{
	var session = SessionSyncModel.bookmarks[this.activeSessionID];
	var value = session.description ? session.description : session.title;
	WindowEvents.emit(this.document, 'SetSessionDescription', value);
	WindowEvents.emit(this.document, 'SetSessionDate', session.date / 1000);
};

SessionContainer.prototype.isActiveSessionShown = function isActiveSessionShown() {
	return (this.activeUI && this.activeSessionID === 0);
};

SessionContainer.prototype.showCurrentSession = function showCurrentSession()
{
	WindowEvents.emit(this.document, 'SetUIState', {'session': 'current'});

	this.clearList();
	this.activeSessionID = 0;
	WindowEvents.emit(this.document, 'SetSessionDescription', 'Browser tabs');

	var mozWindow = modelFor(this.document.ownerGlobal);
	
	// Get non-private windows
	if (privateBrowsing.isPrivate(mozWindow) || AppConfig.storage.bookmarkConfig.completeSession == false)
	{
		for (var i in mozWindow.tabs)
		{
			var tab = mozWindow.tabs[i];
			var sessionTab = new SessionTab(this.document, tab, i, 0, -1);
			this.DOMBookmarks.appendChild(sessionTab.DOMRoot);
		}
	} else {
		// Get non-private windows
		var tabIndex = 0;
		var windowID = 0;		// key in the browserWindows array
		var windowIndex = 0;	// display index in UI - ignores private windows
		var mozWindows = [];
		for (let mozWindow of browserWindows)
		{
			if (!privateBrowsing.isPrivate(mozWindow))
			{
				// Add window separator
				var sessionWindow = new SessionWindow(this.document, windowID, windowIndex, tabIndex);
				this.DOMBookmarks.appendChild(sessionWindow.DOMRoot);
				tabIndex++;
				
				var globalOffset = tabIndex;  
	
				// Add window tabs
				for (var i in mozWindow.tabs)
				{
					var tab = mozWindow.tabs[i];
					var sessionTab = new SessionTab(this.document, tab, i, globalOffset, windowID);
					this.DOMBookmarks.appendChild(sessionTab.DOMRoot);
					tabIndex++;
				}

				windowIndex++;
			}
	
			windowID++;
		}
	}
};

SessionContainer.prototype.showHistorySession = function showHistorySession(sessionInfo)
{
	WindowEvents.emit(this.document, 'SetUIState', {'session': 'history'});

	this.clearList();
	this.activeSessionID = -1;
	WindowEvents.emit(this.document, 'SetSessionDescription', new Date(sessionInfo.lastSave).toLocaleFormat());

	var tabIndex = 0;
	var windowIndex = 0;
	SessionSyncModel.getModel(this.document).state['activeContainer'] = sessionInfo; 
	
	for (let historyTabs of sessionInfo.sessions)
	{
		// Add window separator
		var sessionWindow = new HistoryWindow(this.document, windowIndex, tabIndex);
		this.DOMBookmarks.appendChild(sessionWindow.DOMRoot);
		tabIndex++;
		
		var globalOffset = tabIndex;  

		// Add window tabs
		for (var i in historyTabs)
		{
			var tab = historyTabs[i];
			tab.index = i | 0;
			var sessionTab = new HistoryTab(this.document, tab, globalOffset);
			this.DOMBookmarks.appendChild(sessionTab.DOMRoot);
			tabIndex++;
		}

		windowIndex++;
	}
};

SessionContainer.prototype.previewSession = function previewSession(sessionID)
{
	var session = SessionSyncModel.bookmarks[sessionID];
	if ((session instanceof MozBookmark) == false)
	{
		console.log('[Container][MozBookmark]', session);
		return;
	}

	WindowEvents.emit(this.document, 'SetUIState', {'session': 'restore'});
	
	session.getDescription();

	this.activeSessionID = sessionID;
 	
	// Cache this
	var options =
	{
		type: BookmarkManager.QUERY_RESULT_TYPE.URI,
		folder: session.id,
		properties : {
			itemId : 'id',
			title : 'title',
			uri : 'url',
			bookmarkIndex: 'position',
			dateAdded: 'date'
		}
	};
	
	this.clearList();

	BookmarkManager.getFolderBookmarks(options).then( function (marks) {
		
		var len = marks.length;
		for (var i = 0; i < len; i++)
		{
			var bookmark = new SessionBookmark(this.document, marks[i]);
			bookmark.setVirtualPosition(i);
			SessionSyncModel.bookmarks[marks[i].id] = marks[i];
			this.SyncModel.setBookmark(marks[i].id, bookmark);

			this.DOMBookmarks.appendChild(bookmark.DOMRoot);
		}
		
		this.updateSessionDescription();
		
	}.bind(this));

	WindowEvents.emit(this.document, 'SetPromiseSession', { sessionID: session.id } );
};

// TODO - move these 3 methods to SessionManager
// Append current tab to the selected session
SessionContainer.prototype.bookmarkCurrentTab = function bookmarkCurrentTab()
{
	var sessionID = this.activeSessionID;
	var addTab = true;

	// Test if already saved in this session
	var bookmarks = SessionSyncModel.bookmarks;
	for (var i in bookmarks)
	{
		if (bookmarks[i].parent == sessionID && bookmarks[i].url == tabs.activeTab.url)
		{
			WindowEvents.emit(this.document, 'Notification', {
				message: 'Already Saved',
			});
			return;	
		}
	}
	
	// Add bookmark into the session
	this.updateWrapper(function() {
		BookmarkManager.addBookmark({
			url: tabs.activeTab.url,
			title: tabs.activeTab.title,
			parent: sessionID
		});
	});
};

SessionContainer.prototype.replaceSession = function replaceSession()
{
	var sessionID = this.activeSessionID;
	
	this.updateWrapper(function() {

		var k = 0;
		var toRemove = []; 
		var bookmarks = SessionSyncModel.bookmarks;
		for (var i in bookmarks)
		{			
			// Remove all bookmarks from the current session
			if (bookmarks[i].parent == sessionID)
				toRemove.push(i);
		}

		SessionSyncModel.deleteBookmarkList(toRemove, sessionID);

		// Add new bookmarks
		var ctabs = browserWindows.activeWindow.tabs;
		var added = [];
		for (var i in ctabs) {
			var url = SessionManager.getTabURL(ctabs[i]);
			if (added[url] == undefined)
			{
				added[url] = true;
				BookmarkManager.addBookmark({
					url: url,
					title: ctabs[i].title,
					parent: sessionID
				});
			}
		}		
	});	
};

SessionContainer.prototype.mergeSessions = function mergeSessions()
{
	var toSave = [];

	// Exclude all pages that are already saved
	var ctabs = browserWindows.activeWindow.tabs;
	var len = ctabs.length;
	for (var i = 0; i < len; i++)
	{
		var url = SessionManager.getTabURL(ctabs[i]);
		toSave[url] = ctabs[i];  
	}
	
	var sessionID = this.activeSessionID;

	// Exclude all pages that are already saved
	SessionSyncModel.bookmarks.forEach(function (bookmark) {
		if (bookmark.parent == sessionID)
			toSave[bookmark.url] = undefined;
	});		
	
	// Add new bookmarks
	var update = false;
	
	this.updateWrapper(function() {
		for (var key in toSave) {
			if (toSave[key]) {
				update = true;
				var url = SessionManager.getTabURL(toSave[key]);
				BookmarkManager.addBookmark({
					url: url,
					title: toSave[key].title,
					parent: sessionID
				});
			}
		}
		return update;
	});	
};

SessionContainer.prototype.destroy = function destroy()
{
};

// *****************************************************************************
// Public API

exports.SessionContainer = SessionContainer;