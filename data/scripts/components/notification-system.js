'use strict';

// *****************************************************************************
// Custom Modules

import { HTMLCreator } from '../utils/dom';
import { WindowEvents } from '../utils/global-events';

// *****************************************************************************
// NotificationSystem

export function NotificationSystem() {
	var DomElem = HTMLCreator();

	var panel = DomElem('div', { class: 'notification-system' });
	var info = DomElem('div', { class: 'info' });
	var warning = DomElem('div', { class: 'warning' });

	panel.appendChild(info);
	panel.appendChild(warning);

	// ------------------------------------------------------------------------
	// Events

	var infoTimeout = 0;

	var closeInfoBox = function closeInfoBox() {
		info.removeAttribute('active');
	};

	var showInfo = function showInfo(options) {
		info.textContent = options.message;
		info.setAttribute('active', '');
		clearTimeout(infoTimeout);
		infoTimeout = setTimeout(closeInfoBox, options.timeout ? options.timeout : 1500);
	};

	WindowEvents.on(document, 'Notification', showInfo);

	// ------------------------------------------------------------------------
	// Public data

	this.DOMRoot = panel;
}