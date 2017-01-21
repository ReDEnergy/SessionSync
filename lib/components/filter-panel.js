'use strict';


// *****************************************************************************
// SDK Modules

const { storage: simpleStorage } = require('sdk/simple-storage');

// *****************************************************************************
// Custom Modules

const { WindowEvents, GlobalEvents } = require('../utils/global-events');
const { HTMLCreator } = require('../utils/dom');
const { ContextMenu } = require('../utils/context-menu');

const { SessionTag } = require('./session-tag');

// *****************************************************************************
// Custom Modules

/*
 * Filter menu
 * Panel for filtering stored sessions
 */

function FilterPanel(document)
{
	// Create DomHealper 
	var DomElem = HTMLCreator(document);

	// ------------------------------------------------------------------------
	// Create UI

	var panel = DomElem('div', {class: 'filter-panel'});

	// Header
	var header = DomElem('div', {class: 'header'});
	var logo = DomElem('div', {class: 'logo'});
	header.appendChild(logo);
	panel.appendChild(header);
	
	// Add Separator
	var separator = DomElem('div', {class: 'separator'});
	panel.appendChild(separator);
	
	// Active session button
	var activeSession = DomElem('div', {class: 'session-box'});
	activeSession.textContent = 'Active session';
	panel.appendChild(activeSession);

	// Add Separator
	var separator2 = DomElem('div', {class: 'separator'});
	panel.appendChild(separator2);

	// Filter List
	var filterList = DomElem('section', {class: 'filters'});
	panel.appendChild(filterList);

	// Filter content
	var tagInfo = DomElem('div', {class: 'title'});
	tagInfo.textContent = 'Tags';
	filterList.appendChild(tagInfo);

	// Filter labels
	var labelsNode = DomElem('div', {class: 'labels'});
	filterList.appendChild(labelsNode);
	
	// Add separator
	var separator3 = DomElem('div', {class: 'separator'});
	panel.appendChild(separator3);

	// Add new tag button
	var addLabelBtn = DomElem('div', {class: 'add-label'});
	addLabelBtn.textContent = 'New tag';
	panel.appendChild(addLabelBtn);
	
	addLabelBtn.addEventListener('click', function() {
		var tagStorage = {name: 'New Tag', count: 0, index: simpleStorage.sessionCategories.length};
		var label = new SessionTag(document, tagStorage);
		labelsNode.appendChild(label.DOMRoot);
		simpleStorage.sessionCategories.push(tagStorage);
		label.rename();
	});


	// ------------------------------------------------------------------------
	// Context Menu
	
	var CM = new ContextMenu(document, {name : 'FilterContextMenu'});
	CM.addMenuEntry({ value: 'Rename', func: 'rename'});
	CM.addMenuEntry({ value: 'Delete', callback: function (labelObj) {
		simpleStorage.sessionCategories.splice(labelObj.storage.index, 1);
		RefreshLabelList();
	}});
	
	// ------------------------------------------------------------------------
	// Event Callbacks
	
	function RefreshLabelList() {
		
		labelsNode.textContent = '';
		
		var list = simpleStorage.sessionCategories;
		
		// Add all tag
		var AllTags = {
			name: 'All',
			count: list.length,
			index: 0
		};
		var label = new SessionTag(document, AllTags);
		labelsNode.appendChild(label.DOMRoot);
		
		// Add individual tags
		var len = list.length;
		for (var i = 0; i < len; i++) {
			list[i].index = i | 0;
			var label = new SessionTag(document, list[i]);
			labelsNode.appendChild(label.DOMRoot);
		}
	}	
	
	// ------------------------------------------------------------------------
	// Events
	
	activeSession.addEventListener('click', function() {
		WindowEvents.emit(document, 'ShowCurrentSession');
	});
	
	WindowEvents.on(document, 'ViewSession', function() {
		activeSession.removeAttribute('active');
	});

	WindowEvents.on(document, 'ShowCurrentSession', function() {
		activeSession.setAttribute('active', 'active');
	});
	
	WindowEvents.on(document, 'FilterMenuTagRenamed', function() {
		RefreshLabelList();
	});

	// ------------------------------------------------------------------------
	// Init Code

	RefreshLabelList();

	// ------------------------------------------------------------------------
	// Public properties
		
	this.DOMRoot = panel;
};

// Public API
exports.FilterPanel = FilterPanel;