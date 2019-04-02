define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	// App
	const { AppConfig } = require('../config');

	const { WindowEvents, GlobalEvents } = require('../utils/global-events');
	const { HTMLCreator } = require('../utils/dom');
	const { DragContext } = require('../utils/drag-context');
	const { SessionFolder } = require('./session-folder');
	const { SessionBookmark } = require('./session-bookmark');

	// *****************************************************************************
	// API

	function TrashCan() {

		// Create DomHealper
		var DomElem = HTMLCreator();

		// ------------------------------------------------------------------------
		var block = DomElem('div', {
			class: 'trash-can',
			items: 0,
			dismiss: true,
			tooltip: 'Drop item to delete'
		});

		var count = DomElem('div', {class: 'count', tooltip: 'Click to restore'});
		count.textContent = '0';
		block.appendChild(count);

		var dismiss = DomElem('div', {
			class: 'dismiss css-close-button',
			tooltip: 'Hide'
		});

		block.appendChild(dismiss);

		var configKey = {
			hide: 'trashcan.hide',
			hideCount: 'trashcan.hide-count',
			undoEvents: 'undo.events',
		};

		// ------------------------------------------------------------------------
		// Events

		// History Undo/Redo events
		count.addEventListener('click', function() {
			GlobalEvents.emit('HistoryUndo');
		});

		function updateItemCount(value) {
			count.textContent = value;
			block.setAttribute('items', value);
			AppConfig.set(configKey.hide, value == 0 || value == AppConfig.get(configKey.hideCount));
		}

		block.addEventListener('mouseup', function (e) {
			var item = DragContext.getContext();
			if (item && (item instanceof SessionFolder || item instanceof SessionBookmark)) {
				block.setAttribute('action', 'drop');
				GlobalEvents.emit('DeleteBookmarkItem', item.bookmarkID);
				WindowEvents.emit(document, 'ShowTooltip', {
					node: e.target,
					message: 'Click to restore'
				});
			}
		});

		dismiss.addEventListener('click', function () {
			AppConfig.set(configKey.hide, true);
			AppConfig.set(configKey.hideCount, AppConfig.get(configKey.undoEvents).length);
		});

		// Tooltip events
		block.addEventListener('mouseover', function(e) {
			WindowEvents.emit(document, 'ShowTooltip', {
				node: e.target,
				message: e.target.getAttribute('tooltip')
			});
		});

		block.addEventListener('mouseleave', function() {
			WindowEvents.emit(document, 'HideTooltip');
		});

		WindowEvents.on(document, 'TrashCan-Droppable', function(value) {
			block.setAttribute('droppable', value);
		});

		// ------------------------------------------------------------------------
		// Init code


		// ------------------------------------------------------------------------
		// Events

		AppConfig.onChange(configKey.hide, function (value) {
			block.setAttribute('dismiss', value);
		});

		AppConfig.onChange(configKey.undoEvents, function (value) {
			updateItemCount(value.length);
		});

		// ------------------------------------------------------------------------
		// Public properties

		this.DOMRoot = block;
	}

	// *****************************************************************************
	// Public API
	exports.TrashCan = TrashCan;

});