'use strict';

// *****************************************************************************
// Custom Modules


// *****************************************************************************
// AutoScroll

var AutoScroll = (function AutoScroll() {

	var autoScroll = false;
	var prevScroll = 0;
	var scrollSpeed = 0;
	
	// scroll a DOM node with a specified speed
	function scroll(node, speed) {
		
		scrollSpeed = speed / 10;
		if (autoScroll == true)
			return;
		
		autoScroll = true;
		
		function scroll() {

			if (autoScroll == false)
				return;
	
			prevScroll = node.scrollTop; 
			node.scrollTop += scrollSpeed;
	
			if (node.scrollTop != prevScroll)	
				node.ownerGlobal.requestAnimationFrame(scroll);
			else
				autoScroll = false;
		}
		
		node.ownerGlobal.requestAnimationFrame(scroll);
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
// Public API
exports.AutoScroll = AutoScroll;