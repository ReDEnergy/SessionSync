console.log('Session Sync 3.0.0');

browser.runtime.onStartup.addListener(function (startInfo) {
	console.log('Startup', startInfo);
});

browser.runtime.onInstalled.addListener(function (startInfo) {
	console.log('Installed', startInfo);
	if (startInfo.reason === 'update' || startInfo.reason === 'installed') {
		browser.tabs.create({
			url: 'data/home/home.html'
		});
	}
});

// Delete previous undo events
browser.storage.local.set({'undo.events' : []});