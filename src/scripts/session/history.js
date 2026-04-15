'use strict';

// ************************************************************************
// API

export const HistoryManager = (function HistoryManager() {

	var selectedSessions;


	var selectSession = function selectSession(sessionInfo) {
		selectedSessions = sessionInfo;
		console.log('selectedSessions', selectedSessions);
	};

	var getSelectedSession = function getSelectedSession() {
		return selectedSessions;
	};

	var getHistoryTab = function getHistoryTab(windowID, tabID) {
		return selectedSessions.windows[windowID].tabs[tabID];
	};

	return {
		selectSession: selectSession,
		getSelectedSession: getSelectedSession,
		getHistoryTab: getHistoryTab
	};

})();