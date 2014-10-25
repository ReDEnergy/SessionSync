'use strict';

const NS_HTML = "http://www.w3.org/1999/xhtml";
const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

// *****************************************************************************
// Generic Node Creator

function Node(document, ns, type, attrs) {
	var elem = document.createElementNS(ns, type);

	attrs && Object.keys(attrs).forEach(function(attr) {
		elem.setAttribute(attr, attrs[attr]);
	});

	return elem;
}

// *****************************************************************************
// Module exports

// Node.bind(null, document, NS_XUL);

function HTMLCreator(document) {
	return Node.bind(null, document, NS_HTML);
};

function XULCreator(document) {
	return Node.bind(null, document, NS_XUL);
};

exports.HTMLCreator = HTMLCreator;
exports.XULCreator = XULCreator;