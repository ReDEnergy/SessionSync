'use strict';

// *****************************************************************************
// SDK Modules

const sp = require("sdk/simple-prefs");
const tabs = require("sdk/tabs");
const { data } = require('sdk/self');
const { Hotkey } = require('sdk/hotkeys');
const { PageMod } = require("sdk/page-mod");

// *****************************************************************************
// 3rd Party Modules

const protocol = require('3rd/protocol/lib/index');

// *****************************************************************************
// Custom Modules
const { WindowEvents, GlobalEvents } = require('./utils/global-events');


// *****************************************************************************
// Addon Config
var Config = (function() {

	var cfg = new Map();

	// Config options
	cfg.set('lang', 'en');
	cfg.set('addonID', 'Session-Sync-Add-on-ReD');

	return cfg;
})();


//
var AddonHotKey = (function AddonHotKey() {
	var KeyBind;

	function setShortcut() {
		if (KeyBind)
			KeyBind.destroy();

		var keys = sp.prefs.hotkey_special + '-' + String.fromCharCode(sp.prefs.hotkey_key);

		KeyBind = Hotkey({
			combo: keys,
			onPress: function() {
				GlobalEvents.emit('SessionSync-ToogleKey');
			}
		});
	};

	sp.on("hotkey_special", setShortcut);
	sp.on("hotkey_key", setShortcut);

	GlobalEvents.on('AddonDisabled', function destroy() {
		KeyBind.destroy();
	});

	GlobalEvents.on('AddonEnabled', function destroy() {
		setShortcut();
	});
})();


// Register custom about::session-sync page
var HomePage = (function HomePage() {
	const about_handler = protocol.about('session-sync', {
		onRequest: function(request, response) {
			response.uri = data.url('home/home.html');
		}
	});

	var styleSheet = PageMod({
		include: "about:session-sync",
		contentStyleFile: data.url("home/home.css")
	});

	GlobalEvents.on('AddonEnabled', function destroy() {
		about_handler.register();
	});

	GlobalEvents.on('AddonDisabled', function destroy() {
		about_handler.unregister();
		styleSheet.destroy();
	});

	sp.on("Instructions", function() {
		tabs.open('about:session-sync');
	});
})();

// Public API
exports.AppConfig = Config;

