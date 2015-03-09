'use strict';

// *****************************************************************************
// Custom Modules

const { HTMLCreator } = require('./dom');
const { EventDestroyer } = require('./event-destroyer');
const { WindowEvents, GlobalEvents } = require('./global-events');
const { AppConfig } = require('../config');

var ID = 0;

// *****************************************************************************
// Bookmark Context Menu

function ContextMenu(document, options) {
	var DomElem = HTMLCreator(document);

	var menu = DomElem('div', {class : 'context-menu'});
	var context = undefined;
	var contextID = ID++;

	// ContextMenu Events

	var openMenu = function openMenu(event) {
		menu.setAttribute('data-active', 'true');
		menu.style.left = event.pageX + 'px';
		menu.style.top = event.pageY + 'px';

		document.addEventListener('mousedown', blurMenu);
		document.defaultView.addEventListener('resize', hideMenu);

		WindowEvents.emit(document, 'ContextMenuOpen', contextID);
		WindowEvents.emit(document, 'ConfimBox-Hide');
	};

	var hideMenu = function hideMenu() {
		menu.removeAttribute('data-active');
		document.removeEventListener('mousedown', blurMenu);
		document.defaultView.removeEventListener('resize', hideMenu);
	};

	var blurMenu = function hideWhenClickOutside(e) {
		var target = e.target;
		while (target) {
			if (target === menu)
				return;
			target = target.parentElement;
		}
		hideMenu();
	};

	// TODO - investigate switch to event delegation
	// Actions
	var NewAction = function NewAction(opt) {
		if (opt.func) {
			return function actionEvent(e) {
				context[opt.func](e);
				hideMenu();
			};
		}
		if (opt.callback) {
			return function actionEvent(e) {
				opt.callback(context, e);
				hideMenu();
			};
		}
		return function action(e) {
			WindowEvents.emit(document, options.name + '-' + opt.event, context);
			hideMenu();
		};
	};

	var addMenuEntry = function AddMenuEntry(opt) {
		var event = NewAction(opt);
		var entry = DomElem('div', {class : 'button'});
		entry.textContent = opt.value;
		menu.appendChild(entry);

		entry.addEventListener('click', event);
		EventDestroyer.add(entry, 'click', event);
	};

	// Register custom events
	WindowEvents.register(document, options.name + '-Open', openMenu);
	WindowEvents.register(document, options.name + '-Context', function(ctx) {
		context = ctx;
	});

	WindowEvents.register(document, 'UIToggleOff', hideMenu);
	WindowEvents.register(document, 'ContextMenuOpen', function (ctxID) {
		if (contextID !== ctxID) hideMenu();
	});

	// Attach ContextMenu to UI
	var UI = document.getElementById(AppConfig.get('addonID'));
	UI.appendChild(menu);

	// return properties
	this.addMenuEntry = addMenuEntry;
}

// *****************************************************************************
// Public API
exports.ContextMenu = ContextMenu;