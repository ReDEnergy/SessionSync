define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	const { HTMLCreator } = require('../utils/dom');
	const { WindowEvents } = require('../utils/global-events');

	// *****************************************************************************
	// NotificationSystem

	function NotificationSystem(document)
	{
		var DomElem = HTMLCreator(document);

		var panel = DomElem('div', {class : 'notification-system'});
		var info = DomElem('div', {class : 'info'});
		var warning = DomElem('div', {class : 'warning'});

		panel.appendChild(info);
		panel.appendChild(warning);

		// ------------------------------------------------------------------------
		// Events

		var infoTimeout = 0;

		var closeInfoBox = function closeInfoBox()
		{
			info.removeAttribute('active');
		};

		var showInfo = function showInfo(options)
		{
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

	// *****************************************************************************
	// Public API

	exports.NotificationSystem = NotificationSystem;
});