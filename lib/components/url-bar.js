'use strict';

// *****************************************************************************
// SDK Modules

const clipboard = require("sdk/clipboard");

// *****************************************************************************
// Custom Modules

const { HTMLCreator } = require('../utils/dom');
const { WindowEvents, GlobalEvents } = require('../utils/global-events');

// *****************************************************************************

function UrlBar(document)
{
	var window = document.ownerGlobal;
	var DomElem = HTMLCreator(document);

	var url_bar = DomElem('div', {class: 'url-bar'});
	var url_arrow = DomElem('div', {class: 'arrow'});
	var url_value = DomElem('div', {class: 'url'});
	var copy_feedback = DomElem('div', {class: 'copy-feedback'});
	copy_feedback.textContent = 'Copied';

	url_arrow.textContent = 'url';
	url_bar.appendChild(url_arrow);
	url_bar.appendChild(url_value);
	url_bar.appendChild(copy_feedback);

	// ------------------------------------------------------------------------
	// Events

	var timeoutID = 0;
	var feedbackTimeoutID = 0;

	function clearTimeID() {
		window.clearTimeout(timeoutID);
	}

	function showURLInfoBar(url)
	{
		window.clearTimeout(timeoutID);
		url_value.textContent = url;
		url_bar.setAttribute('data-active', 'true');
		url_bar.addEventListener('mouseenter', clearTimeID);
		url_bar.addEventListener('mouseleave', hideURLInfoBar);
	}

	function hideURLInfoBar()
	{
		timeoutID = window.setTimeout(function() {
			url_bar.removeAttribute('data-active');
			url_bar.removeEventListener('mouseleave', clearTimeID);
			url_bar.removeEventListener('mouseenter', hideURLInfoBar);
		}, 1000);
	}
	
	function copyURLToClipboard()
	{
		clipboard.set(url_value.textContent);
		window.clearTimeout(feedbackTimeoutID);
		copy_feedback.setAttribute('active', '');
		feedbackTimeoutID = window.setTimeout(function() {
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
};

UrlBar.prototype.setAutoHideDelay = function setAutoHideDelay(miliseconds)  {
	this.hide_delay = miliseconds;
};

// Public API
exports.UrlBar = UrlBar;