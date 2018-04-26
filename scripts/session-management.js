'use strict';

(function SessionManagement()
{
	browser.runtime.onMessage.addListener(function (message) {
		if (message.event == 'restore-windows') {
			message.windows.forEach (function (bookmarks) {
				if (bookmarks.length > 0)
				{
					browser.windows.create({})
					.then(function(mozWindow) {
						var windowID = mozWindow.id;
						var firstTabID = mozWindow.tabs[0].id;

						bookmarks.forEach(function (bookmark) {
							browser.tabs.create({
								url: bookmark.url,
								pinned: bookmark.pinned,
								windowId: windowID,
							}).then(function() {
								if (firstTabID) {
									browser.tabs.remove(firstTabID);
									firstTabID = undefined;
								}
							});
						});
					});
				}
			});
		}
	});
})();
