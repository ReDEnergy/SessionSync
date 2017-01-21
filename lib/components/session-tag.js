'use strict';

// *****************************************************************************
// Custom Modules

const { HTMLCreator } = require('../utils/dom');
const { WindowEvents, GlobalEvents } = require('../utils/global-events');

// *****************************************************************************
// API

/*
 * Session Tag
 */
function SessionTag(document, tagStorage)
{
	var DomElem = HTMLCreator(document);

	var label = DomElem('div', {class: 'label'});

	var name =  DomElem('div', {class: 'name'});
	name.textContent = tagStorage.name;

	var count =  DomElem('div', {class: 'count'});
	count.textContent = tagStorage.count;

	var input =  DomElem('input', {type: 'text', class: 'edit-field', placeholder: 'tag name'});
	input.value = tagStorage.name;
	input.style.height = '22px';
	input.style.padding = '0 5px';
	input.style.width = 'calc(100% - 30px)';

	label.appendChild(input);
	label.appendChild(name);
	label.appendChild(count);
	
	if (tagStorage.active == true) {
		label.setAttribute('active', '');
	}
	
	// Events

	label.addEventListener('mousedown', function(e) {

		if (e.button == 0 && e.target.nodeName != 'input') {
			var value = label.hasAttribute('active');
			value ? label.removeAttribute('active') : label.setAttribute('active', '');
			tagStorage.active = !value;
		}

		// Right Click
		if (e.button == 2) {
			e.stopPropagation();
			WindowEvents.emit(document, 'FilterContextMenu-Open', {
				context: this,
				event: e
			});
		}
	}.bind(this));
	
	var changeTagName = function ChangeTagName() {
		this.storage.name = input.value;
		this.DOMRoot.removeAttribute('edit-mode');
		WindowEvents.emit(document, 'FilterMenuTagRenamed');
	}.bind(this);

	input.addEventListener('change', changeTagName);
	input.addEventListener('keypress', function(e) {
		if (e.keyCode == 13)
			changeTagName();
	});

	// ------------------------------------------------------------------------
	// Public data

	this.storage = tagStorage;
	this.document = document;
	this.input = input;
	this.DOMRoot = label;
}

SessionTag.prototype.rename = function rename() {
	this.input.value = this.storage.name;
	this.input.focus();
	this.DOMRoot.setAttribute('edit-mode', '');	
};

// *****************************************************************************
// Public API
exports.SessionTag = SessionTag;
