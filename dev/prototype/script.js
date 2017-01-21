'use strict';

// *****************************************************************************
// Utils


function restrictRange(value, min, max) {
	if (value > min) {
		if (value < max) return value;
		return max;
	}
	return min;
}

// AutoScroll

var AutoScroll = (function AutoScroll() {

	var autoScroll = false;
	var prevScroll = 0;
	var scrollSpeed = 0;
	
	function scroll(DomNode, speed) {
		
		scrollSpeed = speed / 10;
		if (autoScroll == true)
			return;
		
		autoScroll = true;
		
		function scroll() {

			if (autoScroll == false)
				return;
	
			prevScroll = DomNode.scrollTop; 
			DomNode.scrollTop += scrollSpeed;
	
			if (DomNode.scrollTop != prevScroll)	
				requestAnimationFrame(scroll);
			else
				autoScroll = false;
		}
		
		requestAnimationFrame(scroll);
	}
	
	function stop() {
		autoScroll = false;
	}
	
	return {
		scroll : scroll,
		stop : stop 
	};
})();

// *****************************************************************************
// API

var Context = (function Context() {
	
	var context = null;
	
	function SetContext(node) {
		context = null;
	}
	
	function GetContext() {
		return context;
	}
	
	return {
		GetContext: GetContext, 
		SetContext: SetContext
	};
})();


var Grid = function Grid(parentNode) {
	
	var cells = [];
	var highlightCellID = 0;
	var gridWidth = 1;
	var emptyCellID = 0;
	var cellProp = {
		height: 80,
		width: 100/gridWidth,
		half_height: 40,
		half_width: 100/(2 * gridWidth)
	};
	
	// Init visual grids
	var grids = document.createElement('div');
	grids.className = 'grids';
	parentNode.appendChild(grids);
	
	// --------------------------------------------------------------
	// Events
	
	function onResize() {
		console.log('resize');
	}
	window.addEventListener('resize', onResize);

	// --------------------------------------------------------------
	// Logic
	
	function getRowColumnFromID(index) {
		var row = (index / gridWidth) | 0;
		var column = index % gridWidth;
		return {
			row : row,
			col : column
		};
	}

	function requestEmptyCell(object) {
		cells[emptyCellID].data = object;
		emptyCellID++;
		return emptyCellID - 1;
	}

	function getCellCoordinates(index) {
		var cell = getRowColumnFromID(index);
		return {
			top: cell.row * cellProp.height + cellProp.half_height,
			left: cell.col * cellProp.width + cellProp.half_width 
		};
	}
	
	function move(prevID, newID, update) {
		
		update = update === false ? false : true;  
		
		if (newID > emptyCellID - 1) {
			newID = emptyCellID - 1;
			if (prevID == newID && update)
				cells[newID].data.setCellID(newID);
		}
		
		if (prevID == newID)
			return newID;
			
		highlightCell(newID);
		var current = cells[prevID].data;  

		if (prevID > newID) {
			for (var i = prevID - 1; i >= newID; --i) {
				cells[i].data.setCellID(i + 1);
				cells[i + 1].data = cells[i].data; 
			}
		}
		// prevID < newID
		else {
			for (var i = prevID + 1; i <= newID; i++) {
				cells[i].data.setCellID(i - 1);
				cells[i - 1].data = cells[i].data; 
			}
		}
		if (update)
			current.setCellID(newID);
		cells[newID].data = current;
		return newID;
	}
	
	function computeCellID(e) {
		var deltaY = parentNode.offsetTop - e.clientY;
		if (deltaY > 0) {
			AutoScroll.scroll(parentNode, -deltaY);
		}
		else {
			var deltaY = e.clientY - (parentNode.offsetTop + parentNode.clientHeight);
			if (deltaY > 0) {
				AutoScroll.scroll(parentNode, deltaY);
			}
			else {
				AutoScroll.stop();
			}			
		} 
			
		var offsetX = e.clientX - parentNode.offsetLeft; 
		var offsetY = e.clientY - parentNode.offsetTop + parentNode.scrollTop;
		var column = (offsetX / (parentNode.clientWidth / gridWidth)) | 0;
		var row = (offsetY / cellProp.height) | 0;

		row = restrictRange(row, 0, 100);
		column = restrictRange(column, 0, gridWidth - 1);
		var cellID = restrictRange(row * gridWidth + column, 0, cells.length - 1);
		
		highlightCell(cellID);
		return cellID;
	}	
	
	function highlightCell(index) {
		cells[highlightCellID].clearHighlight();
		highlightCellID = index;
		cells[highlightCellID].highlight();
	}
	
	function addData(node) {
		var cell = new GridCell(this);
		cells.push(cell);
		// Append cell to grid 
		grids.appendChild(cell.DomNode);

		// Create data object
		var obj = new GridData(this, node);
	}
	

	// Public API
	this.move = move;
	this.requestEmptyCell = requestEmptyCell;
	this.computeCellID = computeCellID;
	this.getCellCoordinates = getCellCoordinates;
	this.addNode = addData;
	this.cellProp = cellProp;
};

