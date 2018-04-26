define(function(require, exports) {
	'use strict';

	// ------------------------------------------------------------------------
	// Modules

	const { AppConfig } = require('./config');
	const { WindowEvents, GlobalEvents } = require('./utils/global-events');

	const { SessionSyncUI } = require('./session-sync-ui');
	const { SessionSyncModel } = require ('./components/session-sync-model');

	const { BookmarkManager } = require('./session/bookmarks');

	// ------------------------------------------------------------------------
	// API

	var findSessionSync = function findSessionSync(callback)
	{
		BookmarkManager.searchBookmarks({title: 'SessionSync'})
		.then(
			function success(bookmarks) {
				if (bookmarks.length == 0)
				{
					BookmarkManager.searchBookmarks({ title: 'Bookmarks Menu'})
					.then(function (menus) {
						BookmarkManager.createBookmark({
							title: 'SessionSync',
							parentId: menus.length > 0 ? menus[0].id : undefined
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

	var listSessions = function listSessions()
	{
		BookmarkManager.getFolderBookmarks(AppConfig.get('storageID'), function(sessions) {
			SessionSyncModel.sessions = sessions;
			WindowEvents.emit(document, 'ListSessions');
		});
	};

	var init = function init()
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

	// ------------------------------------------------------------------------
	// Events

	// ------------------------------------------------------------------------
	// Init

	// ------------------------------------------------------------------------
	// Module exports

	exports.init = init;
});
