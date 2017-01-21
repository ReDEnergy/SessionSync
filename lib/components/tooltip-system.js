'use strict';

// *****************************************************************************
// Custom Modules

const { HTMLCreator } = require('../utils/dom');
const { WindowEvents, GlobalEvents } = require('../utils/global-events');

// *****************************************************************************
// TooltipSystem

function TooltipSystem(document)
{
	var window = document.ownerGlobal;
	var DomElem = HTMLCreator(document);

	var tooltip = DomElem('div', {class : 'tooltip-system'});

	// ------------------------------------------------------------------------
	// Events
	
	var infoTimeout = 0;

	var hideTooltip = function hideTooltip()
	{
		tooltip.removeAttribute('active');	
	};

	var showTooltip = function showTooltip(options)
	{
		tooltip.textContent = options.message;
		tooltip.setAttribute('active', '');	
		var position = options.node.getBoundingClientRect();
		
		tooltip.setAttribute('active', '');
		tooltip.style.left = position.x - (tooltip.clientWidth - options.node.clientWidth) / 2 + 'px';	
		tooltip.style.top = position.y  - tooltip.clientHeight + 'px';	
	};

	WindowEvents.on(document, 'ShowTooltip', showTooltip);
	WindowEvents.on(document, 'HideTooltip', hideTooltip);
	WindowEvents.on(document, 'UIToggledOff', hideTooltip);

	// ------------------------------------------------------------------------
	// Public data

	this.DOMRoot = tooltip;
}

// *****************************************************************************
// Public API

exports.TooltipSystem = TooltipSystem;