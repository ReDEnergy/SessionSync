define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules
	const { HTMLCreator } = require('./dom');
	const { WindowEvents, GlobalEvents } = require('./global-events');

	// *****************************************************************************
	// Global Variables

	var counterID = 0;

	function FieldEditWdiget(document, options)
	{
		var DomElem = HTMLCreator(document);

		// ------------------------------------------------------------------------
		// Create UI

		// Context will be the session folderID or bookmarkID
		var context = undefined;
		// Context data represents fields that need to be edited
		var context_data = null;

		var widgetID = counterID++;
		var fields = {};
		var first_field = null;

		// Edit session widget
		var widget = DomElem('div', {class: 'field-edit-widget'});
		var wfields = DomElem('div', {class: 'fields'});
		var save = DomElem('div', {class: 'button save'});
		var cancel = DomElem('div', {class: 'button cancel'});

		save.textContent = 'Save';
		cancel.textContent = 'Cancel';

		widget.appendChild(wfields);
		widget.appendChild(cancel);
		widget.appendChild(save);

		// ------------------------------------------------------------------------
		// Methods

		function addField(options)
		{
			var group = DomElem('div', {class: 'group'});

			var input = DomElem('input');

			var label = DomElem('label');
			label.textContent = options.label;

			group.appendChild(label);
			group.appendChild(input);
			wfields.appendChild(group);

			fields[options.name] = input;

			if (first_field == null) {
				first_field = input;
			}
		}

		function keyBoardShortcut(e)
		{
			if (e.keyCode == 13) {
				saveValues();
			}
		}

		function hideWidget()
		{
			first_field.blur();
			widget.removeAttribute('data-active');
			document.removeEventListener('keydown', keyBoardShortcut);
		}

		var hideIfNotInvoked = function hideIfNotInvoked(ID)
		{
			if (widgetID !== ID) hideWidget();
		};

		function invokeWidget(data)
		{
			context_data = data.fields;
			context = data.context;

			for (var key in data.fields) {
				if (data.fields[key]) {
					fields[key].value = data.fields[key];
				}
				else {
					if (fields.hasOwnProperty(key)) {
						fields[key].value = '';
						data.fields[key] = '';
					}
				}
			}

			widget.setAttribute('data-active', '');
			document.addEventListener('keydown', keyBoardShortcut);
			WindowEvents.emit(document, 'FieldWidgetInvoked', widgetID);
			first_field.focus();
		}

		function saveValues()
		{
			var obj = {};
			var prop_save = 0;
			for (var key in fields)
			{
				if (context_data[key] != fields[key].value)
				{
					prop_save++;
					obj[key] = fields[key].value;
				}
			}

			if (prop_save)
			{
				WindowEvents.emit(document, options.name + '-Save', {context: context, fields : obj});
			}

			hideWidget();
		}

		function destroy()
		{
			GlobalEvents.off('BookmarkRemoved', hideWidget);
		}

		// ------------------------------------------------------------------------
		// Create UI

		cancel.addEventListener('click', hideWidget);
		save.addEventListener('click', saveValues);

		GlobalEvents.on('BookmarkRemoved', hideWidget);
		WindowEvents.on(document, options.name + '-Invoke', invokeWidget);
		WindowEvents.on(document, 'FieldWidgetInvoked', hideIfNotInvoked);

		// ------------------------------------------------------------------------
		// Public properties

		this.DOMRoot = widget;
		this.addField = addField;
	}

	// Public API
	exports.FieldEditWdiget = FieldEditWdiget;
});