'use strict';


// *****************************************************************************
// SDK Modules

const { setTimeout, clearTimeout } = require("sdk/timers");

// *****************************************************************************
// Custom Modules

// App
const { AppConfig } = require('../config');
const { SessionSyncModel } = require('../session-sync-model');

// Utils
const { HTMLCreator } = require('../utils/dom');
const { WindowEvents, GlobalEvents } = require('../utils/global-events');
const DOMComponent = require('../utils/components');


// *****************************************************************************
// API

function createToggleButton(document, options)
{
	var DomElem = HTMLCreator(document); 

	var state = options.state;

	var entry = DomElem('div', {class: 'toggle-btn'});
	var title = DomElem('div', {class: 'title'});
	title.textContent = options.description;
	
	var button = DomElem('div', {class: 'label'});
	button.setAttribute('state', state);
	button.textContent = state ? options.onState : options.offState; 

	entry.appendChild(title);
	entry.appendChild(button);
	
	entry.addEventListener('click', function() {
		state = !state;
		options.callback(state);
		button.setAttribute('state', state);
		button.textContent = state ? options.onState : options.offState; 
	});
	
	return entry;
}

/*
 * Command bar
 */

function SessionToolbar(document)
{
	// Create DomHealper 
	var DomElem = HTMLCreator(document);

	// ------------------------------------------------------------------------
	// Create UI

	var toolbar = DomElem('div', {class: 'session-toolbar'});
	toolbar.style.fontSize = AppConfig.storage.style.toolbarScaleFactor + 'px';

	// ------------------------------------------------------------------------
	// List settings

	var container = DomElem('div', {class: 'session-selector'});
	container.style.width = AppConfig.storage.style.sessionListWidth + 'px';

	var syncBtn = DomElem('div', {class: 'button sync'});
	syncBtn.textContent = 'Sessions';

	var historyBtn = DomElem('div', {class: 'button history'});
	historyBtn.textContent = 'History';

	container.appendChild(syncBtn);
	container.appendChild(historyBtn);
	toolbar.appendChild(container);

	// ------------------------------------------------------------------------
	// Session toolbar menu

	var sessionMenu = this.createMenu(document);
	toolbar.appendChild(sessionMenu); 
	
	var sortControl = this.createSortMenu(document);
	toolbar.appendChild(sortControl);

	var sessionDate = DomElem('div', {class: 'session-date'});
	toolbar.appendChild(sessionDate);

	// ------------------------------------------------------------------------
	// Events

	WindowEvents.on(document, 'SetSessionDate', function(date) {
		sessionDate.textContent = (new Date(date)).toLocaleString();
	});

	syncBtn.addEventListener('click', function() {
		WindowEvents.emit(document, 'ShowSyncList');	
		GlobalEvents.emit('update-sessions');
	});

	historyBtn.addEventListener('click', function() {
		WindowEvents.emit(document, 'ShowHistoryList');
		GlobalEvents.emit('update-history');
	});

	GlobalEvents.on('cfg.style.sessionListWidth', function() {
		container.style.width = AppConfig.storage.style.sessionListWidth + 'px';
	});

	GlobalEvents.on('cfg.style.toolbarScaleFactor', function(value) {
		toolbar.style.fontSize = value + 'px';
	});

	// ------------------------------------------------------------------------
	// Public properties

	this.document = document;
	this.DOMRoot = toolbar;
}

