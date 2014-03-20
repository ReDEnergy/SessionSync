'use strict';

const PP = require('prettyprint');

const {Ci} = require('chrome');
const windowUtils = require('sdk/window/utils');
const { XULCreator } = require("dom");

function XULPanel(options) {

	// *************************************************************************
	// Attach New chrome UI only if window is a TopLevelWindow
	// chrome://browser/content/browser.xul
	if (!windowUtils.isBrowser(options.window))
		return;

	var display = false;
	var window = options.window;
	var document = window.document;
	var XULElem = XULCreator(document);
	var panel = XULElem("box", {id: options.id, state: 'centered'});

	// *************************************************************************
	// Methods

	var show = function show() {
		display = true;
		panel.setAttribute('show', 'true');
		document.addEventListener('mousedown', clickEvent);
	};

	var hide = function hide() {
		display = false;
		panel.setAttribute('show', 'false');
		document.removeEventListener('mousedown', clickEvent);
	};

	var toggle = function toggle() {
		display === true ? hide() : show();
		return display;
	};

	var appendContent = function appendContent() {
		panel.appendChild(options.content);
	};

	var center = function center() {
		panel.setAttribute('state', 'centered');
		panel.removeAttribute('style');
	};

	var pin = function pin(top, side, mode) {
		// console.log(top, side, mode);
		panel.setAttribute('state', 'pinned-' + mode);
		panel.style.top = top + 'px';
		panel.style.left = side + 'px';

	};

	var destroy = function destroy() {
		panel.parentElement.removeChild(panel);
		console.log('Destroy panel', panel);
	};

	// *************************************************************************
	// Init

	function clickEvent(e) {
		// getBoundingClientRect must add margin from CSS
		var rect = panel.getBoundingClientRect();
		// console.log(e.target, e.clientX, e.clientY);
		// console.log(rect.top, rect.right, rect.bottom, rect.left);
		if (e.clientX < rect.left || e.clientX > rect.right ||
			e.clientY < rect.top || e.clientY > rect.bottom)
			hide();
	}

	hide();
	panel.appendChild(options.content);
	var chromeNode = document.getElementById(options.append);
	chromeNode.parentElement.insertBefore(panel, chromeNode);

	// *************************************************************************
	// Return Object

	return {
		pin : pin,
		hide : hide,
		show : show,
		toggle : toggle,
		center : center,
		destroy : destroy,
		appendContent : appendContent
	};
}

// *****************************************************************************
// Module exports
exports.XULPanel = XULPanel;