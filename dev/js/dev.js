var addGlowEffect = function addGlowEffect(id) {
	if (animate === true)
		return;

	animate = true;
	var store = new Shadow();
	var shadow = active.shadows[id];

	store.copy(shadow);
	shadow.color.setRGBA(40, 125, 200, 1);
	shadow.blur = 10;
	shadow.spread = 10;

	active.node.style.transition = "box-shadow 0.2s";
	updateShadowCSS(id);

	setTimeout(function() {
		shadow.copy(store);
		updateShadowCSS(id);
		setTimeout(function() {
			active.node.style.removeProperty("transition");
			animate = false;
		}, 100);
	}, 200);
};