define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	const { PubSub } = require('./3rd/pubsub');

	// Utils
	const { GlobalEvents } = require('./utils/global-events');

	// *****************************************************************************
	// API

	var Config = (function() {

		var initState = true;
		var initConfig = true;
		var localSettings = {};
		var configEvents = new PubSub();
		var isPanelUI = (document.body.clientWidth == 0);

		// ------------------------------------------------------------------------
		// API

		function getConfigValue(key, defaultValue)
		{
			if (initConfig && localSettings[key] == undefined) {
				localSettings[key] = defaultValue;
				return;
			}

			browser.storage.local.get(key).then(function (obj) {
				if (obj.hasOwnProperty(key))
				{
					// console.log('[LocalStorage][Read]', key, obj[key]);
					localSettings[key] = obj[key];
					configEvents.publish(key, obj[key]);
				}
				else
				{
					// console.log('Not found [LocalStorage][Set]', key, defaultValue);
					browser.storage.local.set({ [key] : defaultValue })
					.then(function success() {
						localSettings[key] = defaultValue;
						configEvents.publish(key, defaultValue);
					});
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

			getConfigValue('state.scrollTop.current', 0);
			getConfigValue('state.scrollTop.restore', 0);
			getConfigValue('state.scrollTop.history', 0);

			// Session saving settings
			getConfigValue('session.save', {
				pinned: false,
				allWindows: true
			});

			// Management configuration
			getConfigValue('session.view', undefined);
			getConfigValue('session.sorting', 'position-asc');
			getConfigValue('session.active.filter', '');
			getConfigValue('session.selected', null);
			getConfigValue('session.history.selected', null);
			getConfigValue('services.favicon.enabled', true);

			// Bookmarks configuration
			getConfigValue('bookmark.click.newTab', false);
			getConfigValue('bookmark.middleClick.newTab', true);
			getConfigValue('restore.lazy.loading', true);
			getConfigValue('restore.reverse.order', false);

			// General settings
			getConfigValue('context.menu.icons', true);

			getConfigValue('hide.trash.can', true);
			getConfigValue('undo.events', []);
		};

		var set = function set(key, value, onSuccess)
		{
			if (typeof value != 'object' && localSettings[key] == value)
			{
				if (typeof onSuccess === 'function') {
					onSuccess();
				}
				return;
			}

			browser.storage.local.set({ [key] : value })
			.then(function success() {
				localSettings[key] = value;
				// console.log('[Change config]', key, value);
				configEvents.publish(key, value);
				if (typeof onSuccess === 'function') {
					onSuccess();
				}
			}, function onError(error) {
				console.log(error);
			});
		};

		var get = function get(key)
		{
			if (localSettings[key] === undefined) {
				console.log('[ERROR] Settings key [' + key + '] was not found!');
			}
			// console.log(key, localSettings[key]);
			return localSettings[key];
		};

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

		var devMode = function devMode()
		{
			return false;
		};

		var isAddonContext = function isAddonContext()
		{
			return typeof browser === 'object';
		};

		var onChange = function onChange(topic, callback) {
			configEvents.subscribe(topic, callback)
		}

		// ------------------------------------------------------------------------
		// Startup

		var init = function init()
		{
			setupConfig();

			if (isAddonContext()) {
				browser.commands.getAll().
				then(function (commands) {
					configEvents.publish('config.hotkey.init', commands);
				});
			}
		};

		if (isAddonContext()) {

			// console.log('');
			// console.log('------------------------------------------');

			// var manifest = browser.runtime.getManifest();
			// console.log(manifest);
			// console.log(manifest.name + ' v' + manifest.version);
			// console.log('------------------------------------------');


			setupConfig();
			initConfig = false;

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
			onChange: onChange,
			devMode: devMode,
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