'use strict';

// *****************************************************************************
// Custom Modules

import { PubSub } from './3rd/pubsub';

// Utils
import { GlobalEvents } from './utils/global-events';

// *****************************************************************************
// API

const Config = (function () {

	const defaults = {
		'style.panel.width': 800,
		'style.panel.height': 600,
		'style.sessions.list.width': 220,

		'style.scale.toolbar': 12,
		'style.scale.header': 18,
		'style.scale.sessions': 12,
		'style.scale.bookmarks': 14,

		'state.scrollTop.current': 0,
		'state.scrollTop.restore': 0,
		'state.scrollTop.history': 0,

		'session.save': {
			pinned: false,
			allWindows: true
		},

		'session.view': undefined,
		'session.sorting': 'position-asc',
		'session.active.filter': '',
		'session.selected': null,
		'session.history.selected': null,
		'services.favicon.enabled': true,

		'bookmark.click.newTab': false,
		'bookmark.middleClick.newTab': true,
		'restore.lazy.loading': true,
		'restore.reverse.order': false,

		'context.menu.icons': true,
		'trashcan.hide': true,
		'trashcan.hide-count': 0,
		'undo.events': [],
		'troubleshooting': false,
		'theme.toolbar.grayscale': false
	};

	var initState = true;
	var initConfig = true;
	var localSettings = defaults;
	var configEvents = new PubSub();
	var isPanelUI = (typeof document !== 'undefined' && document.body) ? (document.body.clientWidth == 0) : false;

	// ------------------------------------------------------------------------
	// API

	var setupConfig = function setupConfig() {
		browser.storage.local.get(null).then(function (obj) {
			console.log(obj);
			for (let key in defaults) {
				if (obj.hasOwnProperty(key)) {
					localSettings[key] = obj[key];
				} else {
					localSettings[key] = defaults[key];
				}
				configEvents.publish(key, localSettings[key]);
			}
			initConfig = false;
			configEvents.publish('config.init', localSettings);
		});
	};

	var set = function set(key, value, onSuccess) {
		if (typeof value != 'object' && localSettings[key] == value) {
			if (typeof onSuccess === 'function') {
				onSuccess();
			}
			return;
		}

		browser.storage.local.set({ [key]: value })
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

	var get = function get(key) {
		if (localSettings[key] === undefined) {
			console.log('[ERROR] Settings key [' + key + '] was not found!');
		}
		// console.log(key, localSettings[key]);
		return localSettings[key];
	};

	var isInitState = function isInitState() {
		if (initState == true) {
			initState = false;
			return true;
		}
		return false;
	};

	var isPanel = function isPanel() {
		return isPanelUI;
	};

	var devMode = function devMode() {
		return false;
	};

	var isAddonContext = function isAddonContext() {
		return typeof browser === 'object';
	};

	var onChange = function onChange(topic, callback) {
		configEvents.subscribe(topic, callback)
	};

	// ------------------------------------------------------------------------
	// Startup

	var init = function init() {
		setupConfig();
		console.log(localSettings);

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
		init: init,
		onChange: onChange,
		devMode: devMode,
		isPanel: isPanel,
		isInitState: isInitState,
		isAddonContext: isAddonContext
	};
})();

export const AppConfig = Config;