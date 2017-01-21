'use strict';

// *****************************************************************************
// SDK Modules

const { EventTarget } = require("sdk/event/target");
const { emit } = require("sdk/event/core");
const { viewFor } = require("sdk/view/core");
const { browserWindows } = require("sdk/windows");

// *****************************************************************************
// 3rd Party Modules

const { PubSub } = require("../3rd/pubsub");

// *****************************************************************************
// EventSystem

function GlobalEvent() {}

GlobalEvent.prototype = Object.create(EventTarget.prototype);

var GlobalEventSystem = (function GlobalEventSystem() {

	var Events = new GlobalEvent();

	var emitEvent = function emitEvent(eventID, obj) {
		emit(Events, eventID, obj);
	};

	return {
		on : Events.on.bind(Events),
		off : Events.off.bind(Events),
		once : Events.once.bind(Events),
		emit: emitEvent,
	};
})();

// Handles collection of PubSub events separated by diffrent namespaces
var NamespaceEvents = (function NamespaceEvents() {

	var map = new Map();

	//-------------------------------------------------------------------------
	// Public API
	
	var broadcastEvent = function broadcastEvent(topic, object) {
		map.forEach(function(collection, key) {
			collection.publish(topic, object);
		});
	};

	var emitEvent = function emitEvent(namespace, topic, object) {
		var collection = map.get(namespace);
		if (collection instanceof PubSub) {
			collection.publish(topic, object);
		}
	};
	
	var subscribe = function subscribe(namespace, topic, callback) {
		var collection = map.get(namespace);
		if (collection instanceof PubSub === false) {
			collection = new PubSub();
			map.set(namespace, collection);
		}
		collection.subscribe(topic, callback);
	};

	var unsubscribe = function unsubscribe(namespace, topic, callback) {
		var collection = map.get(namespace);
		if (collection instanceof PubSub) {
			collection.unsubscribe(topic, callback);
		}
	};

	var remove = function remove(namespace) {
		var collection = map.get(namespace);
		if (collection instanceof PubSub) {
			collection.messages = {};
			map.delete(namespace);
		}
	};

	return {
		on : subscribe,
		off: unsubscribe,
		emit : emitEvent,
		broadcast : broadcastEvent,
		remove: remove
	};
});

// WindowEvents based on window.document topic 

var WindowEvents = new NamespaceEvents();

WindowEvents.onLocal = function onLocal(topic, callback) {
	var document = viewFor(browserWindows.activeWindow).document;
	this.on(document, topic, callback);
};

WindowEvents.emitLocal = function emitLocal(topic, object) {
	var document = viewFor(browserWindows.activeWindow).document;
	this.emit(document, topic, object);
};

// *****************************************************************************
// Public API
//exports.GlobalEvents = new GlobalEvent();
exports.GlobalEvents = GlobalEventSystem;
exports.WindowEvents = WindowEvents;