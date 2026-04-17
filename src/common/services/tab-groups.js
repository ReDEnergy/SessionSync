'use strict';

import { DomElem } from '../../scripts/utils/dom';
import { WindowEvents } from '../../scripts/utils/global-events';

// *****************************************************************************
// API

export class BrowserTabGroups {
	static groups = new Map();
	static domGroups = {};

	// ------------------------------------------------------------------------
	// Public properties

	static async initTabGroups() {
		try {
			const groups = await browser.tabGroups.query({});
			BrowserTabGroups.onGot(groups);

			// Add listeners for real-time updates while UI is open
			browser.tabGroups.onCreated?.addListener(() => BrowserTabGroups.loadGroups());
			browser.tabGroups.onUpdated?.addListener(() => BrowserTabGroups.loadGroups());
			browser.tabGroups.onRemoved?.addListener(() => BrowserTabGroups.loadGroups());
		} catch (error) {
			console.warn('TabGroups API not available or error:', error);
		}
	}

	static async loadGroups() {
		try {
			const groups = await browser.tabGroups.query({});
			BrowserTabGroups.onGot(groups);
		} catch (error) {
			console.warn('TabGroups API not available or error:', error);
		}
	}

	static onGot(groups) {
		console.log('TabGroupsLoaded', groups);

		for (const group of groups) {
			BrowserTabGroups.groups.set(group.id, group);
		}

		WindowEvents.emitLocal('TabGroupsLoaded');
	}

	static getGroup(groupId) {
		return BrowserTabGroups.groups.get(groupId);
	}

	static getGroupElement(title, color) {
		const tabGroup = DomElem('div', { class: 'tab-group-tag' });
		tabGroup.setAttribute('color', color || 'grey');

		const name = DomElem('div', { class: 'name' });
		name.textContent = title && title.length > 0 ? title : 'Group';

		tabGroup.appendChild(name);

		return tabGroup;
	}

	static async createGroup(tabs, title, color) {
		const groupId = await browser.tabs.group({ tabIds: tabs });
		await browser.tabGroups.update(groupId, { title, color });
	}

	static async setTabsGroup(tabs, title, color) {
		const group = await browser.tabGroups.query({ title: title, color: color });
		let groupId = null;
		if (group.length > 0) {
			await browser.tabs.group({ tabIds: tabs, groupId: group[0].id });
		} else {
			groupId = await browser.tabs.group({ tabIds: tabs });
			await browser.tabGroups.update(groupId, { title, color });
		}

		if (groupId) {
			browser.tabGroups.update(groupId, { collapsed: false });
		}
	}
}
