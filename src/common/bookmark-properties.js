'use strict';

// *****************************************************************************
// API

/*
* Bookmark Properties
*/

export class BookmarkProperties {

	// ------------------------------------------------------------------------
	// Public properties

	static encode(bookmark) {

		var properties = {};

		if (bookmark.cookieStoreId) {
			properties.container = bookmark.cookieStoreId;
		}

		if (bookmark.pinned) {
			properties.pinned = 1;
		}

		return ' [' + JSON.stringify(properties) + ']';
	}

	static decode(encoded) {
		try {
			return JSON.parse(encoded);
		} catch (error) {
			return [];
		}
	}

	static getTitle(bookmark) {
		return splitTitle(bookmark.title).title;
	}

	static getBookmarkProperties(bookmark) {
		return splitTitle(bookmark.title).properties;
	}

	static parseTitle(title) {
		const match = title.match(/\s\[\{.+\}\]$/);

		if (match) {
			var properties = this.decode(match[0]);
			if (Array.isArray(properties) && properties.length == 1) {
				return {
					title: title.substring(0, match.index),
					properties: properties[0]
				}
			}
		}

		return {
			title: title,
			properties: {}
		}
	}
}