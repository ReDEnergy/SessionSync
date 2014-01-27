// JavaScript Document

'use strict';

// *	Store User Settings - Save

var Preferences = { };

var Elements = {

	save : null,
	timeout : null,

	SKEY : [],
	MOUSEKEY : [],
	MouseButton : [],

	setElements : function () {

		this.save = document.getElementById("save");

		BackgroundWorker.init();

		for (var i=0; i<3; i++)
			this.MouseButton[i] = new MouseActions(i);

		this.HotkeyPower = document.getElementById("hotkeys");
		this.HotkeyState = document.getElementById("kstate");

		this.SKEY[1] = document.getElementById("kctrl");
		this.SKEY[2] = document.getElementById("kalt");
		this.SKEY[3] = document.getElementById("kshift");
		this.Version = document.getElementById("version");

		this.SKEY[0] = new DropDown("keyletter", "dropKey", HotKeysOptions);

		this.MOUSEKEY[0] = new DropDown("mouseL", "mouse_drop_L", this.MouseButton[0]);
		this.MOUSEKEY[1] = new DropDown("mouseM", "mouse_drop_M", this.MouseButton[1]);
		this.MOUSEKEY[2] = new DropDown("mouseR", "mouse_drop_R", this.MouseButton[2]);

		this.PanelSizeH = new DropDown("panelH", "panelH_drop", PanelHeight);
		this.PanelSizeC = new DropDown("panelC", "panelC_drop", PanelColumns);

	},

	updateSettings : function() {

		this.SKEY[0].setValue(Preferences.combo[0]);

		this.updateHotKey(Preferences.hotkey);

		for (var i=1; i<4; i++)
			this.updateCombo(this.SKEY[i], Preferences.combo[i]);

		for (var i=0; i<3; i++)
			this.MOUSEKEY[i].setValue(this.MouseButton[i].values[Preferences.mouse[i]]);

		this.PanelSizeH.setValue(Preferences.height + ' px');
		this.PanelSizeC.setValue(Preferences.columns);
		this.Version.textContent += Preferences.version;
	},

	updateCombo : function(OBJ, value) {
		value == 1 ? OBJ.className="hkey_use" : OBJ.className='';
	},

	setDisplay : function (value) {
		var elem = this.HotkeyState;
		while (elem.nextElementSibling) {
			elem = elem.nextElementSibling;
			elem.style.display = value;
		}
	},

	updateHotKey : function (value) {
		if (value == 0) {
			this.HotkeyState.className = 'disabled';
			this.HotkeyState.textContent = 'Enable';
			this.setDisplay('none');
		}
		else {
			this.HotkeyState.className = 'state';
			this.HotkeyState.textContent = 'Disable';
			this.setDisplay('inline');
		}
	}
};

function DropDown(selectId, dropmenuId, options) {
	var visbility = ["hidden", "visible"];
	var dropmenu = document.getElementById(dropmenuId);
	var select = document.getElementById(selectId);
	var state  = 0;
	var time = 0;

	var toggle = function () {

		state = 1 ^ state;

		dropmenu.style.opacity = state;
		dropmenu.style.visibility = visbility[state];

	};

	var clickOut = function (e) {
		if (parseInt(dropmenu.style.opacity) === 1) {
			if (e.target === dropmenu)
				return;

			if (e.target !== select)
				toggle();
		}
	};

	var update = function (e) {

		if (Date.now() - time < 500)
			return;

		if (e.target.className !== "dropdown") {
			options.getValue(e);
			toggle();
		}

		time = Date.now();
	};

	options.appendOptions(dropmenu);

	select.onclick = toggle;

	dropmenu.onclick = update;

	document.addEventListener('click', clickOut);

	return {
		setValue : function (value) {
			select.textContent = value;
		}
	};
};

var HotKeysOptions = function () {
	var value;
	var optionvalue;
	var nr_values = 26;

	function update () {
		self.port.emit("hotkey KEY", value);
	}

	return {
		getValue : function (e) {
			optionvalue = parseInt(e.target.getAttribute("value"));
			if (optionvalue >= 0 && optionvalue < nr_values) {
				value = String.fromCharCode(optionvalue + 65);
				update();
			}
		},

		appendOptions : function (dropmenu) {
			for (var i=0; i<nr_values; i++) {
				var option = document.createElement('div');
				option.textContent = String.fromCharCode(65 + i);
				option.setAttribute('value', i);
				dropmenu.appendChild(option);
			}
		}
	};
}();

function MouseActions(button) {
	this.button = button;
}

MouseActions.prototype = function() {
	var value;
	var nr_values = 3;
	var values = ['New Tab', 'Same Tab', 'Disabled'];

	function update (button) {
		self.port.emit("mouse button", {value : value, button: button});
	}

	function getValue (e) {
		value = parseInt(e.target.getAttribute("value"));
		if (value >= 0 && value < nr_values) {
			update(this.button);
			return e.target.textContent;
		}
		return null;
	}

	function appendOptions (dropmenu) {
		for (var i=0; i<nr_values; i++) {
			var option = document.createElement('div');
			option.textContent = values[i];
			option.setAttribute('value', i);
			dropmenu.appendChild(option);
		}
	}

	return {
		getValue : getValue,
		appendOptions : appendOptions,
		values : values
	};
}();

