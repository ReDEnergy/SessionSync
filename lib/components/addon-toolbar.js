'use strict';

// *****************************************************************************
// SDK Modules

const tabs = require("sdk/tabs");

// *****************************************************************************
// Custom Modules

const { SessionSyncModel } = require('../session-sync-model');

// Utils
const { WindowEvents, GlobalEvents } = require('../utils/global-events');
const { HTMLCreator } = require('../utils/dom');

// Dev tools
const { DomInspector } = require('../devtools/dom-inspector');
const { CSSStylingReload } = require('../devtools/style-reload');

// *****************************************************************************
// AddonToolbar

function AddonToolbar(document) {

	// Create DomHealper 
	var DomElem = HTMLCreator(document);

	// ------------------------------------------------------------------------
	// Create UI

	var container = DomElem('div', {class: 'addon-toolbar'});

	// Close addon
	var closeAddon = DomElem('div', {class: 'button close', tooltip: 'Close'});
	container.appendChild(closeAddon);

	// Configuration
	var configPanel = DomElem('div', {class: 'button config', tooltip: 'Config'});
	container.appendChild(configPanel);

	// Instruction page
	var addonPage = DomElem('div', {class: 'button instructions', tooltip: 'Help page'});
	container.appendChild(addonPage);

	// DOM inspector
	var domInspector = new DomInspector(document);
	container.appendChild(domInspector.DOMRoot);

	// Reload styles
	var reloadStyles = new CSSStylingReload(document);
	container.appendChild(reloadStyles.DOMRoot);
	
	// ------------------------------------------------------------------------
	// Events
	
	addonPage.addEventListener('click', function() {
		GlobalEvents.emit('open-addon-page');
		WindowEvents.emit(document, 'CloseUI');
	});

	configPanel.addEventListener('click', function() {
		var model = SessionSyncModel.getModel(document);
		var state = model.state['config'] == undefined ? 'on' : undefined;
		WindowEvents.emit(document, 'SetUIState', { config : state});
	});
	
	closeAddon.addEventListener('click', function() {
		WindowEvents.emit(document, 'CloseUI');
	});
	
	// Tooltip events
	container.addEventListener('mouseover', function(e) {
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

	container.addEventListener('mouseleave', function(e) {
		WindowEvents.emit(document, 'HideTooltip');
	});		

	// ------------------------------------------------------------------------
	// Create UI

	this.DOMRoot = container;	
};


// *****************************************************************************
// Public API
exports.AddonToolbar = AddonToolbar;

