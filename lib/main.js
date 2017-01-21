/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Title			Session Sync
 * Author			Gabriel Ivanica
 * Email			gabriel.ivanica@gmail.com
 * Description		Save sessions as bookmarks and sync them through Firefox Sync
 */

'use strict';

// *****************************************************************************
// Custom Modules

const { SessionSync } = require('./session-sync');

// *****************************************************************************
// Load Addon

exports.main = function (options, callbacks) {

	// Init Addon
	SessionSync.init();
};


// *****************************************************************************
// Unload Addon

exports.onUnload = function (reason) {
	SessionSync.unload();
};

