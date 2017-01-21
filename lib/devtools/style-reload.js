'use strict';

const DEV_MODE = false;

// *****************************************************************************
// SDK Modules

const { data } = require('sdk/self');
const { Hotkey } = require('sdk/hotkeys');
var pageWorkers = require("sdk/page-worker");

// ****************************************************************************
// 3rd Party Modules
const userstyles = require('../3rd/userstyles');

// *****************************************************************************
// Custom Modules

const { WindowEvents, GlobalEvents } = require('../utils/global-events');
const { HTMLCreator } = require('../utils/dom');

if (DEV_MODE)
{
	var worker = pageWorkers.Page({
		contentURL: 'http://localhost:8888/',
		contentScriptFile: data.url('socket.io/awesome.js'),
		contentScriptFileWhen: 'end',
	});
	
	worker.port.on('update', function() {
		ReloadGlobalStyle();
	});
}

function ReloadGlobalStyle()
{
	console.log(data.url('overlay.css'));
	userstyles.load('http://localhost:8080/data/overlay.css');
}

function CSSStylingReload(document)
{
	// Create DomHealper 
	var DomElem = HTMLCreator(document);

	// Button 
	var button = DomElem('div', {class: 'button style-reload', tooltip: 'Reload stylesheet'});

	// Events
	button.addEventListener('click', ReloadGlobalStyle);
	
	// Public properties
	this.DOMRoot = button;
};


// *****************************************************************************
// Public API
exports.CSSStylingReload = CSSStylingReload;

