'use strict';

var size;

window.addEventListener('load', function() {
	size = CreateHelpPage();
	initCarousel();
});

var Carousel = document.getElementById("carousel");
var bullets = document.getElementById("bullets");

function setCarouselTo(index)
{
	console.log(index);
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
	visual.style.background = 'url("../images/tutorial/' + options.info + '.png")';
	
	box.appendChild(title);
	box.appendChild(info);
	box.appendChild(visual);
	
	var bullet = document.createElement('div');
	bullet.className = 'bullet';
	bullet.setAttribute('left', options.index);
	bullet.addEventListener('click', function(e) {
		setCarouselTo(options.index);
	});
	bullets.appendChild(bullet);

	return box;
}

function CreateHelpPage()
{
	var helper_list = [
		{
			title: 'How to use',
			info: 'active-session'
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
			title: 'Url bar',
			info: 'url-bar'
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
			title: 'Addon Toolbar',
			info: 'addon-toolbar'
		},
	];
	
	var index = 0;
	helper_list.forEach(function(helper) {
		helper.index = index;  
		var entry = new HelpEntry(helper);
		Carousel.appendChild(entry);
		index++;
	});
	
	return helper_list.length;
};
