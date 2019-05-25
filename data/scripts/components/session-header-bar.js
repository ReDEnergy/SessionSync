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

	function SessionHeaderBar()
	{
		var DomElem = HTMLCreator();

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
		var headerMenu = CreateHeaderMenu();
		headerBar.appendChild(headerMenu);

		// ------------------------------------------------------------------------
		// Events

		AppConfig.onChange('style.scale.header', function(value) {
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

	var CreateHeaderMenu = function CreateHeaderMenu()
	{
		var DomElem = HTMLCreator();

		// ------------------------------------------------------------------------
		// Create UI

		var headerMenu = DomElem('div', {class: 'header-menu'});
		headerMenu.setAttribute('active', 'false');

		var menuArea = DomElem('div', {class: 'menu-area'});
		headerMenu.appendChild(menuArea);

		var menuRow1 = DomElem('div', {class: 'menu-row'});
		var menuRow2 = DomElem('div', {class: 'menu-row'});
		var menuRow3 = DomElem('div', {class: 'menu-row'});
		menuArea.appendChild(menuRow1);
		menuArea.appendChild(menuRow2);
		menuArea.appendChild(menuRow3);

		// ------------------------------------------------------------------------
		// Methods

		function MenuButton(options) {

			var button = DomElem('div', {class: 'menu-button'});

			var icon = DomElem('div', {class: 'icon'});
			var title = DomElem('div', {class: 'title'});

			title.textContent = options.title;

			var url = 'url("images/' + options.icon + '")';
			icon.style.backgroundImage = url;

			// Events
			var callback = JSUtils.getValidFunction(options.callback);
			button.addEventListener('click', callback);

			button.appendChild(icon);
			button.appendChild(title);
			return button;
		}

		var openConfig = MenuButton({
			title: 'Options',
			icon: 'icons/gear.png',
			callback: function () {
				var model = SessionSyncModel.getModel(document);
				var state = model.state['config'] == undefined ? 'on' : undefined;
				WindowEvents.emit(document, 'SetUIState', { config : state});
			}
		});

		var openTutorial = MenuButton({
			title: 'Tutorial',
			icon: 'icons/brightness.png',
			callback: function () {
				browser.runtime.sendMessage({event: 'session-sync-tutorial'});
			}
		});

		var leaveFeedback = MenuButton({
			title: 'Feedback',
			icon: 'icons/mail.png',
			callback: function () {
				browser.runtime.sendMessage({event: 'session-sync-leave-feedback'});
			}
		});

		var exportImport = MenuButton({
			title: 'Export/Import',
			icon: 'icons/booklet.png',
			callback: function () {
				browser.tabs.create({
					url: 'home/home.html#export-import',
					active: true,
				});
			}
		});

		var buttonDetachInTab = MenuButton({
			title: 'Tab View',
			icon: 'icons/document.png',
			callback: function () {
				browser.runtime.sendMessage({event: 'session-sync-detach-tab'});
			}
		});

		var buttonDetachInWindow = MenuButton({
			title: 'Window View',
			icon: 'icons/browser.png',
			callback: function () {
				browser.runtime.sendMessage({event: 'session-sync-detach-window'});
			}
		});

		var githubPage = MenuButton({
			title: 'Dev page',
			icon: 'github-logo.png',
			callback: function () {
				browser.runtime.sendMessage({event: 'session-sync-open-github'});
			}
		});

		menuRow1.appendChild(openConfig);
		menuRow2.appendChild(openTutorial);
		menuRow2.appendChild(leaveFeedback);
		menuRow2.appendChild(githubPage);
		menuRow3.appendChild(exportImport);
		menuRow3.appendChild(buttonDetachInTab);
		menuRow3.appendChild(buttonDetachInWindow);

		// ------------------------------------------------------------------------
		// Dev actions

		var DebugMode =	{
			init: AppConfig.devMode(),
			manualTrigger: 0,
			triggerDate: new Date(),
			action : function () {
				if (this.init == false)
				{
					if (new Date() - this.triggerDate < 5000) {
						this.manualTrigger++;
						if (this.manualTrigger > 10) {
							this.init = true;
							initDevMode();
						}
					}
					else {
						this.manualTrigger = 0;
					}
				}
			}
		};

		function initDevMode()
		{
			var devRow1 = DomElem('div', {class: 'menu-row'});

			var activeTabInfo = MenuButton({
				title: 'Tab Info',
				icon: 'icons/document.png',
				callback: function () {
					browser.tabs.query({active: true, windowId: browser.windows.WINDOW_ID_CURRENT})
					.then(tabs => browser.tabs.get(tabs[0].id))
					.then(tab => {
						console.log(tab);
					});
				}
			});

			var localStorage = MenuButton({
				title: 'Local Storage',
				icon: 'icons/bookshelf.png',
				callback: function () {
					browser.storage.local.get().then(function (data) {
						console.log(data);
					});
				}
			});

			var clearFaviconCache = MenuButton({
				title: 'Clear Favicons',
				icon: 'icons/x.png',
				callback: function () {
					browser.storage.local.get().then(function (data) {
						for (var key in data) {
							if (key.startsWith('@favIconUrl')) {
								browser.storage.local.remove(key);
							}
						}
					});
				}
			});

			var fixLazySession = MenuButton({
				title: 'Fix session',
				icon: 'icons/tools.png',
				callback: function() {
					WindowEvents.emit(document, 'MenuFixLazySession');
				}
			});

			devRow1.appendChild(activeTabInfo);
			devRow1.appendChild(localStorage);
			devRow1.appendChild(clearFaviconCache);
			menuArea.appendChild(devRow1);


			var devRow2 = DomElem('div', {class: 'menu-row'});
			devRow2.appendChild(fixLazySession);
			menuArea.appendChild(devRow2);
		}

		if (AppConfig.devMode())
			initDevMode();

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

				DebugMode.action();
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