SessionToolbar.prototype.createMenu = function createMenu(document)
{
	var DomElem = HTMLCreator(document);

	// ------------------------------------------------------------------------
	// UI - SessionContainer menu

	var menu = DomElem('div', {class: 'menu-bar'});

	var save = DomElem('div', {class: 'button save'});
	save.setAttribute('tooltip', 'Save session');

	var add = DomElem('div', {class: 'button add'});
	add.setAttribute('tooltip', 'Add current tab');

	var restore = DomElem('div', {class: 'button restore'});
	restore.setAttribute('tooltip', 'Restore');

	var restoreW = DomElem('div', {class: 'button restore-new-win'});
	restoreW.setAttribute('tooltip', 'Restore in new window');

	var mergeSession = DomElem('div', {class: 'button merge-sessions'});
	mergeSession.setAttribute('tooltip', 'Merge sessions');

	var replaceSession = DomElem('div', {class: 'button replace-session'});
	replaceSession.setAttribute('tooltip', 'Replace session');

	var separator1 = DomElem('div', {class: 'separator'});
	var separator2 = DomElem('div', {class: 'separator'});
	
	var saveConfig = DomElem('div', {class: 'save-config'});

	// Pin tabs action

	entry = DOMComponent.ToggleSwitch(document, {
		state: AppConfig.storage.bookmarkConfig.preservePinnedState,
		tooltip: 'Save pinned state',
		attribute: 'pin-state',
		onState: '',
		offState: '',
		callback: function(value) {
			AppConfig.storage.bookmarkConfig.preservePinnedState = value;
		}
	});
	saveConfig.appendChild(entry);
	
	var entry = DOMComponent.ToggleSwitch(document, {
		state: AppConfig.storage.bookmarkConfig.savePinnedTabs,
		tooltip: 'Save pinned tabs',
		attribute: 'pin',
		onState: '',
		offState: '',
		callback: function(value) {
			AppConfig.storage.bookmarkConfig.savePinnedTabs = value;
		}
	});
	saveConfig.appendChild(entry);

	entry = DOMComponent.ToggleSwitch(document, {
		state: AppConfig.storage.bookmarkConfig.completeSession,
		tooltip: 'Show all windows',
		attribute: 'windows',
		onState: '',
		offState: '',
		callback: function(value) {
			AppConfig.storage.bookmarkConfig.completeSession = value;
			WindowEvents.emit(document, 'SessionContainer-RefreshUI');
		}
	});
	saveConfig.appendChild(entry);	

	menu.appendChild(restore);
	menu.appendChild(restoreW);
	menu.appendChild(separator1);
	menu.appendChild(mergeSession);
	menu.appendChild(replaceSession);
	menu.appendChild(separator2);
	menu.appendChild(add);
	menu.appendChild(save);
	menu.appendChild(saveConfig);

	// ------------------------------------------------------------------------
	// Events
	
	restore.addEventListener('click', function() {
		WindowEvents.emit(document, 'MenuRestoreClick');
	});

	restoreW.addEventListener('click', function() {
		WindowEvents.emit(document, 'MenuRestoreNewWindow');
	});
	
	// Merge sessions
	mergeSession.addEventListener('click', function(e) {
		WindowEvents.emit(document, 'MenuMergeSessions', e);
	});

	// Replace session
	replaceSession.addEventListener('click', function(e) {
		WindowEvents.emit(document, 'MenuReplaceSession', e);
	});

	// Append current tab to the selected session
	add.addEventListener('click', function() {
		WindowEvents.emit(document, 'MenuAddCurrentTab');
	});

	// Save the session
	save.addEventListener('click', function() {
		WindowEvents.emit(document, 'MenuSaveSession');
	});

	// Tooltip events
	menu.addEventListener('mouseover', function(e) {
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

	menu.addEventListener('mouseleave', function(e) {
		WindowEvents.emit(document, 'HideTooltip');
	});	
	
	// ------------------------------------------------------------------------
	// Data

	return menu;
};

SessionToolbar.prototype.createSortMenu = function createSortMenu(document)
{
	var DomElem = HTMLCreator(document);

	// ------------------------------------------------------------------------
	// UI

	// Session ordering
	var sortControl = DomElem('div', {class: 'sorting-method'});
	var sectionTitle = DomElem('div', {class: 'title'});
	sectionTitle.textContent = 'Sort by';
	sortControl.appendChild(sectionTitle);

	// Sorting dropdown
	var selectedValue = DomElem('div', {class: 'selected-value'});
	selectedValue.textContent = '';

	var optionList = DomElem('div', {class: 'option-list'});
	selectedValue.appendChild(optionList);

	var options = ['name-asc', 'name-desc', 'position-asc', 'position-desc', 'date-asc', 'date-desc'];
	var optionsDescription = ['name ↑', 'name ↓', 'position ↑', 'position ↓', 'date ↑', 'date ↓'];
	for (var i = 0; i < options.length; i++)
	{
		var option = DomElem('div', {class: 'option', value: options[i]});
		option.textContent =  optionsDescription[i];
		optionList.appendChild(option);
	}
	
	var dropdown = DomElem('div', {class: 'dropdown'});
	dropdown.appendChild(selectedValue);
	dropdown.appendChild(optionList);
	sortControl.appendChild(dropdown);
	
	var activeButton = optionList.children[2];
	activeButton.setAttribute('active', '');
	selectedValue.textContent = activeButton.getAttribute('value');

	// ------------------------------------------------------------------------
	// Events

	optionList.addEventListener('click', function(e) {
		if (e.target.className = 'option') {
			if (e.target != activeButton) {
				activeButton.removeAttribute('active');
				activeButton = e.target;
				var value = activeButton.getAttribute('value');
				selectedValue.textContent = value;
				activeButton.setAttribute('active', '');
			}
			WindowEvents.emit(document, 'SortSessionsBy', value);
		}
	});
	
	// ------------------------------------------------------------------------
	// Data
		
	return sortControl;
};

// *****************************************************************************
// Public API

exports.SessionToolbar = SessionToolbar;
