define(function(require, exports, module) {
	'use strict';

	const NS_HTML = 'http://www.w3.org/1999/xhtml';

	// ------------------------------------------------------------------------
	// Generic Node Creator

	function Node(ns, type, attrs) {
		var elem = document.createElementNS(ns, type);

		attrs && Object.keys(attrs).forEach(function(attr) {
			elem.setAttribute(attr, attrs[attr]);
		});

		return elem;
	}

	function HTMLCreator() {
		return Node.bind(null, NS_HTML);
	}

	// ------------------------------------------------------------------------
	// Public API

	exports.HTMLCreator = HTMLCreator;
});

// ES6 module
// export { HTMLCreator , XULCreator };
