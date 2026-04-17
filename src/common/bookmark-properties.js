'use strict';

// *****************************************************************************
// API

/*
 * Bookmark Properties
 */

export class BookmarkProperties {
	// ------------------------------------------------------------------------
	// Public properties

	static encode(tab) {
		var properties = {};

		if (tab.cookieStoreId) {
			properties.container = tab.cookieStoreId;
		}

		if (tab.groupId !== undefined && tab.groupId > -1) {
			properties.group = {
				title: tab.groupTitle,
				color: tab.groupColor
			};
		}

		if (tab.pinned) {
			properties.pinned = 1;
		}

		return ' [' + JSON.stringify(properties) + ']';
	}

	static decode(encoded) {
		try {
			return JSON.parse(encoded);
		} catch {
			return [];
		}
	}

	static parseTitle(title) {
		const match = title.match(/\s\[\{.+\}\]$/);

		if (match) {
			var properties = this.decode(match[0]);
			if (Array.isArray(properties) && properties.length == 1) {
				return {
					title: title.substring(0, match.index),
					properties: properties[0]
				};
			}
		}

		return {
			title: title,
			properties: {}
		};
	}
}
