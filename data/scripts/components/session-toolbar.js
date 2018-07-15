define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	// App
	const { AppConfig } = require('../config');

	// Utils
	const { HTMLCreator } = require('../utils/dom');
	const { WindowEvents, GlobalEvents } = require('../utils/global-events');
	const DOMComponent = require('../utils/components');

	// *****************************************************************************
	// API

	/*
	* Command bar
	*/

	function SessionToolbar()
	{
		// Create DomHealper
		var DomElem = HTMLCreator();

		// ------------------------------------------------------------------------
		// Create UI

		var toolbar = DomElem('div', {class: 'session-toolbar'});

		// ------------------------------------------------------------------------
		// List settings

		var container = DomElem('div', {class: 'session-selector'});
		container.style.width = AppConfig.get('style.scale.bookmarks') + 'px';

		var activeBtn = DomElem('div', {class: 'button active-session'});
		activeBtn.textContent = '';

		var syncBtn = DomElem('div', {class: 'button sync'});
		syncBtn.textContent = 'Sessions';

		var historyBtn = DomElem('div', {class: 'button history'});
		historyBtn.textContent = 'History';

		container.appendChild(activeBtn);
		container.appendChild(syncBtn);
		container.appendChild(historyBtn);
		toolbar.appendChild(container);

		// ------------------------------------------------------------------------
		// Session toolbar menu

		var sessionMenu = this.createMenu();
		toolbar.appendChild(sessionMenu);

		var sessionDate = DomElem('div', {class: 'session-date'});
		toolbar.appendChild(sessionDate);

		// ------------------------------------------------------------------------
		// Events

		WindowEvents.on(document, 'SetSessionDate', function(date) {
			sessionDate.textContent = (new Date(date)).toLocaleString();
		});

		activeBtn.addEventListener('click', function() {
			WindowEvents.emit(document, 'ShowCurrentSession');
		});

		syncBtn.addEventListener('click', function() {
			WindowEvents.emit(document, 'ShowSyncList', { update: true });
		});

		historyBtn.addEventListener('click', function() {
			WindowEvents.emit(document, 'ShowHistoryList');
		});

		GlobalEvents.on('style.sessions.list.width', function(width) {
			container.style.width = width + 'px';
		});

		GlobalEvents.on('style.scale.toolbar', function(value) {
			toolbar.style.fontSize = value + 'px';
		});

		// ------------------------------------------------------------------------
		// Public properties

		this.document = document;
		this.DOMRoot = toolbar;
	}

	SessionToolbar.prototype.createMenu = function createMenu()
	{
		var DomElem = HTMLCreator();

		// ------------------------------------------------------------------------
		// UI - SessionContainer menu

		var menu = DomElem('div', {class: 'menu-bar'});

		var ActionButton = function actionButton(options)
		{
			var button = DomElem('div', {class: 'button ' + options.className});
			button.setAttribute('tooltip', options.tooltip);

			button.addEventListener('click', function (e) {
				WindowEvents.emit(document, options.event, e);
			});

			return button;
		};

		var save = ActionButton({tooltip: 'Save session', className: 'save', event: 'MenuSaveSession' });
		var add = ActionButton({tooltip: 'Add current tab', className: 'add', event: 'MenuAddCurrentTab' });
		var restore = ActionButton({tooltip: 'Restore', className: 'restore', event: 'MenuRestoreClick' });
		var restoreW = ActionButton({tooltip: 'Restore in new window', className: 'restore-new-win', event: 'MenuRestoreNewWindow' });
		var mergeSession = ActionButton({tooltip: 'Merge sessions', className: 'merge-sessions', event: 'MenuMergeSessions' });
		var overwriteSession = ActionButton({tooltip: 'Overwrite session', className: 'replace-session', event: 'MenuReplaceSession' });

		var separator1 = DomElem('div', {class: 'separator'});
		var separator2 = DomElem('div', {class: 'separator'});
		var saveConfig = DomElem('div', {class: 'save-config'});

		// Pin tabs action

		var saveCfgKey = 'session.save';
		var saveCfg = AppConfig.get(saveCfgKey);
		var cfgSavePinned = new DOMComponent.ToggleSwitch({
			state: saveCfg ? saveCfg.pinned : false,
			tooltip: 'Save pinned tabs',
			attribute: 'pin',
			onState: '',
			offState: '',
			callback: function(value) {
				saveCfg.pinned = value;
				AppConfig.set(saveCfgKey, saveCfg);
			}
		});
		saveConfig.appendChild(cfgSavePinned.DOMRoot);

		var cfgAllWindows = new DOMComponent.ToggleSwitch({
			state: saveCfg ? saveCfg.allWindows : false,
			tooltip: 'Show all windows',
			attribute: 'windows',
			onState: '',
			offState: '',
			callback: function(value) {
				saveCfg.allWindows = value;
				AppConfig.set(saveCfgKey, saveCfg);
				WindowEvents.emit(document, 'UpdateCurrentSession');
			}
		});
		saveConfig.appendChild(cfgAllWindows.DOMRoot);

		menu.appendChild(restore);
		menu.appendChild(restoreW);
		menu.appendChild(separator1);
		menu.appendChild(mergeSession);
		menu.appendChild(overwriteSession);
		menu.appendChild(separator2);
		menu.appendChild(add);
		menu.appendChild(save);
		menu.appendChild(saveConfig);

		// ------------------------------------------------------------------------
		// Events

		// Tooltip events
		menu.addEventListener('mouseover', function(e) {
			var tooltipMsg = e.target.getAttribute('tooltip');
			if (tooltipMsg) {
				WindowEvents.emit(document, 'ShowTooltip', {
					node: e.target,
					message: tooltipMsg
				});
			} else {
				WindowEvents.emit(document, 'HideTooltip');
			}
		});

		menu.addEventListener('mouseleave', function() {
			WindowEvents.emit(document, 'HideTooltip');
		});

		// ------------------------------------------------------------------------
		// Data

		return menu;
	};

	// *****************************************************************************
	// Public API

	exports.SessionToolbar = SessionToolbar;
});