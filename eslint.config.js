import js from '@eslint/js';
import globals from 'globals';
import autoImports from './.wxt/eslint-auto-imports.mjs';
import stylistic from '@stylistic/eslint-plugin';

/** @type {import('eslint').Linter.Config[]} */
export default [
	{
		ignores: ['.output/**', '.wxt/**', 'node_modules/**']
	},
	js.configs.recommended,
	autoImports,
	{
		plugins: {
			'@stylistic': stylistic
		},
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.webextensions
			},
			ecmaVersion: 'latest',
			sourceType: 'module'
		},
		rules: {
			// Stylistic Rules
			'@stylistic/indent': [
				'error',
				'tab',
				{
					SwitchCase: 1
				}
			],
			'@stylistic/linebreak-style': ['error', 'windows'],
			'@stylistic/quotes': ['error', 'single'],
			'@stylistic/semi': ['error', 'always'],

			// Core Logic Rules
			'no-console': 'off',
			'no-undef': 'off'
		}
	}
];
