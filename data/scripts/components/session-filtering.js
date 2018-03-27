define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	const { AppConfig } = require('../config');
	const { WindowEvents, GlobalEvents } = require('../utils/global-events');
	const { HTMLCreator } = require('../utils/dom');

	// *****************************************************************************
	// API

	/*
	* SessionFiltering
	*/

	function SessionFiltering(document)
	{
		var DomElem = HTMLCreator(document);

		// ------------------------------------------------------------------------
		// Create UI

		var panel = DomElem('div', {class: 'search-bar', content: 'false', match: 'true'});

		var createSession = DomElem('div', {class: 'create-session' });
		panel.appendChild(createSession);

		var close = DomElem('div', {class: 'close' });
		panel.appendChild(close);

		var searchInput = DomElem('input', {type: 'text', class: 'search', placeholder:'Search'});
		panel.appendChild(searchInput);

		// ------------------------------------------------------------------------
		// Methods

		var timeOut = null;
		var prevValue = '';

		var dismiss = function dismiss()
		{
			clearTimeout(timeOut);
			if (searchInput.value.length) {
				prevValue = '';
				searchInput.value = prevValue;
				WindowEvents.emit(document, 'FilterSessions', searchInput.value.toLowerCase());
			}

			searchInput.blur();
			onBlur();

			panel.setAttribute('content', searchInput.value != '');
			WindowEvents.emit(document, 'SetUIState', {'search-box-content': searchInput.value != ''});
		};

		var onKeyDown = function()
		{
			if (prevValue == searchInput.value)
				return;

			prevValue = searchInput.value;
			panel.setAttribute('match', 'false');
			panel.setAttribute('content', searchInput.value != '');
			WindowEvents.emit(document, 'SetUIState', {'search-box-content': searchInput.value != ''});
			clearTimeout(timeOut);
			timeOut = setTimeout(function () {
				WindowEvents.emit(document, 'FilterSessions', searchInput.value.toLowerCase());
			}, 200);
		};

		var onFocus = function onFocus() {
			panel.setAttribute('active', true);
			document.addEventListener('keyup', onKeyDown);
		};

		var onBlur = function onBlur() {
			if (searchInput.value == '') {
				panel.setAttribute('active', false);
			}
			document.removeEventListener('keyup', onKeyDown);
		};

		// ------------------------------------------------------------------------
		// Events

		// Tooltip events
		createSession.addEventListener('mouseover', function(e) {
			WindowEvents.emit(document, 'ShowTooltip', {
				node: e.target,
				message: 'Create session',
			});
		});

		createSession.addEventListener('mouseleave', function() {
			WindowEvents.emit(document, 'HideTooltip');
		});

		createSession.addEventListener('click', function() {
			GlobalEvents.emit('CreateNewSession', searchInput.value);
			WindowEvents.emit(document, 'HideTooltip');
		});

		close.addEventListener('click', dismiss);

		searchInput.addEventListener('focus', onFocus);
		searchInput.addEventListener('blur', onBlur);

		WindowEvents.on(document, 'FilterSessionsExactMatch', function(isMatch) {
			panel.setAttribute('match', isMatch);
		});

		WindowEvents.on(document, 'FocusSessionFilter', function () {
			searchInput.focus();
		});

		// ------------------------------------------------------------------------
		// Init state

		this.init = function init()
		{
			var activeFilter = AppConfig.get('session.active.filter');
			if (activeFilter && activeFilter.length > 0) {
				searchInput.value = activeFilter;
				panel.setAttribute('active', true);
				onKeyDown();
			}
		};

		// ------------------------------------------------------------------------
		// Public properties

		this.DOMRoot = panel;
	}

	// Public API
	exports.SessionFiltering = SessionFiltering;
});