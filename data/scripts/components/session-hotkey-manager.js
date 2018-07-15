define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	const { BookmarkManager } = require('../session/bookmarks');

	// Utils
	const { DropDown } = require('../utils/components');
	const { HTMLCreator } = require('../utils/dom');
	const { WindowEvents } = require('../utils/global-events');

	// *****************************************************************************
	// API

	/*
	* Session Hotkeys
	*/

	function SessionHotkeyManager()
	{
		// Create DomHealper
		var DomElem = HTMLCreator();

		// ------------------------------------------------------------------------
		// Create UI

		var overlay = DomElem('div', { class : 'hotkey-overlay' });
		var panel = DomElem('div', { class : 'hotkey-manager' });

		var header = DomElem('div', { class : 'header' });
		header.textContent = 'Change hotkey';

		var infoBox = DomElem('div', { class : 'info-box' });
		var message = DomElem('div', { class : 'message' });
		var url = DomElem('div', { class: 'link' });
		var supportLink = 'https://support.mozilla.org/en-US/kb/keyboard-shortcuts-perform-firefox-tasks-quickly';

		url.textContent = 'Click to see Firefox default shortcuts';
		message.textContent = 'Default Firefox shortcuts cannot be overrided';
		infoBox.appendChild(message);
		infoBox.appendChild(url);

		function addPlusSeparator(parent) {
			var separator = DomElem('div', { class : 'plus' });
			separator.textContent = '+';
			parent.appendChild(separator);
		}

		function HotkeyInfo(title)
		{
			var box = DomElem('div', { class : 'hotkey-info' });
			var header = DomElem('div', { class : 'title' });
			var value = DomElem('div', { class : 'value' });

			header.textContent = title;
			box.appendChild(header);
			box.appendChild(value);

			function setValue(newValue) {
				value.textContent = newValue;
			}

			return {
				DOMRoot: box,
				setValue: setValue
			};
		}

		var currentHotKey = HotkeyInfo('Current');
		var newHotKey = HotkeyInfo('New');

		panel.appendChild(header);
		panel.appendChild(infoBox);
		panel.appendChild(currentHotKey.DOMRoot);
		panel.appendChild(newHotKey.DOMRoot);

		var shortcutConfig = DomElem('div', {class : 'shortcut-config'});
		panel.appendChild(shortcutConfig);

		// --------------------------------------------------------------------
		// Modifier key

		var modifierKey = new DropDown({
			id: 'modifier-key',
			description: 'Special keys',
			onChange: updateNewHotkey
		});
		shortcutConfig.appendChild(modifierKey.container);
		addPlusSeparator(shortcutConfig);

		modifierKey.addOption('Ctrl');
		modifierKey.addOption('Alt');
		modifierKey.addOption('Command');
		modifierKey.addOption('MacCtrl');
		modifierKey.setValue('Ctrl');

		// --------------------------------------------------------------------
		// Optional Modifier

		var optionalModifier = new DropDown({
			id: 'optional-modifier',
			description: 'Optional modifier',
			onChange: updateNewHotkey
		});
		shortcutConfig.appendChild(optionalModifier.container);
		addPlusSeparator(shortcutConfig);

		optionalModifier.addOption('None', { value: '' });
		optionalModifier.addOption('Shift');
		optionalModifier.setValue('Shift');

		// --------------------------------------------------------------------
		// Shortcut key

		var shortcutKey = new DropDown({
			id: 'shortcut-key',
			description: 'Key',
			onChange: updateNewHotkey
		});

		// Add A-Z literals
		for (let i = 65; i < 91; i++) {
			shortcutKey.addOption(String.fromCharCode(i));
		}

		// Add 0-9 literals
		for (let i = 0; i < 10; i++) {
			shortcutKey.addOption('' + i);
		}

		// Add F1-F12 literals
		for (let i = 1; i <= 12; i++) {
			shortcutKey.addOption('F' + i);
		}

		// Add special characters
		shortcutKey.addOption(',', { value: 'Comma'});
		shortcutKey.addOption('.', { value: 'Period'});
		var values = ['Home', 'End', 'PageUp', 'PageDown', 'Space', 'Insert', 'Delete', 'Up', 'Down', 'Left', 'Right'];
		for (let i in values) {
			shortcutKey.addOption(values[i], { property: 'wide' });
		}
		shortcutConfig.appendChild(shortcutKey.container);

		// --------------------------------------------------------------------
		// Action bar

		var actionBar = DomElem('div', {class : 'action-bar'});

		var ok = DomElem('div', {class : 'button ok'});
		ok.textContent = 'Confirm';

		var cancel = DomElem('div', {class : 'button cancel'});
		cancel.textContent = 'Cancel';

		var flexArea1 = DomElem('div', {class : 'flex'});
		var flexArea2 = DomElem('div', {class : 'flex'});

		actionBar.appendChild(flexArea1);
		actionBar.appendChild(ok);
		actionBar.appendChild(cancel);
		actionBar.appendChild(flexArea2);

		panel.appendChild(actionBar);
		overlay.appendChild(panel);

		// ------------------------------------------------------------------------
		// Events

		var changeCallback;

		function updateNewHotkey() {
			var optional = ' + ' + (optionalModifier.getValue() ? optionalModifier.getValue() + ' + ' : '');
			newHotKey.setValue(modifierKey.getValue() + optional + shortcutKey.getValue());
		}

		function setState(state) {
			overlay.setAttribute('state', state);
		}

		cancel.addEventListener('click', function () {
			setState(false);
		});

		ok.addEventListener('click', function () {
			setState(false);

			var optional = '+' + (optionalModifier.getValue() ? optionalModifier.getValue() + '+' : '');
			changeCallback(modifierKey.getValue() + optional + shortcutKey.getValue());
		});

		url.addEventListener('click', function () {
			BookmarkManager.openBookmark({
				url: supportLink,
				mode: 'newTab',
				active: true
			});
		});

		function changeHotKey(options) {

			changeCallback = options.callback;
			var tokens = options.shortcut.split('+');

			header.textContent = options.title,
			currentHotKey.setValue(tokens.join(' + '));
			newHotKey.setValue('');
			modifierKey.setValue(tokens[0]);
			optionalModifier.setValue(tokens.length == 3 ? tokens[1] : '');
			shortcutKey.setValue(tokens.length == 3 ? tokens[2] : tokens[1]);

			setState(true);
		}

		WindowEvents.on(document, 'ChangeHotkey', changeHotKey);

		// ------------------------------------------------------------------------
		// Public properties

		this.DOMRoot = overlay;
	}

	// *****************************************************************************
	// Public API

	exports.SessionHotkeyManager = SessionHotkeyManager;
});