'use strict';

// *****************************************************************************
// API

var DragHandlers = (function DragHandlers() {

	var DragedElement = null;
	var parentElement = null;
	var index = null;
	var initial_index = null;

	// var img = new Image();
	// img.src = 'https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif';

	function getChildIndex(node) {
		var i = 0;
		while (node !== null) {
			node = node.previousElementSibling;
			i++;
		}
		return i;
	}

	var start = function start(e) {
		DragedElement = this;
		parentElement = this.parentElement;
		DragedElement.classList.add('drag');
		e.dataTransfer.effectAllowed = 'copy';
		e.dataTransfer.setData('drag', 'drag');
		// e.dataTransfer.setDragImage(img, -10, -10);
		index = getChildIndex(DragedElement);
		initial_index = index;
	};

	var end = function end(e) {
		DragedElement.classList.remove('drag');
		return {
			from: initial_index,
			to: index
		};
	};

	var enter = function enter(e) {
		if (this === DragedElement || e.target.parentElement !== parentElement)
			return;

		var nodeIndex = getChildIndex(this);

		if (index <= nodeIndex) {
			this.parentElement.insertBefore(DragedElement, this.nextElementSibling);
		}
		else {
			this.parentElement.insertBefore(DragedElement, this);
		}

		index = nodeIndex;
	};

	var setDraggable = function setDraggable(node, callback) {
		node.addEventListener('dragstart', start);
		node.addEventListener('dragenter', enter);
		node.addEventListener('dragend', function() {
			var info = end();
			if (info.from == info.to) return;
			callback(info);
		});
	};

	return {
		setDraggable: setDraggable
	};

})();


exports.DragNDrop = DragHandlers;