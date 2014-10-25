'use strict';

const {Ci} = require('chrome');
const windowUtils = require('sdk/window/utils');
const { XULCreator } = require("./dom");

function XULPanel(options) {

	// *************************************************************************
	// Attach New chrome UI only if window is a TopLevelWindow
	// chrome://browser/content/browser.xul
	if (!windowUtils.isBrowser(options.window))
		return;

	var display = false;
	var document = options.window.document;
	var XULElem = XULCreator(document);
	var panel = XULElem("box", {id: options.id, state: 'centered', show: 'false'});

	// *************************************************************************
	// Methods

	var show = function show() {
		display = true;
		panel.setAttribute('show', 'true');
		if (options.blur) {
			document.addEventListener('mousedown', clickEvent);
		}
	};

	var hide = function hide() {
		display = false;
		panel.setAttribute('show', 'false');
		if (options.blur) {
			document.removeEventListener('mousedown', clickEvent);
		}
	};

	var toggle = function toggle() {
		// console.log("display", display);
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
		document.removeEventListener('mousedown', clickEvent);
		XULElem = null;
		document = null;
		options.window = null;
		options = null;
		panel = null;
	};

	// *************************************************************************
	// Init

	function clickEvent(e) {
		if (e.target.id === "action-button--sessionsyncgabrielivanicacom-syncbtn")
			return;
		var target = e.target.parentElement;
		while (target) {
			if (target.id === options.id)
				return;
			target = target.parentElement;
		}
		hide();
	}

	panel.appendChild(options.content);
	var chromeNode = document.getElementById(options.append);
	chromeNode.parentElement.appendChild(panel);

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