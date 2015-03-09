'use strict';

// *****************************************************************************
// SDK Modules

const { setTimeout, clearTimeout } = require("sdk/timers");
const clipboard = require("sdk/clipboard");

// *****************************************************************************
// Custom Modules

const { HTMLCreator } = require('./utils/dom');
const { WindowEvents, GlobalEvents } = require('./utils/global-events');

// *****************************************************************************

function UrlBar(document) {
	var DomElem = HTMLCreator(document);

	//--------------------------------------------------------------------------
	var url_bar = DomElem('div', {class: 'bookmark-url'});
	var url_arrow = DomElem('div', {class: 'arrow'});
	var url_value = DomElem('div', {class: 'url'});

	url_arrow.textContent = 'url';
	url_bar.appendChild(url_arrow);
	url_bar.appendChild(url_value);

	var timeoutID = 0;

	function clearTimeID() {
		clearTimeout(timeoutID);
	}

	function showURLInfoBar(bookmark) {
		clearTimeout(timeoutID);
		url_value.textContent = bookmark.url;
		url_bar.setAttribute('data-active', 'true');
		url_bar.addEventListener('mouseenter', clearTimeID);
		url_bar.addEventListener('mouseleave', hideURLInfoBar);
	}

	function hideURLInfoBar() {
		timeoutID = setTimeout(function() {
			url_bar.removeAttribute('data-active');
			url_bar.removeEventListener('mouseleave', clearTimeID);
			url_bar.removeEventListener('mouseenter', hideURLInfoBar);
		}, 1000);
	}

	WindowEvents.register(document, 'showUrlBar', showURLInfoBar);
	WindowEvents.register(document, 'hideUrlBar', hideURLInfoBar);

	url_bar.addEventListener('click', function() {
		clipboard.set(url_value.textContent);
	});

	this.DOMRoot = url_bar;
};

UrlBar.prototype.setAutoHideDelay = function setAutoHideDelay(miliseconds)  {
	this.hide_delay = miliseconds;
};

// Public API
exports.UrlBar = UrlBar;