'use strict';

// *****************************************************************************
// Custom Modules

// App
import { AppConfig } from '../config';
import { HTMLCreator } from './dom';

// TODO - remove window/global events
import { WindowEvents, GlobalEvents } from './global-events';

// *****************************************************************************
// Bookmark Context Menu

var previousContextMenu = null;

export function ContextMenu(options) {
	var DomElem = HTMLCreator();

	// ------------------------------------------------------------------------
	// Create UI

	// var self = this;
	var menu = DomElem('div', { class: 'context-menu' });
	if (options.width != undefined) {
		menu.style.width = options.width + 'px';
	}

	var context = undefined;

	// ------------------------------------------------------------------------
	// Events

	var openMenu = (event) => {
		if (previousContextMenu && previousContextMenu != this) {
			previousContextMenu.hideMenu();
		}
		previousContextMenu = this;

		menu.setAttribute('data-active', 'true');
		var padding = 10;
		menu.style.left = Math.min(event.pageX, window.innerWidth - menu.clientWidth - padding) + 'px';
		menu.style.top = Math.min(event.pageY, window.innerHeight - menu.clientHeight - padding) + 'px';

		document.addEventListener('mousedown', blurMenu);

		WindowEvents.emit(document, 'ConfimBox-Hide');
	};

	var hideMenu = function hideMenu(e) {
		menu.removeAttribute('data-active');
		document.removeEventListener('mousedown', blurMenu);
		WindowEvents.emit(document, 'OverlaySystem', { state: false });
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

	// Actions
	// TODO - investigate switch to event delegation
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
		if (opt.globalEvent) {
			return function action() {
				GlobalEvents.emit(opt.globalEvent, context);
				hideMenu();
			};
		}
		return function action() {
			WindowEvents.emit(document, options.name + '-' + opt.event, context);
			hideMenu();
		};
	};

	var addMenuEntry = function AddMenuEntry(opt) {
		var event = NewAction(opt);
		var entry = DomElem('div', { class: 'button' });
		entry.textContent = opt.value;
		entry.setAttribute('icon', opt.icon);
		menu.appendChild(entry);

		var addSeparator = opt.separator;
		if (addSeparator != undefined) {
			var separator = DomElem('div', { class: 'separator' });
			menu.insertBefore(separator, addSeparator == 'top' ? entry : undefined);
		}

		entry.addEventListener('click', event);
	};

	// Register custom events
	WindowEvents.on(document, options.name + '-Open', function (options) {
		// menu.setAttribute('icons', options.showIcons ? 'yes' : 'no');
		openMenu(options.event);
		context = options.context;
		WindowEvents.emit(document, 'OverlaySystem', { state: true });
	});

	AppConfig.onChange('context.menu.icons', function (value) {
		menu.setAttribute('icons', value ? 'yes' : 'no');
	});

	// ------------------------------------------------------------------------
	// Public properties

	this.DOMRoot = menu;
	this.hideMenu = hideMenu;
	this.addMenuEntry = addMenuEntry;
}
