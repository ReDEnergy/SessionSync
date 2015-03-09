'use strict';

// *****************************************************************************
// Custom Modules

const { HTMLCreator } = require('./dom');
const { EventDestroyer } = require('./event-destroyer');
const { WindowEvents, GlobalEvents } = require('./global-events');
const { AppConfig } = require('../config');

var ID = 0;

// *****************************************************************************
// Bookmark Confirm Box

function ConfirmBox(document, options) {
	var DomElem = HTMLCreator(document);

	var panel = DomElem('div', {class : 'confirm-box'});
	var info = DomElem('div', {class : 'info'});
	var ok = DomElem('div', {class : 'button ok'});
	var cancel = DomElem('div', {class : 'button cancel'});

	var defaultCallback = function defaultCallback() {};
	var callback = defaultCallback;

	info.textContent = 'Delete?';
	ok.textContent = 'OK';
	cancel.textContent = 'Cancel';
	panel.appendChild(info);
	panel.appendChild(ok);
	panel.appendChild(cancel);

	var context = undefined;
	var contextID = ID++;

	// ConfirmBox Events

	ok.addEventListener('click', function() {
		callback();
		hidePanel();
	});

	cancel.addEventListener('click', function() {
		hidePanel();
	});

	var openPanel = function openPanel(event) {
		panel.setAttribute('data-active', 'true');
		panel.style.left = event.pageX + 'px';
		panel.style.top = event.pageY + 'px';

		document.addEventListener('mousedown', blurMenu);
		document.defaultView.addEventListener('resize', blurMenu);

		GlobalEvents.emit('ConfimBoxOpen', contextID);
	};

	var hidePanel = function hidePanel() {
		panel.removeAttribute('data-active');
		document.removeEventListener('mousedown', blurMenu);
		document.defaultView.removeEventListener('resize', blurMenu);
		callback = defaultCallback;
	};

	var hideIfNotInvoked = function hideIfNotInvoked(ctxID) {
		if (contextID !== ctxID) hidePanel();
	};

	var blurMenu = function hideWhenClickOutside(e) {
		var target = e.target;
		while (target) {
			if (target === panel)
				return;
			target = target.parentElement;
		}
		hidePanel();
	};

	function setCallback(func) {
		callback = typeof func === 'function' ? func : defaultCallback;
	}

	function destroy() {
		GlobalEvents.off('ConfimBoxOpen', hideIfNotInvoked);
	}

	GlobalEvents.on('ConfimBoxOpen', hideIfNotInvoked);

	// Register custom events
	WindowEvents.register(document, options.name + '-Open', openPanel);
	WindowEvents.register(document, options.name + '-Callback', setCallback);
	WindowEvents.register(document, 'UIToggleOff', hidePanel);
	WindowEvents.register(document, 'InstanceDestroy', destroy);
	WindowEvents.register(document, 'ConfimBox-Hide', hidePanel);

	// Attach ConfirmBox to UI
	var UI = document.getElementById(AppConfig.get('addonID'));
	UI.appendChild(panel);
}

// *****************************************************************************
// Public API
exports.ConfirmBox = ConfirmBox;