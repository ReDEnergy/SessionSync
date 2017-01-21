'use strict';

// *****************************************************************************
// Custom Modules

const { AppConfig } = require('../config');
const { HTMLCreator } = require('./dom');
const { EventDestroyer } = require('./event-destroyer');
const { WindowEvents, GlobalEvents } = require('./global-events');

var ID = 0;

// *****************************************************************************
// Bookmark Context Menu

var previousContextMenu = null;

function ContextMenu(document, options)
{
	var DomElem = HTMLCreator(document);

	// ------------------------------------------------------------------------
	// Create UI

	var self = this;
	var menu = DomElem('div', {
		class : 'context-menu',
		icons : AppConfig.storage.style.contextMenuIcons ? 'yes' : 'no' 
	});
	menu.style.width = options.width + 'px';
	var context = undefined;
	var contextID = ID++;

	// ------------------------------------------------------------------------
	// Events

	var openMenu = function openMenu(event) {

		if (previousContextMenu && previousContextMenu != this) {
			previousContextMenu.hideMenu();
		}
		previousContextMenu = this;

		menu.setAttribute('data-active', 'true');
		menu.style.left = event.pageX + 'px';
		menu.style.top = event.pageY + 'px';

		document.addEventListener('mousedown', blurMenu);

		// TODO - window 'resize' event is triggerd from multiple window instances - all tabs / tab wrappers / Firefox UI
		// Test if the 'resize' event comes from the current window
		// BUG: the event is triggerd for tab content as well as chrome window... need to treat both of them
		// if (self != this) {
			// if (document.ownerGlobal != this) {
				// console.log("Stupid Firefox");
				// return;
			// }
		// };		// document.ownerGlobal.addEventListener('resize', hideMenu);

		WindowEvents.emit(document, 'ConfimBox-Hide');
	}.bind(this);

	var hideMenu = function hideMenu(e) {
		
		menu.removeAttribute('data-active');
		document.removeEventListener('mousedown', blurMenu);

		// document.ownerGlobal.removeEventListener('resize', hideMenu);
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
			return function action(e) {
				GlobalEvents.emit(opt.globalEvent, context);
				hideMenu();
			};
		}		
		return function action(e) {
			WindowEvents.emit(document, options.name + '-' + opt.event, context);
			hideMenu();
		};
	};

	var addMenuEntry = function AddMenuEntry(opt)
	{
		var event = NewAction(opt);
		var entry = DomElem('div', {class : 'button'});
		entry.textContent = opt.value;
		entry.setAttribute('icon', opt.icon);
		menu.appendChild(entry);
		
		var addSeparator = opt.separator;
		if (addSeparator != undefined)
		{
			var separator = DomElem('div', {class : 'separator'});
			menu.insertBefore(separator, addSeparator == 'top' ? entry : undefined);
		}

		entry.addEventListener('click', event);
		EventDestroyer.add(entry, 'click', event);
	};

	// Register custom events
	WindowEvents.on(document, options.name + '-Open', function(options) {
		openMenu(options.event);
		context = options.context;
	});

	WindowEvents.on(document, 'UIToggledOff', hideMenu);

	GlobalEvents.on('cfg.style.contextMenuIcons', function(value) {
		menu.setAttribute('icons', value ? 'yes' : 'no');
	});
	
	// WindowEvents.on(document, 'ContextMenuOpen', function (ctxID) {
		// if (contextID !== ctxID) hideMenu();
	// });

	// ------------------------------------------------------------------------
	// Public properties

	this.DOMRoot = menu;
	this.hideMenu = hideMenu;
	this.addMenuEntry = addMenuEntry;
}

// *****************************************************************************
// Public API
exports.ContextMenu = ContextMenu;