Function.prototype.bind = function (context) {
	var fn = this;
	return function () {
		return fn.apply(context, arguments);
	} ;
};

function $(id) {
	return document.getElementById(id);
}

function getElementByClassName(parent, className) {
	return [].slice.call(parent.getElementsByTagName("*")).first(
		function (el) {
			return el.className = className;
		}
	);
}

Array.prototype.first = function (criteria) {
	for (var i = 0; i < this.length; i++) {
		if (criteria(this[i])) {
			return this[i];
		}
	}
};

Array.prototype.union = function (array) {
	if (!array || !array.filter) {
		return this.slice();
	}
	var original = this;
	return this.concat(array.filter(function (item) {
		return original.indexOf(item) == -1;
	}));
};

function ajax(url, cb) {
	var req;
	if (window.XMLHttpRequest) req = new XMLHttpRequest();
	else if (window.ActiveXObject) req = new ActiveXObject("Microsoft.XMLHTTP");
	if (!req) return;
	
	req.onreadystatechange = function () {
		if (req.readyState == 4) {
			cb(req.responseText);
		}
	};
	
	// Make the request
	req.open('GET', url, true);
	req.send(null);
}

function Slider(opt) {
	var sliderEl = opt.element;
	var trackEl = sliderEl.parentNode;
	var snap = opt.snap;
	var onupdate = opt.onupdate;
	var pos;
	
	sliderEl.addEventListener("mousedown", mousedown, false);

	// allow clicking in the track to jump
	trackEl.addEventListener("mousedown", trackMousedown, false);
	function trackMousedown(e) {
		sliderEl.style.left = e.layerX - sliderEl.offsetWidth / 2 + "px";
		mousedown(e);
	}
	
	var dragging = false;
	var startX;
	function mousedown(e) {
		if (dragging) return;
		dragging = true;
		document.addEventListener("mousemove", drag, false);
		document.addEventListener("mouseup", mouseup, false);
		document.addEventListener("contextmenu", mouseup, false);
		startX = sliderEl.offsetLeft - e.pageX;
		// prevent accidental text selection while dragging slider
		e.preventDefault();
		e.stopPropagation();
	}
	function mouseup(e) {
		dragging = false;
		document.removeEventListener("mousemove", drag, false);
		document.removeEventListener("mouseup", mouseup, false);
	}
	
	function drag(e) {
		var sliderX = e.pageX + startX;
		var part = sliderX / trackEl.offsetWidth;
		setPos(part);
	}
	
	function setPos(part) {
		pos = +((Math.min(1, Math.max(0,
			Math.round(part / snap) * snap))).toFixed(10));
		//sliderEl.style.left = sliderX + "px";
		sliderEl.style.left = pos * 100 + "%";
		update();
	}
	
	function update() {
		onupdate(pos);
	}
	
	this.set = setPos;
	this.update = update;
}

// Simulate onhashchange support in all browsers
"onhashchange" in window || (function () {
	var lastHash = '';
	function pollHash() {
		if (lastHash !== location.hash) {
			lastHash = location.hash;
			var event = document.createEvent("HTMLEvents");
			event.initEvent("hashchange", true, false);
			document.body.dispatchEvent(event);
			if (typeof onhashchange == "function") {
				onhashchange(event);
			}
		}
	}
	setInterval(pollHash, 100);
})();

// debounce, by John Hann
// http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
// discard close invokations for the last one.
Function.prototype.debounce = function (threshold, execAsap) {
	var func = this, timeout;
	return function debounced() {
		var obj = this, args = arguments;
		function delayed() {
			if (!execAsap)
				func.apply(obj, args);
			timeout = null; 
		}
 
		if (timeout)
			clearTimeout(timeout);
		else if (execAsap)
			func.apply(obj, args);
 
		timeout = setTimeout(delayed, threshold || 100); 
	};
}
