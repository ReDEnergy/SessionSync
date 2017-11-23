'use strict';

// *****************************************************************************
// SDK Modules

const simple_pref = require("sdk/simple-prefs");
const tabs = require("sdk/tabs");
const self = require('sdk/self');
const { Hotkey } = require('sdk/hotkeys');
const { PageMod } = require("sdk/page-mod");
const { ActionButton } = require('sdk/ui/button/action');
const { storage: simpleStorage } = require('sdk/simple-storage');
const { browserWindows } = require("sdk/windows");

// *****************************************************************************
// 3rd Party Modules

// const protocol = require('./3rd/protocol/lib/index');

// *****************************************************************************
// Custom Modules

const JSUtils = require('./utils/general');
const { WindowEvents, GlobalEvents } = require('./utils/global-events');

// *****************************************************************************
// Addon Config

var VersionConfig = {
	showUpgradePage : true
};

var DefaultConfig = 
{
	addonID : 'Session-Sync',
	addonName : 'Session Sync',
	addonVersion : self.version,
	skipUpdateVersion : true,
	storageFolderID: -1,
	cssID : 'Session-Sync-Add-on-ReD',
	hotkey: {
		enabled: true,
		special: 'accel-shift',
		shortcutKey: 'S'
	},
	style: {
		addonToolbar: true,
		overlay: true,
		overlayOpacity: 25,
		contextMenuIcons: true,
		appPanelWidth: 800,
		appPanelHeight: 500,
		sessionListWidth: 200,
		toolbarScaleFactor: 12,
		headerbarScaleFactor: 18,
		sessionListScaleFactor : 12,
		bookmarkAreaScaleFactor : 14
	},
	bookmarkConfig: {
		clickNewTab: true, 
		savePinnedTabs: true,
		preservePinnedState: true,
		completeSession: false,
		editSessionOnSave: true,
	},
	autoSave: {
		enabled: true, 
		interval: 15, 
		savingSlots: 10,
		expireTimeHours: 48,	// hours
		sessions: [],
	},
	sessionCategories : []
};

var Config = (function() {

	var cfg = new Map();

	// Config options
	cfg.set('lang', 'en');
	cfg.set('cssID', DefaultConfig.cssID);

	// ------------------------------------------------------------------------
	// Run default addon configuration

	var initDefaultValue = function initDefaultValue(key, value, force)
	{
		if (simpleStorage[key] == undefined || force == true)
			simpleStorage[key] = value;
	};
	
	var init = function init()
	{
		// console.log(self);
		console.log('');
		console.log('------------------------------------------');
		console.log(DefaultConfig.addonName + ' v' + DefaultConfig.addonVersion);
		console.log('------------------------------------------');
		// console.log('Default config', DefaultConfig);
		// console.log('Active config', simpleStorage);

		// Do not update storage config if update from 2.0.1 to 2.0.2
		if (simpleStorage.addonVersion == '2.0.1' && DefaultConfig.addonVersion == '2.0.2')
		{
			VersionConfig.showUpgradePage = false;
			simpleStorage.addonVersion = DefaultConfig.addonVersion;
			return;
		}

		if (simpleStorage.addonVersion != DefaultConfig.addonVersion)
		{
			console.log('[Addon storage updated]');

			// Backup state
			var backup = [];
			if (simpleStorage.autoSave && simpleStorage.autoSave.sessions) {
				backup = simpleStorage.autoSave.sessions;
			}

			// Add missing data
			// TODO: should add/remove diferences not replace the entire storage
			// TODO: write UpdateAddonStorage();
			JSUtils.copyProperties(DefaultConfig, simpleStorage);

			// Restore state
			simpleStorage.autoSave.sessions = backup; 
		}

		// console.log('------------------------------------------');
		console.log('');
	};
	
	
	// ------------------------------------------------------------------------
	// Startup
	
	init();
	
	// ------------------------------------------------------------------------
	// Public data
	
	return {
		set : function setKey(key, value) {
			cfg.set(key, value);
		},
		get : function getKey(key) {
			return cfg.get(key);
		},
		storage : simpleStorage,
	};
})();


// ----------------------------------------------------------------------------
(function AddonHotKey() {

	var KeyBind;
	
	var initShortcut = function()
	{
		if (KeyBind)
			KeyBind.destroy();

		var hotkey = Config.storage.hotkey;

		if (hotkey.enabled == false) {
			return;
		}

		var keys = hotkey.special + '-' + hotkey.shortcutKey;

		KeyBind = Hotkey({
			combo: keys,
			onPress: function() {
				GlobalEvents.emit('ToggleUI');
			}
		});
	};

	GlobalEvents.on('cfg.hotkey', initShortcut);

	GlobalEvents.on('AddonDisabled', function destroy() {
		KeyBind.destroy();
	});

	GlobalEvents.on('AddonEnabled', function destroy() {
		initShortcut();
	});
})();


// --------------------------------------------------------------------
// Create addon toolbar button
(function SSyncActionButton() {
	
	var button = ActionButton({
		id: "syncbtn",
		label: "Session Sync",
		icon: {
			"16": self.data.url("images/icon16.png"),
			"32": self.data.url("images/icon32.png"),
			"64": self.data.url("images/icon64.png")
		},
		onClick: function(state) {
			GlobalEvents.emit('ToggleUI');
		}
	});
	
	GlobalEvents.on('AddonDisabled', function destroy() {
		button.destroy();
	});
	
})();

// ----------------------------------------------------------------------------
// Register custom about::session-sync page

(function HomePage() {
	
	const homePageURL = self.data.url('home/home.html');
	
	/*
	const homePageURL = 'about:session-sync';
	const about_handler = protocol.about(self.name, {
		onRequest: function(request, response) {
			response.uri = self.data.url('home/home.html');
		}
	});
	*/
	
	var styleSheet = PageMod({
		include: homePageURL,
		contentStyleFile: self.data.url('home/home.css'),
		// contentScriptFile: self.data.url('home/home.js'),
		// contentScriptWhen: 'end'
	});

	function oppenAddonPage()
	{
		var openned = false;
		// Swith to the homepage if it is already opened
		for (var i in tabs) {
			if ( tabs[i].url == homePageURL) {
				tabs[i].activate();
				openned = true;
			}
		}
		if (!openned) {
			tabs.open(homePageURL);
		}
	}
	
	// ------------------------------------------------------------------------
	// Events
		
	GlobalEvents.on('open-addon-page', oppenAddonPage);

	GlobalEvents.on('AddonEnabled', function destroy() {
		// about_handler.register();
	});

	GlobalEvents.on('AddonDisabled', function destroy() {
		// about_handler.unregister();
		styleSheet.destroy();
	});

	simple_pref.on("open-instructions", function() {
		GlobalEvents.emit('open-addon-page');
	});

	simple_pref.on("open-configuration", function() {
		GlobalEvents.emit('open-addon-config');
	});

})();


// *****************************************************************************
// Public API
exports.AppConfig = Config;
exports.VersionConfig = VersionConfig;

