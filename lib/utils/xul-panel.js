'use strict';

// *****************************************************************************
// SDK Modules

const {Ci} = require('chrome');
const windowUtils = require('sdk/window/utils');

// *****************************************************************************
// Custom Modules

const { XULCreator } = require("./dom");

// *****************************************************************************
// Awesome Session Sync UI

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

	options.onHide = typeof options.onHide === 'function' ? options.onHide : function () {};
	options.onShow = typeof options.onShow === 'function' ? options.onShow : function () {};

	var show = function show() {
		display = true;
		panel.setAttribute('show', 'true');
		if (options.blur) {
			options.window.addEventListener('mousedown', clickEvent);
		}
		options.onShow();
	};

	var hide = function hide() {
		display = false;
		panel.setAttribute('show', 'false');
		if (options.blur) {
			options.window.removeEventListener('mousedown', clickEvent);
		}
		options.onHide();
	};

	var toggle = function toggle() {
		display === true ? hide() : show();
		return display;
	};

	var isVisible = function isVisible() {
		return display;
	};

	var center = function center() {
		panel.setAttribute('state', 'centered');
		panel.removeAttribute('style');
	};

	var hideOnWindowResize = function hideOnWindowResize() {
		hide();
		options.window.removeEventListener('resize', hideOnWindowResize);
	};

	var pin = function pin(top, side, mode) {
		// console.log(top, side, mode);
		panel.setAttribute('state', 'pinned-' + mode);
		panel.style.top = top + 'px';
		panel.style.left = side + 'px';
		options.window.addEventListener('resize', hideOnWindowResize);
	};

	var destroy = function destroy() {
		panel.parentElement.removeChild(panel);
		options.window.removeEventListener('mousedown', clickEvent);
		XULElem = null;
		document = null;
		options = null;
		panel = null;
	};
	
	var appendChild = function appendChild(node) {
		panel.appendChild(node);
	};

	// *************************************************************************
	// Init

	function clickEvent(e) {
		if (e.target.id === "action-button--session-syncgabrielivanicacom-syncbtn")
			return;
		var target = e.target.parentElement;
		while (target) {
			if (target.id === options.id)
				return;
			target = target.parentElement;
		}
		hide();
	}

	var attachmentNode = document.getElementById(options.appendTo);
	attachmentNode.appendChild(panel);

	// *************************************************************************
	// Return Object

	return {
		pin : pin,
		hide : hide,
		show : show,
		toggle : toggle,
		center : center,
		destroy : destroy,
		isVisible : isVisible,
		appendChild : appendChild
	};
}

// *****************************************************************************
// Module exports
exports.XULPanel = XULPanel;