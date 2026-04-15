'use strict';

const FaviconService = (function FaviconService() {
	var serviceStatus = true;
	var serviceStatusKey = 'services.favicon.enabled';

	var getBase64ImageFromUrl = async function getBase64ImageFromUrl(imageUrl) {
		var res = await fetch(imageUrl);
		var blob = await res.blob();

		return new Promise((resolve, reject) => {
			var reader = new FileReader();
			reader.addEventListener(
				'load',
				function () {
					resolve(reader.result);
				},
				false
			);

			reader.onerror = function () {
				return reject(this);
			};
			reader.readAsDataURL(blob);
		});
	};

	var getHostName = function getHostName(url) {
		try {
			return new URL(url).hostname;
		} catch {
			return '';
		}
	};

	var getFaviconUrl = function getFaviconUrl(url, callback) {
		var key = '@favIconUrl:' + getHostName(url);
		browser.storage.local.get(key).then(function (obj) {
			callback(obj[key]);
		}, callback);
	};

	var setFaviconUrl = function setFaviconUrl(key, favIconUrl) {
		getBase64ImageFromUrl(favIconUrl).then(
			function (result) {
				browser.storage.local.set({ [key]: result });
			},
			function onError() {
				browser.storage.local.set({ [key]: favIconUrl });
			}
		);
	};

	var checkTabFaviconSaved = function checkTabFaviconSaved(tab, waitToLoad) {
		if (serviceStatus == false) {
			return;
		}

		if (tab.favIconUrl) {
			getFaviconUrl(tab.url, function (value) {
				if (value === undefined || tab.url != value) {
					var key = '@favIconUrl:' + getHostName(tab.url);
					setFaviconUrl(key, tab.favIconUrl);
				}
			});
		} else if (waitToLoad != false) {
			function handle(tabId, changeInfo, tabInfo) {
				browser.tabs.onUpdated.removeListener(handle);
				checkTabFaviconSaved(tabInfo, false);
			}

			browser.tabs.onUpdated.addListener(handle, {
				tabId: tab.id,
				properties: ['favIconUrl'],
			});
		}
	};

	var initConfig = function initConfig() {
		browser.storage.local.get(serviceStatusKey).then(function (obj) {
			serviceStatus = obj[serviceStatusKey];
		});
	};

	browser.storage.onChanged.addListener(function onChange(object) {
		if (object[serviceStatusKey]) {
			serviceStatus = object[serviceStatusKey].newValue;
		}
	});

	initConfig();

	return {
		checkTabFaviconSaved: checkTabFaviconSaved,
	};
})();

export { FaviconService };
