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
		var block = DomElem('div', {class: 'trash-can', tooltip: 'Drop item to delete'});
		block.setAttribute('items', '0');

		var count = DomElem('div', {class: 'count', tooltip: 'Click to restore'});
		count.textContent = '0';
		block.appendChild(count);

		var dismiss = DomElem('div', {class: 'dismiss css-close-button', tooltip: 'Hide'});
		block.appendChild(dismiss);

		// ------------------------------------------------------------------------
		// Events

		// History Undo/Redo events
		count.addEventListener('click', function() {
			GlobalEvents.emit('HistoryUndo');
		});

		function updateItemCount(value) {
			count.textContent = value;
			block.setAttribute('items', value);
			block.removeAttribute('dismiss');
		}

		GlobalEvents.on('TrashCan-Items', function(value) {
			updateItemCount(value);
		});

		GlobalEvents.on('TrashCan-Dismiss', function() {
			block.setAttribute('dismiss', '');
		});

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

		dismiss.addEventListener('click', function (e) {
			GlobalEvents.emit('TrashCan-Dismiss');
		});

		// Tooltip events
		block.addEventListener('mouseover', function(e) {
			WindowEvents.emit(document, 'ShowTooltip', {
				node: e.target,
				message: e.target.getAttribute('tooltip')
			});
		});

		block.addEventListener('mouseleave', function(e) {
			WindowEvents.emit(document, 'HideTooltip');
		});

		WindowEvents.on(document, 'TrashCan-Droppable', function(value) {
			block.setAttribute('droppable', value);
		});

		// ------------------------------------------------------------------------
		// Init code

		var undoEvents = AppConfig.get('undo.events');
		updateItemCount(undoEvents ? undoEvents.length : 0);
		block.setAttribute('dismiss', '');

		// ------------------------------------------------------------------------
		// Public properties
		this.DOMRoot = block;
	}

	// *****************************************************************************
	// Public API
	exports.TrashCan = TrashCan;

});