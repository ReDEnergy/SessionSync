define(function(require, exports) {
	'use strict';

	// ------------------------------------------------------------------------
	// Modules

	const { HTMLCreator } = require('../utils/dom');
	const { WindowEvents } = require('../utils/global-events');

	// ------------------------------------------------------------------------
	// API

	function UrlBar(document)
	{
		var DomElem = HTMLCreator(document);

		var url_bar = DomElem('div', {class: 'url-bar'});
		var url_arrow = DomElem('div', {class: 'arrow'});
		var url_value = DomElem('div', {class: 'url'});
		var copy_feedback = DomElem('div', {class: 'copy-feedback'});
		var input =  DomElem('input', {class: 'copy-input'});

		copy_feedback.textContent = 'Copied';
		url_arrow.textContent = 'url';
		url_bar.appendChild(input);
		url_bar.appendChild(url_arrow);
		url_bar.appendChild(url_value);
		url_bar.appendChild(copy_feedback);

		// ------------------------------------------------------------------------
		// Events

		var timeoutID = 0;
		var feedbackTimeoutID = 0;

		function clearTimeID() {
			clearTimeout(timeoutID);
		}

		function showURLInfoBar(url)
		{
			clearTimeout(timeoutID);
			url_value.textContent = url;
			url_bar.setAttribute('data-active', 'true');
			url_bar.addEventListener('mouseenter', clearTimeID);
			url_bar.addEventListener('mouseleave', hideURLInfoBar);
		}

		function hideURLInfoBar()
		{
			timeoutID = setTimeout(function() {
				url_bar.removeAttribute('data-active');
				url_bar.removeEventListener('mouseleave', clearTimeID);
				url_bar.removeEventListener('mouseenter', hideURLInfoBar);
			}, 1000);
		}

		function copyURLToClipboard()
		{
			input.value = url_value.textContent;
			input.select();
			document.execCommand('copy');

			clearTimeout(feedbackTimeoutID);
			copy_feedback.setAttribute('active', '');
			feedbackTimeoutID = setTimeout(function() {
				copy_feedback.removeAttribute('active');
			}, 1500);
		}

		WindowEvents.on(document, 'ShowUrlBar', showURLInfoBar);
		WindowEvents.on(document, 'HideUrlBar', hideURLInfoBar);
		WindowEvents.on(document, 'UrlBar-CopyURL', copyURLToClipboard);

		url_bar.addEventListener('click', copyURLToClipboard);

		// ------------------------------------------------------------------------
		// Public data

		this.DOMRoot = url_bar;
	}

	UrlBar.prototype.setAutoHideDelay = function setAutoHideDelay(miliseconds)  {
		this.hide_delay = miliseconds;
	};

	// ------------------------------------------------------------------------
	// Module exports

	exports.UrlBar = UrlBar;
});
