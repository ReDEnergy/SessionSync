'use strict';

// *****************************************************************************
// Custom Modules

const { HTMLCreator } = require('./dom');

// *****************************************************************************
// Tooltip

function Tooltip(DomNode, text) {
	var DomElem = HTMLCreator(DomNode.ownerDocument);

	var tootip = DomElem('div', {class : 'tooltip'});
	tootip.textContent = text;

	DomNode.classList.add("tooltip-parent");
	DomNode.appendChild(tootip);
}

// *****************************************************************************
// Public API
exports.Tooltip = Tooltip;