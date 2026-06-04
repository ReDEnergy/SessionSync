import 'dotenv/config';
import { defineConfig } from 'wxt';

export default defineConfig(() => {
	console.log('FIREFOX_BINARY:', process.env.FIREFOX_BINARY);
	console.log('FIREFOX_PROFILE:', process.env.FIREFOX_PROFILE);

	return {
		srcDir: 'src',
		publicDir: 'public',
		imports: {
			eslintrc: {
				enabled: 9
			}
		},
		vite: () => ({
			build: {
				minify: false,
				cssMinify: false,
				modulePreload: false,
				rollupOptions: {
					output: {
						entryFileNames: '[name].js',
						chunkFileNames: '[name].js',
						assetFileNames: 'assets/[name].[ext]'
					}
				}
			},
			optimizeDeps: {
				entries: ['src/entrypoints/session-sync.js', 'src/entrypoints/background.js']
			}
		}),
		browser: 'firefox',
		webExt: {
			binaries: {
				firefox: process.env.FIREFOX_BINARY
			},
			firefoxProfile: process.env.FIREFOX_PROFILE,
			keepProfileChanges: true
		},
		manifest: {
			name: 'Session Sync',
			version: '3.3.0',
			author: 'Gabriel Ivanica',
			description:
				'Save sessions as bookmarks and sync them through Firefox Sync (or any other sync engine).\nPowerful session management - organize, edit, change, save, restore, etc\n',
			homepage_url: 'https://github.com/ReDEnergy/SessionSync',
			default_locale: 'en',
			browser_specific_settings: {
				gecko: {
					id: 'session-sync@gabrielivanica.com',
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
				'contextualIdentities',
				'tabGroups'
			],
			action: {
				default_icon: {
					16: 'images/icon16.png',
					32: 'images/icon32.png',
					48: 'images/icon48.png',
					128: 'images/icon128.png'
				},
				default_title: 'Session Sync',
				default_popup: 'session-sync.html'
			},
			icons: {
				16: 'images/icon16.png',
				32: 'images/icon32.png',
				48: 'images/icon48.png',
				64: 'images/icon64.png',
				96: 'images/icon96.png',
				128: 'images/icon128.png'
			},
			commands: {
				_execute_action: {
					suggested_key: {
						default: 'Ctrl+Shift+F'
					},
					description: 'Widget View'
				},
				session_sync_detach_tab: {
					suggested_key: {
						default: 'Ctrl+Shift+U'
					},
					description: 'Tab View'
				},
				session_sync_detach_window: {
					suggested_key: {
						default: 'Ctrl+Shift+F6'
					},
					description: 'Window View'
				}
			}
		}
	};
});
