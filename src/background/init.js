import { SessionSync } from './main';
import { SessionManagement } from './session-management';
import { SessionAutoSave } from './session-history';
import { FaviconService } from './favicon-service';

export function initBackground() {
	FaviconService.init();
	SessionSync.init();
	SessionManagement.init();
	SessionAutoSave.init();

	// Delete previous undo events
	if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
		browser.storage.local.set({ 'undo.events': [] });
		browser.storage.local.set({ 'trashcan.hide': true });
		browser.storage.local.set({ 'trashcan.hide-count': 0 });
		browser.storage.local.set({ 'session.active.filter': '' });
		browser.storage.local.set({ 'session.selected': null });
		browser.storage.local.set({ 'session.history.selected': null });
	}

	console.log('Session Sync -> background script initialized!');
}
