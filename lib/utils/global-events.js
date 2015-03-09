'use strict';

// *****************************************************************************
// SDK Modules
const { EventTarget } = require("sdk/event/target");
const { emit } = require("sdk/event/core");
const { PubSub } = require("../3rd/pubsub");

// *****************************************************************************


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

	var emitEvent = function emitEvent(namespace, topic, object) {
		var collection = map.get(namespace);
		if (collection instanceof PubSub) {
			collection.publish(topic, object);
		}
	};

	var register = function register(namespace, topic, callback) {
		var collection = map.get(namespace);
		if (collection instanceof PubSub === false) {
			collection = new PubSub();
			map.set(namespace, collection);
		}
		collection.subscribe(topic, callback);
	};

	var off = function off(namespace, topic, callback) {
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
		emit : emitEvent,
		register : register,
		off: off,
		remove: remove
	};
});

var WindowEvents = new NamespaceEvents();

// *****************************************************************************
// Public API
//exports.GlobalEvents = new GlobalEvent();
exports.GlobalEvents = GlobalEventSystem;
exports.WindowEvents = WindowEvents;