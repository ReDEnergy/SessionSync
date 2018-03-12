define(function(require, exports) {
	'use strict';

	// ------------------------------------------------------------------------
	// Modules

	const { PubSub } = require('../3rd/pubsub');
	
	// ------------------------------------------------------------------------
	// API

	var GlobalEventSystem = (function GlobalEventSystem() {
	
		var globalEvents = new PubSub();
	
		return {
			on : globalEvents.subscribe,
			off : globalEvents.unsubscribe,
			emit: globalEvents.publish,
		};
	})();

	// Handles collection of PubSub events separated by diffrent namespaces
	var NamespaceEvents = (function NamespaceEvents() {

		var map = new Map();

		//-------------------------------------------------------------------------
		// Public API
		
		var broadcastEvent = function broadcastEvent(topic, object) {
			map.forEach(function(collection) {
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
		this.on(document, topic, callback);
	};

	WindowEvents.emitLocal = function emitLocal(topic, object) {
		this.emit(document, topic, object);
	};

	// ------------------------------------------------------------------------
	// Events
	
	// ------------------------------------------------------------------------
	// Init

	// ------------------------------------------------------------------------
	// Module exports

	exports.GlobalEvents = GlobalEventSystem;
	exports.WindowEvents = WindowEvents;
});
