define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	// Utils
	const { GlobalEvents } = require('./utils/global-events');

	// *****************************************************************************
	// API

	var Config = (function() {

		var localSettings = {};
		var isPanelUI = (document.body.clientWidth == 0);

		// ------------------------------------------------------------------------
		// API

		function getConfigValue(key, defaultValue)
		{
			browser.storage.local.get(key).then(function (obj) {
				if (Object.keys(obj).length === 0 && obj.constructor === Object && defaultValue != undefined)
				{
					set(key, defaultValue);
				}
				else
				{
					localSettings[key] = obj[key];
					GlobalEvents.emit(key, obj[key]);
				}
			});
		}

		var setupConfig = function setupConfig()
		{
			// Styling
			getConfigValue('style.panel.width', 800);
			getConfigValue('style.panel.height', 600);
			getConfigValue('style.sessions.list.width', 220);

			getConfigValue('style.scale.toolbar', 12);
			getConfigValue('style.scale.header', 18);
			getConfigValue('style.scale.sessions', 12);
			getConfigValue('style.scale.bookmarks', 14);

			// Session saving settings
			getConfigValue('session.save', {
				pinned: false,
				allWindows: false
			});

			// Management configuration
			getConfigValue('session.sorting', 'position-asc');
			getConfigValue('session.active.filter', '');
			getConfigValue('session.selected', undefined);

			// Bookmarks configuration
			getConfigValue('bookmark.click.new.tab', false);

			// General settings
			getConfigValue('detach.window', true);
			getConfigValue('context.menu.icons', true);
			getConfigValue('storageID');

			getConfigValue('hide.trash.can', true);
			getConfigValue('undo.events', []);
		};

		var set = function set(key, value, onSuccess)
		{
			browser.storage.local.set({ [key] : value })
			.then(function success() {
				localSettings[key] = value;
				GlobalEvents.emit(key, value);
				if (typeof onSuccess === 'function') {
					onSuccess();
				}
			}, function onError(error) {
				console.log(error);
			});
		};

		var get = function get(key)
		{
			if (localSettings[key] == undefined) {
				console.log('[ERROR] Settings key [' + key + '] was not found!');
			}
			return localSettings[key];
		};

		var initState = true;
		var isInitState = function isInitState()
		{
			if (initState == true) {
				initState = false;
				return true;
			}
			return false;
		};

		var isPanel = function isPanel()
		{
			return isPanelUI;
		};

		var isAddonContext = function isAddonContext()
		{
			return typeof browser === 'object';
		};

		// ------------------------------------------------------------------------
		// Startup

		var init = function init()
		{
			setupConfig();

			if (isAddonContext()) {
				browser.commands.getAll().
				then(function (commands) {
					GlobalEvents.emit('config.hotkey.init', commands);
				});
			}

			// console.log(localSettings);
		};

		if (isAddonContext()) {

			// console.log('');
			// console.log('------------------------------------------');

			// var manifest = browser.runtime.getManifest();
			// console.log(manifest);
			// console.log(manifest.name + ' v' + manifest.version);
			// console.log('------------------------------------------');

			setupConfig();

			GlobalEvents.on('hotkey.update', function (command) {
				browser.commands.update({
					name: command.name,
					shortcut: command.shortcut
				});
			});
		}

		// ------------------------------------------------------------------------
		// Public API

		return {
			set: set,
			get: get,
			init : init,
			isPanel: isPanel,
			isInitState: isInitState,
			isAddonContext: isAddonContext
		};
	})();

	// ------------------------------------------------------------------------
	// Events

	// ------------------------------------------------------------------------
	// Init

	// ------------------------------------------------------------------------
	// Module exports

	exports.AppConfig = Config;
});