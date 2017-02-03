'use strict';

// *****************************************************************************
// Custom Modules

// App
const { AppConfig } = require('../config');
const { SessionSyncModel } = require('../session-sync-model');

// Utils
const { WindowEvents, GlobalEvents } = require('../utils/global-events');
const { HTMLCreator } = require('../utils/dom');
const DOMComponent = require('../utils/components');

// *****************************************************************************
// Custom Modules

/*
 * Config panel
 */

function ConfigPanel(document)
{
	// Create DomHealper 
	var DomElem = HTMLCreator(document);

	// ------------------------------------------------------------------------
	// Create UI

	var panel = DomElem('div', {class: 'config-panel'});

	// Close button
	var closeBtn = DomElem('div', {class: 'css-close-button'});
	panel.appendChild(closeBtn);

	// Header
	var header = DomElem('div', {class: 'header'});
	var logo = DomElem('div', {class: 'logo'});
	header.appendChild(logo);
	panel.appendChild(header);
	
	// ------------------------------------------------------------------------
	// Methods
	
	function ConfigSection(document, options)
	{
		var sectionContainer = DomElem('div', {class: 'section-container'});
		var sectionTitle = DomElem('div', {class: 'section-title'});
		var sectionBody = DomElem('div', {class: 'section-body'});

		if (options.id) {
			sectionContainer.setAttribute('id', options.id);
		}

		sectionTitle.textContent = options.title;
		
		sectionContainer.appendChild(sectionTitle);
		sectionContainer.appendChild(sectionBody);
		
		sectionTitle.addEventListener('click', function() {

			// manual mode
			var isCollapsed = sectionContainer.hasAttribute('collapsed');
			if (isCollapsed) {
				sectionContainer.removeAttribute('collapsed');
			} else {
				sectionBody.style.height = sectionBody.clientHeight + 'px'; 
				sectionContainer.setAttribute('collapsed', '');
			}
		});
		
		this.container = sectionContainer;
		this.addItem = function(item) {
			sectionBody.appendChild(item);
		};
	}
	
	// ------------------------
	// Section: UI styling

	(function() {
		
		var section = new ConfigSection(document, { title: 'UI Styling' });
		panel.appendChild(section.container);

		var addonToolbarTB = new DOMComponent.ToggleButton(document, {
			state: AppConfig.storage.style.addonToolbar,
			description: 'Show addon bar',
			onState: 'Yes',
			offState: 'No',
			callback: function(value) {
				AppConfig.storage.style.addonToolbar = value;
				GlobalEvents.emit('cfg.style.addonToolbar', value);
			}
		});
		section.addItem(addonToolbarTB.DOMRoot);
		GlobalEvents.on('cfg.style.addonToolbar', function(value) {
			addonToolbarTB.setValue(AppConfig.storage.style.addonToolbar, false);
			WindowEvents.emit(document, 'SetUIState', {'addon-toolbar': value});
		});
		WindowEvents.emit(document, 'SetUIState', {'addon-toolbar': AppConfig.storage.style.addonToolbar});

		var contextMenuIconsTB = new DOMComponent.ToggleButton(document, {
			state: AppConfig.storage.style.contextMenuIcons,
			description: 'Display context-menu icons',
			onState: 'Yes',
			offState: 'No',
			callback: function(value) {
				AppConfig.storage.style.contextMenuIcons = value;
				GlobalEvents.emit('cfg.style.contextMenuIcons', value);
			}
		});
		section.addItem(contextMenuIconsTB.DOMRoot);
		GlobalEvents.on('cfg.style.contextMenuIcons', function(value) {
			contextMenuIconsTB.setValue(AppConfig.storage.style.contextMenuIcons, false);
		});

		// Use overlay opacity
		/*
		var overlayTB = new DOMComponent.ToggleButton(document, {
			state: AppConfig.storage.style.overlay,
			description: 'Background overlay',
			onState: 'Yes',
			offState: 'No',
			callback: function(value) {
				AppConfig.storage.style.overlay = value;
				GlobalEvents.emit('cfg.style.overlay', value);
			}
		});
		section.addItem(overlayTB.DOMRoot);
		GlobalEvents.on('cfg.style.overlay', function(value) {
			overlayTB.setValue(AppConfig.storage.style.overlay, false);
		});
		*/

		// Overlay opacity
		var overlayOpacity = new DOMComponent.RangeControl(document, {
			value: AppConfig.storage.style.overlayOpacity,
			description: 'Overlay opacity',
			minValue: 0,
			maxValue: 100,
			onChange: function(value, d) {
				AppConfig.storage.style.overlayOpacity = value;
				GlobalEvents.emit('cfg.style.overlayOpacity', value);
			},
		});
		section.addItem(overlayOpacity.DOMRoot);
		GlobalEvents.on('cfg.style.overlayOpacity', function(value) {
			overlayOpacity.setValue(AppConfig.storage.style.overlayOpacity, false);
		});

	})();

	// ------------------------
	// Section: UI scaling
	
	(function() {
		
		var section = new ConfigSection(document, { title: 'UI Scaling' });
		panel.appendChild(section.container);

		// UI Header width
		var panelWidthRG = new DOMComponent.RangeControl(document, {
			value: AppConfig.storage.style.appPanelWidth,
			description: 'Panel width (px)',
			step: 2,
			minValue: 500,
			onChange: function(value, d) {
				AppConfig.storage.style.appPanelWidth = value;
				GlobalEvents.emit('cfg.style.appPanelWidth', value);
			},
		});
		section.addItem(panelWidthRG.DOMRoot);
		GlobalEvents.on('cfg.style.appPanelWidth', function(value) {
			panelWidthRG.setValue(AppConfig.storage.style.appPanelWidth, false);
		});
		
		// UI Panel height
		var panelHeightRG = new DOMComponent.RangeControl(document, {
			value: AppConfig.storage.style.appPanelHeight,
			description: 'Panel height (px)',
			step: 2,
			minValue: 400,
			onChange: function(value, d) {
				AppConfig.storage.style.appPanelHeight = value;
				GlobalEvents.emit('cfg.style.appPanelHeight', value);
			},
		});
		section.addItem(panelHeightRG.DOMRoot);	
		GlobalEvents.on('cfg.style.appPanelHeight', function(value) {
			panelHeightRG.setValue(AppConfig.storage.style.appPanelHeight, false);
		});
		
		// UI Header scaling
		var headerbarRG = new DOMComponent.RangeControl(document, {
			value: AppConfig.storage.style.headerbarScaleFactor,
			description: 'Header-bar',
			minValue: 5,
			maxValue: 50,
			onChange: function(value, d) {
				AppConfig.storage.style.headerbarScaleFactor = value;
				GlobalEvents.emit('cfg.style.headerbarScaleFactor', value);
			},
		});
		section.addItem(headerbarRG.DOMRoot);	
		GlobalEvents.on('cfg.style.headerbarScaleFactor', function(value) {
			headerbarRG.setValue(AppConfig.storage.style.headerbarScaleFactor, false);
		});
	
		// UI Toolbar scaling
		var toolbarRG = new DOMComponent.RangeControl(document, {
			value: AppConfig.storage.style.toolbarScaleFactor,
			description: 'Toolbar',
			minValue: 5,
			maxValue: 50,
			onChange: function(value, d) {
				AppConfig.storage.style.toolbarScaleFactor = value;
				GlobalEvents.emit('cfg.style.toolbarScaleFactor', value);
			},
		});
		section.addItem(toolbarRG.DOMRoot);	
		GlobalEvents.on('cfg.style.toolbarScaleFactor', function(value) {
			toolbarRG.setValue(AppConfig.storage.style.toolbarScaleFactor, false);
		});
	
		// Session list UI scaling
		var sessionListRG = new DOMComponent.RangeControl(document, {
			value: AppConfig.storage.style.sessionListScaleFactor,
			description: 'Session list',
			minValue: 5,
			maxValue: 50,
			onChange: function(value, d) {
				AppConfig.storage.style.sessionListScaleFactor = value;
				GlobalEvents.emit('cfg.style.sessionListScaleFactor', value);
			},
		});
		section.addItem(sessionListRG.DOMRoot);
		GlobalEvents.on('cfg.style.sessionListScaleFactor', function(value) {
			sessionListRG.setValue(AppConfig.storage.style.sessionListScaleFactor, false);
		});
		
		// Bookmark area UI scaling
		var bookmarkListRG = new DOMComponent.RangeControl(document, {
			value: AppConfig.storage.style.bookmarkAreaScaleFactor,
			description: 'Session container',
			minValue: 5,
			maxValue: 50,
			onChange: function(value, d) {
				AppConfig.storage.style.bookmarkAreaScaleFactor = value;
				GlobalEvents.emit('cfg.style.bookmarkAreaScaleFactor', value);
			},
		});
		section.addItem(bookmarkListRG.DOMRoot);
		GlobalEvents.on('cfg.style.bookmarkAreaScaleFactor', function(value) {
			bookmarkListRG.setValue(AppConfig.storage.style.bookmarkAreaScaleFactor, false);
		});
		
	})();

	// ------------------------
	// Section: General settings
	
	(function() {
	
		var section = new ConfigSection(document, { title: 'General' });
		panel.appendChild(section.container);
		
		var bookmarkClickActionTB = new DOMComponent.ToggleButton(document, {
			state: AppConfig.storage.bookmarkConfig.clickNewTab,
			description: 'Open url (on click)',
			onState: 'New tab',
			offState: 'Same tab',
			callback: function(value) {
				AppConfig.storage.bookmarkConfig.clickNewTab = value;
				GlobalEvents.emit('cfg.bookmarkConfig.clickNewTab', value);
			}
		});
		section.addItem(bookmarkClickActionTB.DOMRoot);
		GlobalEvents.on('cfg.bookmarkConfig.clickNewTab', function(value) {
			bookmarkClickActionTB.setValue(AppConfig.storage.bookmarkConfig.clickNewTab, false);
		});
		
		var editOnSaveTB = new DOMComponent.ToggleButton(document, {
			state: AppConfig.storage.bookmarkConfig.editSessionOnSave,
			description: 'Edit session after saving',
			onState: 'Yes',
			offState: 'No',
			callback: function(value) {
				AppConfig.storage.bookmarkConfig.editSessionOnSave = value;
				GlobalEvents.emit('cfg.bookmarkConfig.editSessionOnSave', value);
			}
		});
		section.addItem(editOnSaveTB.DOMRoot);
		GlobalEvents.on('cfg.bookmarkConfig.editSessionOnSave', function(value) {
			editOnSaveTB.setValue(AppConfig.storage.bookmarkConfig.editSessionOnSave, false);
		});		
		
	})();		

	// ------------------------
	// Section: Hotkey
	
	(function() {
		
		var section = new ConfigSection(document, { title: 'Addon Hotkey', id: 'hotkey' });
		panel.appendChild(section.container);
		
		var hotkeyStateTB = new DOMComponent.ToggleButton(document, {
			state: AppConfig.storage.hotkey.enabled,
			description: 'Keyboard hotkey',
			onState: 'Enabled',
			offState: 'Disabled',
			callback: function(value) {
				AppConfig.storage.hotkey.enabled = value;
				GlobalEvents.emit('cfg.hotkey');
			}
		});
		section.addItem(hotkeyStateTB.DOMRoot);
		
		// Special keys
		var specialKeysDD = new DOMComponent.DropDown(document, {
			id: 'SpecialKey',
			description: 'Special',
			onChange: function(value) {
				AppConfig.storage.hotkey.special = value;
				GlobalEvents.emit('cfg.hotkey');
			}
		});
		section.addItem(specialKeysDD.container);

		specialKeysDD.addOption('Ctrl', 'accel');
		specialKeysDD.addOption('Alt', 'alt');
		specialKeysDD.addOption('Shift', 'shift');
		specialKeysDD.addOption('Ctrl-Shift', 'accel-shift');
		specialKeysDD.addOption('Ctrl-Alt', 'accel-alt');
		specialKeysDD.addOption('Alt-Shift', 'alt-shift');
		specialKeysDD.addOption('Ctrl-Alt-Shift', 'accel-alt-shift');
		specialKeysDD.setValue(AppConfig.storage.hotkey.special);
		
		// Shortcut key
		var shortcutKeyDD = new DOMComponent.DropDown(document, {
			description: 'Shortcut key',
			onChange: function(value) {
				AppConfig.storage.hotkey.shortcutKey = value;
				GlobalEvents.emit('cfg.hotkey');
			}
		});
		section.addItem(shortcutKeyDD.container);
		
		// Add A-Z literals
		for (var i = 65; i < 91; i++) {
			var value = String.fromCharCode(i);
			shortcutKeyDD.addOption(value, value);
		}

		// Add 0-9 literals
		for (var i = 0; i < 10; i++) {
			var value = '' + i;
			shortcutKeyDD.addOption(value, value);
		}
		
		shortcutKeyDD.setValue(AppConfig.storage.hotkey.shortcutKey);

		// update event
		GlobalEvents.on('cfg.hotkey', function() {
			hotkeyStateTB.setValue(AppConfig.storage.hotkey.enabled, false);
			specialKeysDD.setValue(AppConfig.storage.hotkey.special, false);
			shortcutKeyDD.setValue(AppConfig.storage.hotkey.shortcutKey, false);
			WindowEvents.broadcast('SetUIState', {'hotkey': AppConfig.storage.hotkey.enabled});
		});
		WindowEvents.emit(document, 'SetUIState', {'hotkey': AppConfig.storage.hotkey.enabled});

	})();
	
	// ------------------------
	// Section: History settiongs
	
	(function() {
		
		var section = new ConfigSection(document, { title: 'Auto-save History', id: 'auto-save' });
		panel.appendChild(section.container);
		
		// Context menu icons
		var contextMenuIconsTB = new DOMComponent.ToggleButton(document, {
			state: AppConfig.storage.autoSave.enabled,
			description: 'Auto-save sessions',
			onState: 'Enabled',
			offState: 'Disabled',
			callback: function(value) {
				AppConfig.storage.autoSave.enabled = value;
				GlobalEvents.emit('cfg.autoSave.enabled', value);
				if (value == false) {
					WindowEvents.broadcast('ShowSyncList');	
					GlobalEvents.emit('update-sessions');
				}
			}
		});
		section.addItem(contextMenuIconsTB.DOMRoot);
		GlobalEvents.on('cfg.autoSave.enabled', function(value) {
			WindowEvents.emit(document, 'SetUIState', {'auto-save': value});
			contextMenuIconsTB.setValue(AppConfig.storage.autoSave.enabled, false);
		});
		WindowEvents.emit(document, 'SetUIState', {'auto-save': AppConfig.storage.autoSave.enabled});

		// Auto-save interval
		var saveIntervalRG = new DOMComponent.RangeControl(document, {
			value: AppConfig.storage.autoSave.interval,
			description: 'Save interval (seconds)',
			minValue: 10,
			onChange: function(value, d) {
				AppConfig.storage.autoSave.interval = value;
				GlobalEvents.emit('cfg.autoSave.interval', value);
			},
		});
		section.addItem(saveIntervalRG.DOMRoot);
		GlobalEvents.on('cfg.autoSave.interval', function(value) {
			saveIntervalRG.setValue(AppConfig.storage.autoSave.interval, false);
		});

		// Auto-save slots
		var saveSlotsRG = new DOMComponent.RangeControl(document, {
			value: AppConfig.storage.autoSave.savingSlots,
			description: 'Saving slots',
			minValue: 2,
			onChange: function(value, d) {
				AppConfig.storage.autoSave.savingSlots = value;
				GlobalEvents.emit('cfg.autoSave.savingSlots', value);
			},
		});
		section.addItem(saveSlotsRG.DOMRoot);
		GlobalEvents.on('cfg.autoSave.savingSlots', function(value) {
			saveSlotsRG.setValue(AppConfig.storage.autoSave.savingSlots, false);
		});
		
		// Auto-save expire time
		var expireAfterRG = new DOMComponent.RangeControl(document, {
			value: AppConfig.storage.autoSave.expireTimeHours,
			description: 'Delete after [...] hours',
			minValue: 0,
			onChange: function(value, d) {
				AppConfig.storage.autoSave.expireTimeHours = value;
				GlobalEvents.emit('cfg.autoSave.expireTimeHours', value);
			},
		});
		section.addItem(expireAfterRG.DOMRoot);
		GlobalEvents.on('cfg.autoSave.expireTimeHours', function(value) {
			expireAfterRG.setValue(AppConfig.storage.autoSave.expireTimeHours, false);
		});
		
	})();

	// ------------------------------------------------------------------------
	// Events
	
	WindowEvents.on(document, 'CloseUI', function() {
		WindowEvents.emit(document, 'SetUIState', { config : undefined});
	});
	
	closeBtn.addEventListener('click', function() {
		WindowEvents.emit(document, 'SetUIState', { config : undefined});
	});
	
	logo.addEventListener('click', function() {
		GlobalEvents.emit('open-addon-page');
		WindowEvents.emit(document, 'CloseUI');
	});
	
	// Tooltip events
	logo.addEventListener('mouseover', function(e) {
		WindowEvents.emit(document, 'ShowTooltip', {
			node: e.target,
			message: 'Show help page'
		});
	});
	
	logo.addEventListener('mouseleave', function(e) {
		WindowEvents.emit(document, 'HideTooltip');
	});
	

	// ------------------------------------------------------------------------
	// Public properties
		
	this.document = document;
	this.DOMRoot = panel;
};

// *****************************************************************************
// Public API

exports.ConfigPanel = ConfigPanel;