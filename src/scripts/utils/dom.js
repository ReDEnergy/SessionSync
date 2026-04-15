'use strict';

const NS_HTML = 'http://www.w3.org/1999/xhtml';

// ------------------------------------------------------------------------
// Generic Node Creator

function Node(ns, type, attrs) {
	var elem = document.createElementNS(ns, type);

	attrs &&
		Object.keys(attrs).forEach(function (attr) {
			elem.setAttribute(attr, attrs[attr]);
		});

	return elem;
}

export function HTMLCreator() {
	return Node.bind(null, NS_HTML);
}

export function DomElem(type, attrs) {
	return Node(NS_HTML, type, attrs);
}
