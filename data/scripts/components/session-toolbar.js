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

	function createToggleButton(document, options)
	{
		var DomElem = HTMLCreator(document);

		var state = options.state;

		var entry = DomElem('div', {class: 'toggle-btn'});
		var title = DomElem('div', {class: 'title'});
		title.textContent = options.description;

		var button = DomElem('div', {class: 'label'});
		button.setAttribute('state', state);
		button.textContent = state ? options.onState : options.offState;

		entry.appendChild(title);
		entry.appendChild(button);

		entry.addEventListener('click', function() {
			state = !state;
			options.callback(state);
			button.setAttribute('state', state);
			button.textContent = state ? options.onState : options.offState;
		});

		return entry;
	}

	/*
	* Command bar
	*/

	function SessionToolbar(document)
	{
		// Create DomHealper
		var DomElem = HTMLCreator(document);

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

		var sessionMenu = this.createMenu(document);
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

	SessionToolbar.prototype.createMenu = function createMenu(document)
	{
		var DomElem = HTMLCreator(document);

		// ------------------------------------------------------------------------
		// UI - SessionContainer menu

		var menu = DomElem('div', {class: 'menu-bar'});

		var save = DomElem('div', {class: 'button save'});
		save.setAttribute('tooltip', 'Save session');

		var add = DomElem('div', {class: 'button add'});
		add.setAttribute('tooltip', 'Add current tab');

		var restore = DomElem('div', {class: 'button restore'});
		restore.setAttribute('tooltip', 'Restore');

		var restoreW = DomElem('div', {class: 'button restore-new-win'});
		restoreW.setAttribute('tooltip', 'Restore in new window');

		var mergeSession = DomElem('div', {class: 'button merge-sessions'});
		mergeSession.setAttribute('tooltip', 'Merge sessions');

		var overwriteSession = DomElem('div', {class: 'button replace-session'});
		overwriteSession.setAttribute('tooltip', 'Overwrite session');

		var separator1 = DomElem('div', {class: 'separator'});
		var separator2 = DomElem('div', {class: 'separator'});

		var saveConfig = DomElem('div', {class: 'save-config'});

		// Pin tabs action

		var saveCfgKey = 'session.save';
		var saveCfg = AppConfig.get(saveCfgKey);
		var cfgSavePinned = new DOMComponent.ToggleSwitch(document, {
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

		var cfgAllWindows = new DOMComponent.ToggleSwitch(document, {
			state: saveCfg ? saveCfg.allWindows : false,
			tooltip: 'Show all windows',
			attribute: 'windows',
			onState: '',
			offState: '',
			callback: function(value) {
				saveCfg.allWindows = value;
				AppConfig.set(saveCfgKey, saveCfg);
				WindowEvents.emit(document, 'SessionContainer-RefreshUI');
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

		restore.addEventListener('click', function() {
			WindowEvents.emit(document, 'MenuRestoreClick');
		});

		restoreW.addEventListener('click', function() {
			WindowEvents.emit(document, 'MenuRestoreNewWindow');
		});

		// Merge sessions
		mergeSession.addEventListener('click', function(e) {
			WindowEvents.emit(document, 'MenuMergeSessions', e);
		});

		// Replace session
		overwriteSession.addEventListener('click', function(e) {
			WindowEvents.emit(document, 'MenuReplaceSession', e);
		});

		// Append current tab to the selected session
		add.addEventListener('click', function() {
			WindowEvents.emit(document, 'MenuAddCurrentTab');
		});

		// Save the session
		save.addEventListener('click', function() {
			WindowEvents.emit(document, 'MenuSaveSession');
		});

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