/**
 * Grid Cell
 */

function GridCell(grid) {
	
	var cell = document.createElement('div');
	cell.className = 'grid';
	cell.style.width = grid.cellProp.width + '%';
	
	
	this.data = null;
	this.DomNode = cell;
}

GridCell.prototype.highlight = function highlight() {
	this.DomNode.classList.add('highlight');
};

GridCell.prototype.clearHighlight = function clearHighlight() {
	this.DomNode.classList.remove('highlight');
};


/**
 * Grid Data
 */

function GridData(grid, node) {
	
	var self = this;
	var newID = null;
	var cellID = grid.requestEmptyCell(this);
	var pos = grid.getCellCoordinates(cellID);

	function setPosition() {
		node.style.top = pos.top + 'px'; 
		node.style.left =  pos.left + '%';
	}
	
	function updatePosition(newID) {
		cellID = newID;
		pos = grid.getCellCoordinates(newID);
		setPosition();
	}
	
	function updatePosition2(newID) {
		cellID = newID;
		pos = grid.getCellCoordinates(newID);
		setPosition();
	}
	

	// --------------------------------------------------------------
	// Drag Events

	var startEvent = null;

	function mouseMoveRunOnce(e) {
		var delta = startEvent.clientX != e.clientX || startEvent.clientY != e.clientY; 
		if (delta) {
			node.style.top = e.clientY + 'px';
			node.style.left = e.clientX  + 'px';
			node.classList.add('dragging');		
			document.addEventListener('mousemove', mouseMove);
			document.removeEventListener('mousemove', mouseMoveRunOnce);
		}		
	}

	function mouseMove(e) {
		node.style.top = e.clientY + 'px';
		node.style.left = e.clientX  + 'px';

		newID = grid.computeCellID(e);
		
		// TODO - real-time edit
		if (cellID != newID) {
			cellID = grid.move(cellID, newID, false);
		}
	}

	function mouseUp(e) {
		AutoScroll.stop();
		document.removeEventListener('mousemove', mouseMoveRunOnce);
		document.removeEventListener('mousemove', mouseMove);		
		document.removeEventListener('mouseup', mouseUp);
		node.classList.remove('dragging');
		// node.classList.add('dragend');
		
		// TODO - real-time edit
		if (cellID != newID) {
			console.log('Move', cellID, newID);
			grid.move(cellID, newID);
		}
		else {
			console.log('Update position', cellID);
			updatePosition(cellID);
		}
	}

	function mouseDown(e) {
		startEvent = e;
		newID = cellID;
		document.addEventListener('mousemove', mouseMoveRunOnce);
		document.addEventListener('mouseup', mouseUp);		
	}

	// --------------------------------------------------------------
	// Init Code Events

	setPosition();
	node.addEventListener('mousedown', mouseDown);
	
	this.setCellID = function (cellID) {
		updatePosition(cellID);
	};
}

(function Sessions() {
	
	var parent = document.getElementById('sessions');
	var sessions = parent.querySelectorAll('.session'); 
	
	var gridSystem = new Grid(parent);
	
	for (var i=0; i<sessions.length; i++) {
		gridSystem.addNode(sessions[i]);
	}

	document.addEventListener('mouseup', function(e) {
		console.log(e.target, "ID", e.target.id, "CLASS", e.target.className);
	});

	function dropEvent(node) {
	};

	var labels = parent.querySelectorAll('.label');
	for (var i=0; i<labels.length; i++) {
		grid_system.addNode(sessions[i]);
	}
	
	
})();

