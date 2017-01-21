'use strict';

// *****************************************************************************
// Custom Modules

const { HTMLCreator } = require('../utils/dom');

// *****************************************************************************
// API

function DomInspector(document) {

	// Create DomHealper 
	var DomElem = HTMLCreator(document);

	// Button 
	var button = DomElem('div', {class: 'button dom-inspector', tooltip: 'DOM Inspector'});
	
	// Events
	var LogItemInfo = function(e) {
		if (e.button == 0 && e.target != button) {
			console.log('[DOM Inspector]', e.target);
			document.ownerGlobal.ctx = e.target;
		}
	};
	var debugging = false;
	
	button.addEventListener('click', function() {
		if (debugging) {
			console.log('[DOM Inspector] [Exit]');
			button.removeAttribute('active', '');
			document.removeEventListener('mousedown', LogItemInfo);
		}
		else {
			document.addEventListener('mousedown', LogItemInfo);
			button.setAttribute('active', '');
		}
		debugging = !debugging;
	});
	
	this.DOMRoot = button;
};


// *****************************************************************************
// Public API

exports.DomInspector = DomInspector;

