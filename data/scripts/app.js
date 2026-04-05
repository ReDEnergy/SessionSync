'use strict';

// ------------------------------------------------------------------------
// Modules

import { AppConfig } from './config';
import { WindowEvents, GlobalEvents } from './utils/global-events';
import { SessionSyncUI } from './session-sync-ui';
import { SessionSyncModel } from './components/session-sync-model';
import { BookmarkManager } from './session/bookmarks';

const sessionRoot = 'SessionSync';

// ------------------------------------------------------------------------
// API

const findSessionSync = function findSessionSync(callback)
{
	BookmarkManager.searchBookmarks({title: sessionRoot})
	.then(
		function success(bookmarks) {
			if (bookmarks.length == 0)
			{
				BookmarkManager.createBookmark({
					title: sessionRoot,
					parentId: 'menu________'
				}).then(callback, function error() {
					BookmarkManager.createBookmark({
						title: sessionRoot,
					}).then(callback);
				});
			}
			else
			{
				callback(bookmarks[0]);
			}
		},
		function fail() {
		}
	);
};

const listSessions = function listSessions()
{
	BookmarkManager.getFolderBookmarks(AppConfig.get('storageID'), function(sessions) {
		SessionSyncModel.sessions = sessions;
		WindowEvents.emit(document, 'ListSessions');
	});
};

export const init = function init()
{
	SessionSyncUI();

	findSessionSync(function(bookmark) {
		AppConfig.set('storageID', bookmark.id, function() {
			listSessions(true);
		});
	});

	AppConfig.init();

	GlobalEvents.on('update-sessions', listSessions.bind(null, false, false));
};
