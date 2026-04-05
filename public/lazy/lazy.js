function getLazyLoadingParameters(url)
{
	let paramater = {};
	let paras = url.split('?')[1].split('&');
	for (let p of paras) {
		paramater[p.split('=')[0]] = decodeURIComponent(p.split('=')[1]);
	}
	return paramater;
}

(function ()
{
	var title = document.getElementById('title');
	var urlInfo = document.getElementById('url');

	let paramater = getLazyLoadingParameters(location.href);

	document.title = paramater.title;
	title.textContent = paramater.title;

	urlInfo.textContent = paramater.url;
	urlInfo.href = paramater.url;

	if (paramater.favIconUrl) {
		var favicon = document.createElement('link');
		favicon.rel = 'shortcut icon';
		favicon.href = paramater.favIconUrl;
		document.head.appendChild(favicon);
	}

})();

