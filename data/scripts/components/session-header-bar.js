define(function(require, exports) {
	'use strict';

	// ------------------------------------------------------------------------
	// Modules

	const { AppConfig } = require('../config');
	const { SessionSyncModel } = require ('./session-sync-model');

	// Utils
	const JSUtils = require('../utils/general');
	const { HTMLCreator } = require('../utils/dom');
	const { WindowEvents, GlobalEvents } = require('../utils/global-events');

	// ------------------------------------------------------------------------
	// API

	function SessionHeaderBar(document)
	{
		var DomElem = HTMLCreator(document);

		// ------------------------------------------------------------------------
		// Create UI

		var headerBar = DomElem('div', {class: 'header-bar'});
		headerBar.style.fontSize = AppConfig.get('style.scale.header') + 'px';

		// Display information about the selected session
		var description = DomElem('div', {class: 'description'});
		headerBar.appendChild(description);

		// Active session button
		var activeSessionBtn = DomElem('div', {class: 'active-session-btn', tooltip: 'Active session'});
		headerBar.appendChild(activeSessionBtn);

		// Header Menu
		var headerMenu = CreateHeaderMenu(document);
		headerBar.appendChild(headerMenu);

		// ------------------------------------------------------------------------
		// Events

		GlobalEvents.on('style.scale.header', function(value) {
			headerBar.style.fontSize = value + 'px';
		});

		activeSessionBtn.addEventListener('click', function() {
			WindowEvents.emit(document, 'ShowCurrentSession');
		});

		WindowEvents.on(document, 'SetSessionDescription', function(value) {
			description.textContent = value;
		});

		// Tooltip events
		headerBar.addEventListener('mouseover', function(e) {
			if (e.target.hasAttribute('tooltip')) {
				WindowEvents.emit(document, 'ShowTooltip', {
					node: e.target,
					message: e.target.getAttribute('tooltip')
				});
			} else {
				WindowEvents.emit(document, 'HideTooltip');
			}
		});

		headerBar.addEventListener('mouseleave', function() {
			WindowEvents.emit(document, 'HideTooltip');
		});

		// ------------------------------------------------------------------------
		// Public properties

		this.DOMRoot = headerBar;
	}

	var CreateHeaderMenu = function CreateHeaderMenu(document)
	{
		var DomElem = HTMLCreator(document);

		// ------------------------------------------------------------------------
		// Create UI

		var headerMenu = DomElem('div', {class: 'header-menu'});
		headerMenu.setAttribute('active', 'false');

		var menuArea = DomElem('div', {class: 'menu-area'});
		headerMenu.appendChild(menuArea);

		// ------------------------------------------------------------------------
		// Methods

		function MenuButton(options) {

			var button = DomElem('div', {class: 'menu-button'});

			var icon = DomElem('div', {class: 'icon'});
			var title = DomElem('div', {class: 'title'});

			title.textContent = options.title;
			button.setAttribute('id', options.id);
			button.appendChild(icon);
			button.appendChild(title);

			// Events
			var callback = JSUtils.getValidFunction(options.callback);
			button.addEventListener('click', callback);

			return button;
		}

		var buttonCfg = MenuButton({
			id: 'config',
			title: 'Config',
			callback: function () {
				var model = SessionSyncModel.getModel(document);
				var state = model.state['config'] == undefined ? 'on' : undefined;
				WindowEvents.emit(document, 'SetUIState', { config : state});
			}
		});
		menuArea.appendChild(buttonCfg);

		var buttonHelp = MenuButton({
			id: 'help',
			title: 'About',
			callback: function () {
				GlobalEvents.emit('open-addon-page');
				WindowEvents.emit(document, 'CloseUI');
			}
		});
		menuArea.appendChild(buttonHelp);

		// var buttonClose = MenuButton({
		// 	id: 'close',
		// 	title: 'Close',
		// 	callback: function () {
		// 		WindowEvents.emit(document, 'CloseUI');
		// 	}
		// });
		// menuArea.appendChild(buttonClose);

		// ------------------------------------------------------------------------
		// Events

		var closeMenu = function closeMenu() {
			headerMenu.setAttribute('active', '0');
		};

		var closeOnMiss = function closeOnMiss(e)
		{
			if (e && (e.target == headerMenu || e.target == menuArea)) {
				return;
			}
			closeMenu();
			document.removeEventListener('click', closeOnMiss);
		};

		headerMenu.addEventListener('click', function(e) {
			if (e && e.target == headerMenu)
			{
				var state = headerMenu.getAttribute('active') | 0;
				var newState = 1 - state;
				headerMenu.setAttribute('active', newState);
				if (newState == 1) {
					document.addEventListener('click', closeOnMiss);
				}
			}
		});

		WindowEvents.on(document, 'CloseUI', function() {
			closeMenu();
		});

		// ------------------------------------------------------------------------
		// Public

		return headerMenu;
	};

	// ------------------------------------------------------------------------
	// Events

	// ------------------------------------------------------------------------
	// Init

	// ------------------------------------------------------------------------
	// Module exports

	exports.SessionHeaderBar = SessionHeaderBar;

});
