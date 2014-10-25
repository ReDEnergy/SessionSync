'use strict';

// *****************************************************************************
// SDK Modules
const { EventTarget } = require("sdk/event/target");
const { emit } = require("sdk/event/core");

// *****************************************************************************
// Awesome Session Sync UI

function EventSystem() {

}

EventSystem.prototype = Object.create(EventTarget.prototype);

var GlobalEvents = new EventSystem();

// *****************************************************************************
// Public API
exports.GlobalEvents = GlobalEvents;