define(function(require, exports) {
	'use strict';

	// *****************************************************************************
	// AutoScroll

	var AutoScroll = (function AutoScroll() {

		var autoScroll = false;
		var prevScroll = 0;
		var scrollSpeed = 0;
		var scrollingNode;
		var scrollTarget;
		var scrollDir = 0;

		function scrollingAnimation()
		{
			if (autoScroll == false)
			{
				return;
			}

			prevScroll = scrollingNode.scrollTop;
			scrollingNode.scrollTop += scrollSpeed;

			if (scrollingNode.scrollTop != prevScroll)
			{
				if (scrollTarget != undefined) {
					if (scrollDir * scrollingNode.scrollTop > scrollTarget) {
						scrollingNode.scrollTop = scrollDir * scrollTarget;
						autoScroll = false;
						return;
					}
				}
				requestAnimationFrame(scrollingAnimation);
			}
			else
			{
				autoScroll = false;
			}
		}

		// scroll a DOM node with a specified speed
		function scroll(node, speed)
		{
			scrollSpeed = speed / 10;

			if (autoScroll == true)
			{
				return;
			}

			scrollTarget = undefined;
			autoScroll = true;
			scrollingNode = node;
			requestAnimationFrame(scrollingAnimation);
		}

		function stop()
		{
			autoScroll = false;
		}

		function scrollTo(node, offset, time)
		{
			if (autoScroll == true)
			{
				return;
			}

			autoScroll = true;
			scrollingNode = node;
			scrollSpeed = (offset - node.scrollTop) / (time * 60);
			scrollDir = scrollSpeed > 0 ? 1 : -1;
			scrollTarget = offset * scrollDir;
			requestAnimationFrame(scrollingAnimation);
		}

		return {
			scroll : scroll,
			scrollTo: scrollTo,
			stop : stop
		};
	})();

	// *****************************************************************************
	// Public API
	exports.AutoScroll = AutoScroll;
});