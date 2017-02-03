
	var helper_list = [
		{
			title: 'General instructions',
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
			title: 'Trash bin',
			info: 'trash-bin-location'
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

var list = '';

helper_list.forEach(function(box) {
	
  list += '#container .box[info="' + box.info + '"] .tutorial-image {\n';
	list += '\tbackground-image: url("../images/tutorial/' + box.info + '.png");\n';
	list += '}\n\n';
})

console.log(list);
