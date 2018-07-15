define(function(require, exports) {
	'use strict';

	// ------------------------------------------------------------------------
	// Modules

	const { HTMLCreator } = require('../utils/dom');
	const { WindowEvents } = require('../utils/global-events');

	// ------------------------------------------------------------------------
	// API

	function Clipboard()
	{
		var DomElem = HTMLCreator();

		var input =  DomElem('input', {id: 'clipboard'});
		document.body.appendChild(input);

		// ------------------------------------------------------------------------
		// Events

		function copyText(text)
		{
			input.value = text;
			input.select();
			document.execCommand('copy');
		}

		WindowEvents.on(document, 'CopyToClipboard', copyText);

		// ------------------------------------------------------------------------
		// Public data

		this.DOMRoot = input;
	}

	// ------------------------------------------------------------------------
	// Module exports

	exports.Clipboard = Clipboard;
});
