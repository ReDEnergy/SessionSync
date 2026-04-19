'use strict';

import { DomElem } from '../../scripts/utils/dom';

// *****************************************************************************
// API

/*
 * Bookmark Properties
 */

export class FirefoxContainers {
	static containers = [];
	static domContainers = {};

	// ------------------------------------------------------------------------
	// Public properties

	static async loadContainers() {
		if (typeof browser === 'undefined' || !browser.contextualIdentities) return;

		const identities = await browser.contextualIdentities.query({});
		FirefoxContainers.onGot(identities);
	}

	static onGot(contexts) {
		FirefoxContainers.containers = contexts;

		// create dom containers
		for (const container of contexts) {
			const domContainer = DomElem('div', { class: 'container' });
			domContainer.style.backgroundColor = container.colorCode;

			const icon = DomElem('div', { class: 'icon' });
			icon.style.background = 'url("' + container.iconUrl + '")';

			const name = DomElem('div', { class: 'name' });
			name.textContent = container.name;

			domContainer.appendChild(icon);
			domContainer.appendChild(name);

			FirefoxContainers.domContainers[container.cookieStoreId] = domContainer;
		}
	}

	static onError(error) {
		console.error(error);
	}

	static getContainerElement(cookieStoreId) {
		var node = FirefoxContainers.domContainers[cookieStoreId];
		if (node) {
			return node.cloneNode(true);
		}

		return null;
	}

	static getContainerInfo(cookieStoreId) {
		return FirefoxContainers.containers.find((container) => container.cookieStoreId === cookieStoreId);
	}
}
