import { initBackground } from '../scripts/main';
import { initDevelopment } from '../scripts/development';
import { SessionManagement } from '../scripts/session-management';
import { SessionAutoSave } from '../scripts/session-history';

export default defineBackground(() => {
	// Initialize the background logic
	initBackground();
	initDevelopment();
	SessionManagement.init();
	SessionAutoSave.init();

	console.log('Session Sync Background script initialized.');
});
