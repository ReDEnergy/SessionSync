'use strict';

var inited = false;
var size;
var Carousel;
var bullets;
var activeBullet;
var tooltip;

window.addEventListener('load', load);

function load() {

	Carousel = document.getElementById('carousel');
	bullets = document.getElementById('bullets');
	tooltip = document.getElementById('tooltip');

	bullets.addEventListener('mouseleave', function(e) {
		tooltip.removeAttribute('active');
	});

	initTutorial();

	var url = window.location.href;
	var startIndex = url.indexOf('#');
	if (startIndex > 0) {
		var reference = url.substring(url.indexOf('#') + 1);
		if (reference.length != 0) {
			var entry = TutorialEntries.getEntryByKey(reference);
			if (entry instanceof HelpEntry) {
				setCarouselTo(entry.index);
			}
		}
	}
}

var initTutorial = function initTutorial() {

	if (inited)
		return;

	inited = true;

	Carousel.textContent = '';
	bullets.textContent = '';

	size = TutorialEntries.init();

	initCarousel();
	updateActiveBullet(bullets.firstElementChild);

};

function updateActiveBullet(node) {
	console.log(node);
	if (activeBullet) {
		activeBullet.removeAttribute('active');
	}
	activeBullet = node;
	activeBullet.setAttribute('active', '');
}

function setCarouselTo(index)
{
	if (index < 0 || index > (size - 1)) {
		return;
	}

	Carousel.style.left = -index * 100 + '%';
	Carousel.setAttribute('advance', index * 100);
	updateActiveBullet(TutorialEntries.getEntryByIndex(index).bullet);
}

function advanceCarousel(offset)
{
	var position = Carousel.getAttribute('advance') | 0;
	position += offset;
	if (position < 0 || position > (size - 1) * 100) {
		return;
	}
	Carousel.style.left = -position + '%';
	Carousel.setAttribute('advance', position);
	updateActiveBullet(offset > 0 ? activeBullet.nextElementSibling : activeBullet.previousElementSibling);
}

function initCarousel()
{
	var moveLeft = document.getElementById("scroll-left");
	var moveRight = document.getElementById("scroll-right");

	moveLeft.addEventListener('click', advanceCarousel.bind(null, -100));
	moveRight.addEventListener('click', advanceCarousel.bind(null, 100));
}

function HelpEntry(options)
{
	var box = document.createElement('div');
	box.className = 'box';
	box.setAttribute('info', options.key);

	var title = document.createElement('div');
	title.className = 'title';
	title.textContent = options.title;

	var info = document.createElement('div');
	info.className = 'info';

	var infoNode = document.getElementById('info-' + options.key);
	if (infoNode) {
		info.appendChild(infoNode);
	}

	var visual = document.createElement('div');
	visual.className = 'tutorial-image';
	visual.style.backgroundImage = 'url("../images/tutorial/' + options.key + '.png")';

	box.appendChild(title);
	box.appendChild(info);
	box.appendChild(visual);

	// Bullet
	var reference = document.createElement('a');
	reference.href = '#' + options.info;

	var bullet = document.createElement('div');
	bullet.className = 'bullet';
	bullet.setAttribute('left', options.index);
	bullet.setAttribute('tooltip', options.title);
	bullet.addEventListener('click', function(e) {
		setCarouselTo(options.index);
	});
	bullet.addEventListener('mouseover', function(e) {
		var pos = bullet.getBoundingClientRect();
		tooltip.setAttribute('active', '');
		tooltip.style.left = pos.x + pos.width / 2 + 'px';
		tooltip.style.top = pos.y + 'px';
		tooltip.textContent = options.title;
	});

	reference.appendChild(bullet);

	this.index = options.index;
	this.box = box;
	this.bullet = bullet;
	this.link = reference;
}

var TutorialEntries = (function TutorialEntries()
{
	var entries = {};
	var entryList = [
		{
			title: 'Addon overview',
			key: 'overview'
		},
		{
			title : 'Session history',
			key: 'history-list'
		},
		{
			title: 'Session menu',
			key: 'session-menu'
		},
		{
			title: 'Context menus',
			key: 'context-menus'
		},
		{
			title: 'Session saving settings',
			key: 'session-save-settings'
		},
		{
			title: 'Edit session information',
			key: 'session-edit'
		},
		{
			title: 'Sort sessions',
			key: 'session-sorting'
		},
		{
			title: 'Filter sessions',
			key: 'session-filter'
		},
		{
			title: 'Url bar',
			key: 'url-bar'
		},
		{
			title: 'Trash bin',
			key: 'delete-item'
		},
		{
			title: 'Configuration panel',
			key: 'config-panel'
		},
		{
			title: 'Resize UI',
			key: 'resize-ui'
		},
		{
			title: 'Resize sessions list',
			key: 'resize-sessions'
		},
		{
			title : 'Detach mode',
			key: 'detach-mode'
		},
		{
			title: 'Export/Import Sessions',
			key: 'export-import'
		},
	];

	function init()
	{
		var index = 0;
		entryList.forEach(function(info) {
			info.index = index;
			var entry = new HelpEntry(info);
			entries[info.key] = entry;
			info.entry = entry;

			Carousel.appendChild(entry.box);
			bullets.appendChild(entry.link);
			index++;
		});
	}

	function getEntryByKey(key) {
		return entries[key];
	}

	function getEntryByIndex(index) {
		return entryList[index].entry;
	}

	return {
		init: init,
		getEntryByIndex: getEntryByIndex,
		getEntryByKey: getEntryByKey
	};

})();

// browser.commands.getAll().
// then(function (commands) {
// 	commands.forEach(function (command) {
// 		var shortcut = document.getElementById('hotkey-'+ command.name);
// 		if (shortcut) {
// 			shortcut.textContent = command.shortcut;
// 		}
// 	});
// });
