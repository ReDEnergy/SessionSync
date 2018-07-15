define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	// Utils
	const { AppConfig } = require('../config');
	const { HTMLCreator } = require('../utils/dom');
	const { WindowEvents } = require('../utils/global-events');

	// *****************************************************************************
	// API

	function SessionSorting()
	{
		// Create DomHealper
		var DomElem = HTMLCreator();

		// ------------------------------------------------------------------------
		// UI

		// Session ordering
		var sortControl = DomElem('div', {class: 'sorting-method', tooltip: 'Sort sessions'});

		// Sorting dropdown
		var optionList = DomElem('div', {class: 'option-list'});

		var options = {
			'name-asc' : { description: 'name ↑', index: 0 },
			'name-desc' : { description: 'name ↓', index: 1 },
			'position-asc' : { description: 'position ↑', index: 2 },
			'position-desc' : { description: 'position ↓', index: 3 },
			'date-asc' : { description: 'date ↑', index: 4 },
			'date-desc' : { description: 'date ↓', index: 5 }
		};

		for (var key in options)
		{
			var option = DomElem('div', {class: 'option', value: key});
			option.textContent =  options[key].description;
			optionList.appendChild(option);

		}

		var dropdown = DomElem('div', {class: 'dropdown'});
		dropdown.appendChild(optionList);
		sortControl.appendChild(dropdown);

		var sortMethod = AppConfig.get('session.sorting');
		if (options[sortMethod]) {
			var activeButton = optionList.children[options[sortMethod].index];
			activeButton.setAttribute('active', '');
		}

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
			WindowEvents.emit(document, 'OverlaySystem', { state: state, zIndex: 1 });
		};

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