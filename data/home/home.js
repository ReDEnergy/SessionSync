'use strict';

var inited = false;
var size;
var Carousel;
var bullets;
var activeBullet;
var tooltip;

window.addEventListener('load', load);

function load() {

	//console.log('logic loaded');

	Carousel = document.getElementById("carousel");
	bullets = document.getElementById("bullets");
	tooltip = document.getElementById("tooltip");

	bullets.addEventListener('mouseleave', function(e) {
		tooltip.removeAttribute('active');
	});

	initTutorial();
}

var initTutorial = function initTutorial() {

	if (inited)
		return;

	inited = true;

	Carousel.textContent = '';
	bullets.textContent = '';

	size = CreateHelpPage();

	initCarousel();
	updateActiveBullet(bullets.firstElementChild);

};

function updateActiveBullet(node) {
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
};

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
	box.setAttribute('info', options.info);

	var title = document.createElement('div');
	title.className = 'title';
	title.textContent = options.title;

	var info = document.createElement('div');
	info.className = 'info';

	var infoNode = document.getElementById('info-' + options.info);
	if (infoNode) {
		info.appendChild(infoNode);
	}

	var visual = document.createElement('div');
	visual.className = 'tutorial-image';
	visual.style.backgroundImage = 'url("../images/tutorial/' + options.info + '.png")';

	box.appendChild(title);
	box.appendChild(info);
	box.appendChild(visual);

	// Bullet

	var bullet = document.createElement('div');
	bullet.className = 'bullet';
	bullet.setAttribute('left', options.index);
	bullet.setAttribute('tooltip', options.title);
	bullet.addEventListener('click', function(e) {
		setCarouselTo(options.index);
		updateActiveBullet(this);
	});
	bullet.addEventListener('mouseover', function(e) {
		var pos = bullet.getBoundingClientRect();
		tooltip.setAttribute('active', '');
		tooltip.style.left = pos.x + pos.width / 2 + 'px';
		tooltip.style.top = pos.y + 'px';
		tooltip.textContent = options.title;
	});
	bullets.appendChild(bullet);

	return box;
}

function CreateHelpPage()
{
	var helper_list = [
		{
			title: 'Addon overview',
			info: 'overview'
		},
		{
			title : 'Session history',
			info: 'history-list'
		},
		{
			title: 'Session menu',
			info: 'session-menu'
		},
		{
			title: 'Context menus',
			info: 'context-menus'
		},
		{
			title: 'Session saving settings',
			info: 'session-save-settings'
		},
		{
			title: 'Edit session information',
			info: 'session-edit'
		},
		{
			title: 'Sort sessions',
			info: 'session-sorting'
		},
		{
			title: 'Filter sessions',
			info: 'session-filter'
		},
		{
			title: 'Url bar',
			info: 'url-bar'
		},
		{
			title: 'Trash bin',
			info: 'delete-item'
		},
		{
			title: 'Configuration panel',
			info: 'config-panel'
		},
		{
			title: 'Resize UI',
			info: 'resize-ui'
		},
		{
			title: 'Resize sessions list',
			info: 'resize-sessions'
		},
		{
			title : 'Detach mode',
			info: 'detach-mode'
		}
	];

	var index = 0;
	helper_list.forEach(function(helper) {
		helper.index = index;
		var entry = new HelpEntry(helper);
		Carousel.appendChild(entry);
		index++;
	});

	return helper_list.length;
}

browser.commands.getAll().
then(function (commands) {
	commands.forEach(function (command) {
		var shortcut = document.getElementById('hotkey-'+ command.name);
		if (shortcut) {
			shortcut.textContent = command.shortcut;
		}
	});
});