var PanelColumns = function () {
	var value;
	var optionvalue;
	var nr_values = 7;

	function update () {
		self.port.emit("panel columns", value);
	}

	return {
		getValue : function (e) {
			optionvalue = parseInt(e.target.getAttribute("value"));
			if (optionvalue > 0 && optionvalue < nr_values + 2) {
				value = optionvalue;
				update();
				return e.target.textContent;
			}
			return null;
		},

		appendOptions : function (dropmenu) {
			for (var i=0; i<nr_values; i++) {
				var option = document.createElement('div');
				option.textContent = i + 2;
				option.setAttribute('value', i + 2);
				dropmenu.appendChild(option);
			}
		}
	};
}();

var PanelHeight = function () {
	var value;
	var optionvalue;
	var nr_values = 25;

	function update () {
		self.port.emit("panel height", value * 25 + 200);
	}

	return {
		getValue : function (e) {
			optionvalue = parseInt(e.target.getAttribute("value"));
			if (optionvalue >= 0 && optionvalue < nr_values) {
				value = optionvalue;
				update();
				return e.target.textContent;
			}
			return null;
		},

		appendOptions : function (dropmenu) {
			for (var i=0; i<nr_values; i++) {
				var option = document.createElement('div');
				option.textContent = 25 * i + 200 + ' px';
				option.setAttribute('value', i);
				dropmenu.appendChild(option);
			}
		}
	};
}();

var BackgroundWorker = function() {

	var _load_img;
	var _preview;
	var _upload;
	var _image;

	function update() {
		triggerSaved(1);
		self.port.emit("panel image", _image);
	}

	function clearPreview() {
		_preview.removeAttribute('style');
		self.port.emit("panel image reset", _image);
	}

	function setImage(image) {

		if(image == 'default')
			return;

		_preview.style.background = 'url(' + image + ') center no-repeat';
		_preview.style.backgroundSize = 'contain';
		_preview.style.height = 200 + 'px';
	}

	function listen() {
		_load_img = document.getElementById("load_img");
		_preview = document.getElementById("preview");
		_upload = document.getElementById("browse_img");

		_load_img.onclick = getImage;
	}

	function getImage() {
		_upload.click();
		_upload.onchange = function (e) {

			e.preventDefault();

			var file = _upload.files[0];

			if ( file.type.slice(0,5) == 'image' ) {

				var reader = new FileReader();

				reader.onload = function (event) {
					_image = event.target.result;
					setImage(_image);
					update();
				};

				reader.readAsDataURL(file);
			}

			return false;
		};
	}

	return {
		init : listen,
		reset : clearPreview,
		setImage : setImage
	};

}();

/*
 * Initialize Objects
 */
Elements.setElements();


/*
 * HomePage Comunication
 */

document.onclick = function (e) {

	var elem = e.target;

	if (elem.id == "kstate") {
		self.port.emit("hotkey switch");
	}

	if (elem.parentNode.id == "specialkey") {
		self.port.emit("specialkey switch", elem.getAttribute('value'));
	}

	if (elem.id == "resetkeys") {
		self.port.emit("hotkey reset");
	}

	if (elem.id == "resetmouse") {
		self.port.emit("mouse reset");
	}

	if (elem.id == "resetdims") {
		self.port.emit("panel reset");
	}

	if (elem.id == "resetbackground") {
		BackgroundWorker.reset();
		self.port.emit("image reset");
		triggerSaved(1);
	}
};

self.port.on ('loadAddonSettings', function (Pref) {
	Preferences = Pref;
	Elements.updateSettings();
	BackgroundWorker.setImage(Pref.image);

});

self.port.on("hotkey state", function (value) {
	Elements.updateHotKey(value);
	triggerSaved(1);
});

self.port.on("specialkey state", function (key) {
	Elements.SKEY[key].className = Elements.SKEY[key].className ? '' : 'hkey_use';
	triggerSaved(1);
});

self.port.on("hotkey KEY", function(key) {
	Elements.SKEY[0].setValue(key);
	triggerSaved(1);
});

self.port.on("hotkey reset", function (combo) {
	Elements.SKEY[0].setValue(combo[0]);
	for (var i=1; i<4; i++)
		Elements.updateCombo(Elements.SKEY[i], combo[i]);

	triggerSaved(1);
});

self.port.on("mouse button", function(obj) {
	Elements.MOUSEKEY[obj.button].setValue(Elements.MouseButton[obj.button].values[obj.value]);
	triggerSaved(1);
});

self.port.on("mouse reset", function(obj) {
	for (var i in [0, 1, 2])
		Elements.MOUSEKEY[i].setValue(Elements.MouseButton[i].values[obj[i]]);

	triggerSaved(1);
});

self.port.on("panel height", function(value) {
	Elements.PanelSizeH.setValue(value + ' px');

	triggerSaved(1);
});

self.port.on("panel columns", function(value) {
	Elements.PanelSizeC.setValue(value);
	triggerSaved(1);
});

self.port.on("panel reset", function(obj) {
	Elements.PanelSizeH.setValue(obj.height + ' px');
	Elements.PanelSizeC.setValue(obj.columns);
	triggerSaved(1);
});

function triggerSaved(value) {

	clearTimeout(Elements.timeout);

	if (value == 1) {
		Elements.save.style.opacity = 1;
		Elements.timeout = setTimeout(triggerSaved, 1500, 0);
	}
	else {
		Elements.save.removeAttribute('style');
	}
}