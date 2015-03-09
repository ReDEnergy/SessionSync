'use strict';

const { AppConfig } = require('./config');


var lang = AppConfig.get('lang');

var Language = {};

function setTranslation(lang, translation) {
	Language[lang] = translation;
};

function getTranslation(text) {
	var txt = Language[lang][text];
	return txt ? txt : text;
}

////////////////////////////////////////////////////////////////////////////////
// EN translation

setTranslation('en', (function() {
	var L = {};

	L['add-tab'] = 'Add current tab';
	L['save-session'] = 'Save session';
	L['restore-session'] = 'Restore';
	L['restore-new-window'] = 'Restore in new window';

	return L;
})());

exports.get = getTranslation;

