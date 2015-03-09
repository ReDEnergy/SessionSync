'use strict';

// *****************************************************************************
// SDK Modules
const { emit } = require("sdk/event/core");
const { setTimeout, clearTimeout } = require("sdk/timers");

// *****************************************************************************
// Custom Modules
const { HTMLCreator } = require('./dom');
const { WindowEvents, GlobalEvents } = require('./global-events');
const DOMUtils = require('./dom-utils');

// *****************************************************************************
// Global Variables

var counterID = 0;

function FieldEditWdiget(document, options) {
	var DomElem = HTMLCreator(document);

	// Context will be session folderID or bookmarkID
	var context = undefined;
	var widgetID = counterID++;
	var fields = [];

	// Edit session widget
	var widget = DomElem('div', {class: 'field-edit-widget'});
	var wfields = DomElem('div', {class: 'fields'});
	var save = DomElem('div', {class: 'button'});
	var cancel = DomElem('div', {class: 'button'});

	save.textContent = 'Save';
	cancel.textContent = 'Cancel';

	widget.appendChild(wfields);
	widget.appendChild(cancel);
	widget.appendChild(save);

	function addField(options) {
		var group = DomElem('div', {class: 'group'});
		var label = DomElem('label');
		var input = DomElem('input');
		label.textContent = options.label;

		group.appendChild(label);
		group.appendChild(input);
		wfields.appendChild(group);

		fields[options.name] = input;
	}

	function keyBoardShortcut(e) {
		switch (e.keyCode) {
			case 27:
				hideWidget();
				break;
			case 13:
				saveValues();
				break;
		}
	}

	function hideWidget() {
		widget.removeAttribute('data-active');
		document.removeEventListener('keydown', keyBoardShortcut);
		document.defaultView.removeEventListener('resize', hideWidget);
	}

	var hideIfNotInvoked = function hideIfNotInvoked(ID) {
		if (widgetID !== ID) hideWidget();
	};

	function invokeWidget(data) {
		context = data.context;

		// TODO: make safe - test for undefined or missing keys
		for (var key in data.fields) {
			fields[key].value = data.fields[key];
		}

		widget.setAttribute('data-active', '');
		document.addEventListener('keydown', keyBoardShortcut);
		document.defaultView.addEventListener('resize', hideWidget);
		WindowEvents.emit(document, 'FieldWidgetInvoked', widgetID);
	}

	function saveValues() {
		var obj = {};
		for (var key in fields) {
			obj[key] = fields[key].value;
		}
		WindowEvents.emit(document, options.name + '-Save', {context: context, fields : obj});
		hideWidget();
	}

	function destroy() {
		GlobalEvents.off('BookmarkRemoved', hideWidget);
	}

	// Events
	cancel.addEventListener('click', hideWidget);
	save.addEventListener('click', saveValues);

	GlobalEvents.on('BookmarkRemoved', hideWidget);
	WindowEvents.register(document, 'UIToggleOff', hideWidget);
	WindowEvents.register(document, 'InstanceDestroy', destroy);
	WindowEvents.register(document, options.name + '-Invoke', invokeWidget);
	WindowEvents.register(document, 'FieldWidgetInvoked', hideIfNotInvoked);

	// Attach ContextMenu to UI
	options.parent.appendChild(widget);

	// public API
	this.addField = addField;
};

// Public API
exports.FieldEditWdiget = FieldEditWdiget;