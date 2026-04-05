'use strict';

// ------------------------------------------------------------------------
// Modules

import { HTMLCreator } from '../utils/dom';
import { WindowEvents } from '../utils/global-events';

// ------------------------------------------------------------------------
// API

export function Clipboard() {
	var DomElem = HTMLCreator();

	var input = DomElem('input', { id: 'clipboard' });
	document.body.appendChild(input);

	// ------------------------------------------------------------------------
	// Events

	function copyText(text) {
		input.value = text;
		input.select();
		document.execCommand('copy');
	}

	WindowEvents.on(document, 'CopyToClipboard', copyText);

	// ------------------------------------------------------------------------
	// Public data

	this.DOMRoot = input;
}
