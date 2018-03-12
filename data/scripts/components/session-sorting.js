define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	// Utils
	const { HTMLCreator } = require('../utils/dom');
	const { WindowEvents } = require('../utils/global-events');

	// *****************************************************************************
	// API

	function SessionSorting(document)
	{
		// Create DomHealper
		var DomElem = HTMLCreator(document);

		// ------------------------------------------------------------------------
		// UI

		// Session ordering
		var sortControl = DomElem('div', {class: 'sorting-method', tooltip: 'Sort sessions'});

		// Sorting dropdown
		var optionList = DomElem('div', {class: 'option-list'});

		var options = ['name-asc', 'name-desc', 'position-asc', 'position-desc', 'date-asc', 'date-desc'];
		var optionsDescription = ['name ↑', 'name ↓', 'position ↑', 'position ↓', 'date ↑', 'date ↓'];
		for (var i = 0; i < options.length; i++)
		{
			var option = DomElem('div', {class: 'option', value: options[i]});
			option.textContent =  optionsDescription[i];
			optionList.appendChild(option);
		}

		var dropdown = DomElem('div', {class: 'dropdown'});
		dropdown.appendChild(optionList);
		sortControl.appendChild(dropdown);

		var activeButton = optionList.children[2];
		activeButton.setAttribute('active', '');

		// ------------------------------------------------------------------------
		// Events

		optionList.addEventListener('click', function(e) {
			if (e.target.className == 'option') {
				if (e.target != activeButton) {
					activeButton.removeAttribute('active');
					activeButton = e.target;
					var value = activeButton.getAttribute('value');
					activeButton.setAttribute('active', '');
				}
				WindowEvents.emit(document, 'SortSessionsBy', value);
			}
		});

		var state = false;
		var toggleState = function toggleState() {
			state = !state;
			sortControl.setAttribute('active', state);
		};

		// sortControl.addEventListener('click', toggleState);

		document.addEventListener('click', function(e) {
			if (e.target.className == 'sorting-method') {
				toggleState();
			}
			else {
				if (state == true)
					toggleState();
			}
		});

		// Tooltip events
		sortControl.addEventListener('mouseover', function(e) {
			var tooltipMsg = e.target.getAttribute('tooltip');
			if (tooltipMsg) {
				WindowEvents.emit(document, 'ShowTooltip', {
					node: e.target,
					message: tooltipMsg
				});
			} else {
				WindowEvents.emit(document, 'HideTooltip');
			}
		});

		sortControl.addEventListener('mouseleave', function() {
			WindowEvents.emit(document, 'HideTooltip');
		});

		// ------------------------------------------------------------------------
		// Data

		this.DOMRoot = sortControl;
	}

	// *****************************************************************************
	// Public API

	exports.SessionSorting = SessionSorting;
});