import 'dotenv/config';
import { defineConfig } from 'wxt';

console.log('FIREFOX_BINARY:', process.env.FIREFOX_BINARY);
console.log('FIREFOX_PROFILE:', process.env.FIREFOX_PROFILE);

export default defineConfig(() => {
	return {
		browser: 'firefox',
		webExt: {
			binaries: {
				firefox: process.env.FIREFOX_BINARY,
			},
			firefoxProfile: process.env.FIREFOX_PROFILE,
			keepProfileChanges: true,
		},
		manifest: {
			name: 'Session Sync',
			version: '3.2.0',
			author: 'Gabriel Ivanica',
			description: 'Save sessions as bookmarks and sync them through Firefox Sync (or any other sync engine).\nPowerful session management - organize, edit, change, save, restore, etc\n',
			homepage_url: 'https://github.com/ReDEnergy/SessionSync',
			manifest_version: 2,
			default_locale: 'en',
			browser_specific_settings: {
				gecko: {
					data_collection_permissions: {
						required: ['none']
					}
				}
			},
			permissions: [
				'storage',
				'bookmarks',
				'tabs',
				'clipboardWrite',
				'unlimitedStorage',
				'cookies',
				'contextualIdentities'
			],
			commands: {
				'_execute_browser_action': {
					suggested_key: {
						'default': 'Ctrl+Shift+F'
					},
					description: 'Toggle Widget'
				},
				'session_sync_tutorial': {
					suggested_key: {
						'default': 'Ctrl+Shift+L'
					},
					description: 'Tutorial'
				},
				'session_sync_detach_tab': {
					suggested_key: {
						'default': 'Ctrl+Shift+U'
					},
					description: 'Tab View'
				},
				'session_sync_detach_window': {
					suggested_key: {
						'default': 'Ctrl+Shift+V'
					},
					description: 'Window View'
				}
			}
		}
	};
});
