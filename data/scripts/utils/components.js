define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	const { HTMLCreator } = require('./dom');
	const JSUtils = require('./general');

	// *****************************************************************************
	// API

	/*
	* Toggle switch
	*/

	function ToggleSwitch(document, options)
	{
		var DomElem = HTMLCreator(document);

		var state = options.state;

		var entry = DomElem('div', {class: 'comp-toggle-switch'});
		var title = DomElem('div', {class: 'label'});

		if (options.attribute) {
			entry.setAttribute(options.attribute, '');
		}

		if (options.description) {
			title.textContent = options.description;
		}

		var button = DomElem('div', {class: 'switch'});
		button.setAttribute('state', state);
		button.textContent = state ? options.onState : options.offState;

		if (options.tooltip) {
			entry.setAttribute('tooltip', options.tooltip);
			title.setAttribute('tooltip', options.tooltip);
			button.setAttribute('tooltip', options.tooltip);
		}

		entry.appendChild(title);
		entry.appendChild(button);

		function setState(newState)
		{
			if (state == newState)
				return;

			state = newState;
			options.callback(state);
			button.setAttribute('state', state);
			button.textContent = state ? options.onState : options.offState;
		}

		entry.addEventListener('click', function() {
			setState(!state);
		});

		this.setState = setState;
		this.DOMRoot = entry;
	}

	/*
	* RageControl
	*/

	function RangeControl(document, options)
	{
		var DomElem = HTMLCreator(document);

		// ------------------------------------------------------------------------
		// Create UI

		var value = options.value;
		var step = options.step ? options.step : 1;
		var callback = JSUtils.getValidFunction(options.onChange);

		var root =  DomElem('div', {class: 'comp-range-control'});

		var sectionInfo =  DomElem('div', {class: 'label'});
		sectionInfo.textContent = options.description;

		var container =  DomElem('div', {class: 'range-input'});
		var incButton =  DomElem('div', {class: 'button inc'});
		var decButton =  DomElem('div', {class: 'button dec'});
		var valueBox =  DomElem('input', {type: 'text', class: 'value'});
		valueBox.value = value;

		root.appendChild(sectionInfo);
		root.appendChild(container);
		container.appendChild(decButton);
		container.appendChild(valueBox);
		container.appendChild(incButton);

		var setValue = function setValue(newValue, trigger)
		{
			// revent update trigger with the same value
			if (value == newValue) {
				return;
			}

			// restrict to specified range
			if (options.minValue > newValue) { newValue = options.minValue; }
			if (options.maxValue < newValue) { newValue = options.maxValue; }

			if (newValue % step != 0) {
				newValue -= newValue % step;
			}

			// update value
			var diff = newValue - value;
			value = newValue;
			valueBox.value = newValue;

			if (trigger) {
				callback(newValue, diff);
			}
		};

		var onChange = function onChange()
		{
			var newValue = valueBox.value | 0;
			if (parseInt(valueBox.value) != newValue) {
				valueBox.value = value;
				return;
			}

			setValue(newValue, true);
		};

		valueBox.addEventListener('change', function() {
			onChange(true);
		});

		incButton.addEventListener('click', function() {
			setValue(value + step, true);
		});

		decButton.addEventListener('click', function() {
			setValue(value - step, true);
		});

		// ------------------------------------------------------------------------
		// Public properties

		this.DOMRoot = root;
		this.setValue = setValue;
	}

	function ToggleButton(document, options)
	{
		var DomElem = HTMLCreator(document);

		// ------------------------------------------------------------------------
		// Create UI

		var state = options.state;
		var callback = JSUtils.getValidFunction(options.callback);

		var container = DomElem('div', {class: 'comp-toggle-button'});
		var info = DomElem('div', {class: 'label'});
		info.textContent = options.description;

		var button = DomElem('div', {class: 'button'});
		button.setAttribute('state', state);
		button.textContent = state ? options.onState : options.offState;

		container.appendChild(info);
		container.appendChild(button);

		// ------------------------------------------------------------------------
		// Events

		var toggle = function toggle() {
			setValue(!state, true);
		};

		var setValue = function setValue(value, trigger) {
			if (value != state) {
				state = value;
				button.setAttribute('state', state);
				button.textContent = state ? options.onState : options.offState;
				if (trigger) {
					callback(state);
				}
			}
		};

		button.addEventListener('click', toggle);

		// ------------------------------------------------------------------------
		// Public properties

		this.toggle = toggle;
		this.setValue = setValue;
		this.DOMRoot = container;
	}

	function DropDown(document, options)
	{
		var DomElem = HTMLCreator(document);

		// ------------------------------------------------------------------------
		// Create UI

		var container = DomElem('div', {class: 'comp-dropdown'});
		if (options.id) {
			container.setAttribute('id', options.id);
		}

		var info = DomElem('div', {class: 'label'});
		info.textContent = options.description;

		var select = DomElem('div', {class: 'select'});
		var selectValue = DomElem('div', {class: 'select-value'});
		selectValue.textContent = options.value;

		var dropList = DomElem('div', {class: 'drop-list', visible: 'false'});

		container.appendChild(info);
		container.appendChild(select);
		select.appendChild(selectValue);
		select.appendChild(dropList);

		function addOption(label, value, selected) {
			var option = DomElem('div', {class: 'option'});
			option.textContent = label;
			option.setAttribute('value', value);
			dropList.appendChild(option);
			if (selected === true) {
				setSelected(option);
			}
		}

		// ------------------------------------------------------------------------
		// Events

		var selectedOption;
		var visible = false;
		var callback = JSUtils.getValidFunction(options.onChange);

		var setValue = function(value, trigger) {
			for (var i=0; i<dropList.children.length; i++) {
				if (dropList.children[i].getAttribute('value') == value) {
					setSelected(dropList.children[i], trigger);
					return;
				}
			}
		};

		var setSelected = function setSelected(node, trigger) {
			if (selectedOption)
				selectedOption.removeAttribute('selected');

			selectedOption = node;

			if (selectedOption) {
				var value = node.getAttribute('value');
				selectValue.textContent = node.textContent;
				container.setAttribute('value', value);
				selectedOption.setAttribute('selected', '');
				if (trigger) {
					callback(value);
				}
			}
		};

		var closeDropdown = function closeDropdown(e) {
			e.stopPropagation();
			visible = false;
			dropList.setAttribute('visible', visible);
			document.removeEventListener('click', closeDropdown);
		};

		select.addEventListener('click', function(e) {
			e.stopPropagation();
			visible = !visible;
			dropList.setAttribute('visible', visible);
			document.addEventListener('click', closeDropdown);
		});

		dropList.addEventListener('click', function(e) {
			if (e.target.className == 'option') {
				setSelected(e.target, true);
				closeDropdown(e);
			}
		});

		// ------------------------------------------------------------------------
		// Public properties

		this.container = container;
		this.addOption = addOption;
		this.setValue = setValue;
	}

	// *****************************************************************************
	// Public API

	exports.DropDown = DropDown;
	exports.ToggleSwitch = ToggleSwitch;
	exports.RangeControl = RangeControl;
	exports.ToggleButton = ToggleButton;

});