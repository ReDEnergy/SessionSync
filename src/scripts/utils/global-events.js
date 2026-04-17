'use strict';

// ------------------------------------------------------------------------
// Modules

import { PubSub } from '../3rd/pubsub';

// ------------------------------------------------------------------------
// API

const GlobalEventSystem = (function GlobalEventSystem() {
	const globalEvents = new PubSub();

	return {
		on: globalEvents.subscribe.bind(globalEvents),
		off: globalEvents.unsubscribe.bind(globalEvents),
		emit: globalEvents.publish.bind(globalEvents)
	};
})();

// Handles collection of PubSub events separated by diffrent namespaces
function NamespaceEvents() {
	var map = new Map();

	//-------------------------------------------------------------------------
	// Public API

	var broadcastEvent = function broadcastEvent(topic, object) {
		map.forEach(function (collection) {
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
		on: subscribe,
		off: unsubscribe,
		emit: emitEvent,
		broadcast: broadcastEvent,
		remove: remove
	};
}

// WindowEvents based on window.document topic

const WindowEvents = new NamespaceEvents();

WindowEvents.onLocal = function onLocal(topic, callback) {
	if (typeof document !== 'undefined') {
		this.on(document, topic, callback);
	}
};

WindowEvents.emitLocal = function emitLocal(topic, object) {
	if (typeof document !== 'undefined') {
		this.emit(document, topic, object);
	}
};

export { GlobalEventSystem as GlobalEvents, WindowEvents };
