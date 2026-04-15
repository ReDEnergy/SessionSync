'use strict';

// *****************************************************************************
// Modules

import { HTMLCreator } from '../utils/dom';
import { WindowEvents } from '../utils/global-events';

// *****************************************************************************
// TooltipSystem

export function TooltipSystem() {
	var DomElem = HTMLCreator();

	var tooltip = DomElem('div', { class: 'tooltip-system' });

	// ------------------------------------------------------------------------
	// Events

	var hideTooltip = function hideTooltip() {
		tooltip.removeAttribute('active');
	};

	var showTooltip = function showTooltip(options) {
		tooltip.textContent = options.message;
		tooltip.setAttribute('active', '');
		var position = options.node.getBoundingClientRect();

		tooltip.setAttribute('active', '');
		tooltip.style.left = position.x - Math.floor((tooltip.clientWidth - options.node.clientWidth) / 2) + 'px';
		tooltip.style.top = position.y - tooltip.clientHeight + 'px';
	};

	WindowEvents.on(document, 'ShowTooltip', showTooltip);
	WindowEvents.on(document, 'HideTooltip', hideTooltip);

	// ------------------------------------------------------------------------
	// Public data

	this.DOMRoot = tooltip;
}
