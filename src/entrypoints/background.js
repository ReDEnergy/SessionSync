import { initBackground } from '../background/main';
import { initDevelopment } from '../background/development';
import { SessionManagement } from '../background/session-management';
import { SessionAutoSave } from '../background/session-history';

export default defineBackground(() => {
	// Initialize the background logic
	initBackground();
	initDevelopment();
	SessionManagement.init();
	SessionAutoSave.init();

	console.log('Session Sync Background script initialized.');
});
