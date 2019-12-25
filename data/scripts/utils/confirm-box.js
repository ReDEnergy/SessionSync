define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// Custom Modules

	const { HTMLCreator } = require('./dom');
	const { WindowEvents } = require('./global-events');

	// *****************************************************************************
	// Bookmark Confirm Box

	function ConfirmBox(options)
	{
		var DomElem = HTMLCreator();

		var panel = DomElem('div', {class : 'confirm-box'});

		var info = DomElem('div', {class : 'info'});
		var controls = DomElem('div', {class : 'controls'});

		var ok = DomElem('div', {class : 'button ok'});
		ok.textContent = 'Confirm';

		var cancel = DomElem('div', {class : 'button cancel'});
		cancel.textContent = 'Cancel';

		var flexArea1 = DomElem('div', {class : 'flex'});
		var flexArea2 = DomElem('div', {class : 'flex'});

		controls.appendChild(flexArea1);
		controls.appendChild(ok);
		controls.appendChild(cancel);
		controls.appendChild(flexArea2);
		panel.appendChild(info);
		panel.appendChild(controls);

		var callback;
		var defaultCallback = function defaultCallback() {};

		// ------------------------------------------------------------------------
		// Events

		ok.addEventListener('click', function() {
			callback();
			hidePanel();
		});

		cancel.addEventListener('click', function() {
			hidePanel();
		});

		var openPanel = function openPanel(options)
		{
			panel.setAttribute('data-active', 'true');
			panel.style.left = options.event.pageX + 'px';
			panel.style.top = options.event.pageY + 'px';

			document.addEventListener('mousedown', blurMenu);

			info.textContent = options.message;
			setCallback(options.callback);

		};

		var hidePanel = function hidePanel()
		{
			panel.removeAttribute('data-active');
			document.removeEventListener('mousedown', blurMenu);
			callback = defaultCallback;
		};

		var blurMenu = function hideWhenClickOutside(e)
		{
			var target = e.target;
			while (target) {
				if (target === panel)
					return;
				target = target.parentElement;
			}
			hidePanel();
		};

		function setCallback(func) {
			callback = typeof func === 'function' ? func : defaultCallback;
		}

		// Register custom events
		WindowEvents.on(document, options.name + '-Open', openPanel);
		WindowEvents.on(document, 'ConfimBox-Hide', hidePanel);

		// ------------------------------------------------------------------------
		// Public properties

		this.DOMRoot = panel;
	}

	// *****************************************************************************
	// Public API
	exports.ConfirmBox = ConfirmBox;
});