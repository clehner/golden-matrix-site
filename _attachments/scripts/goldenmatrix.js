Couch.urlPrefix =
	(location.host == "localhost" || location.host == "cel.local") ?
	"/couchdb/" : "";
var db = Couch.db("goldenmatrix");

var nodeContainer = $("map");

var nodes = [];
var nodesById = {};
function getNodeById(id) {
	return nodesById[id];
}
function addNode(node) {
	nodesById[node.id] = node;
	nodes.push(node);
	nodeContainer.appendChild(node.element);
	node.animateSizeToYear(currentYear);
}

function ease(x) {
	return x < .5 ? 2*x*x : 1 - 2*(1-x)*(1-x);
}

function GMThread(doc) {
	this.id = doc._id;
	this.name = doc.name;
	this.element = document.createElement("div");
	this.element.className = "node-thread";
	this.element.innerHTML = doc.content.replace(/\n/g, "<br>");
}
GMThread.prototype = {
	
};

function GMNode(doc) {
	this.id = doc._id;
	this.name = doc.name;
	this.threads = [];
	this.threadsById = {};
	this.timeline = doc.timeline.sort(function (point1, point2) {
		return point1[0] - point2[0];
	});
	this.element = document.createElement("a");
	this.element.className = "node";
	this.element.href = "#{year}," + this.id;
	this.element.title = this.name;
	
	var nameEl = document.createElement("span");
	nameEl.className = "name";
	nameEl.appendChild(document.createTextNode(this.name));
	this.element.appendChild(nameEl);
	
	var s = this.element.style;
	var pos = doc.position || 0;
	s.left = pos[0] * 100 + "%";
	s.top = pos[1] * 100 + "%";
	
	// headings for the threads. located in the sidebar.
	this.headingsElement = document.createElement("div");
	this.headingsByThreadId = {};
	
	var h2 = document.createElement("h2");
	h2.appendChild(document.createTextNode(this.name));
	this.headingsElement.appendChild(h2);
}
GMNode.prototype = {
	baseSize: 3, // *10 radius
	setThread: function (thread) {
		var id = thread.id;
		var oldThread = this.threadsById[id];
		if (oldThread) this.threads.splice(this.threads.indexOf(oldThread), 1);
		this.threads.push(thread);
		this.threadsById[id] = thread;
		var oldHeading = this.headingsByThreadId[id];
		if (oldHeading) this.headingsElement.removeChild(oldHeading);
		var newHeading = document.createElement("h3");
		this.headingsByThreadId[id] = newHeading;
		var link = document.createElement("a");
		link.href = "#{year}," + id;
		link.appendChild(document.createTextNode(thread.name));
		newHeading.appendChild(link);
		this.headingsElement.appendChild(newHeading);
	},
	getThread: function (id) {
		return this.threadsById[id];
	},
	getSizeAtYear: function (year) {
		var timeline = this.timeline;
		var prevYear, nextYear = -Infinity;
		var prevSize = 0, nextSize = 0;
		for (var i = 0; i < timeline.length; i++) {
			var point = timeline[i];
			prevYear = nextYear;
			prevSize = nextSize;
			nextYear = point[0];
			nextSize = point[1];
			if (year < nextYear) break;
		}
		if (year > nextYear) return nextSize;
		var yearRange = nextYear - prevYear;
		var sizeRange = nextSize - prevSize;
		if (sizeRange == 0) return nextSize;
		var size = prevSize + ease((year - prevYear) / yearRange) * sizeRange;
		return size;
	},
	areaToRadius: function (area) {
		return Math.sqrt(area) * this.baseSize
			* nodeContainer.offsetWidth / 685 + "px";
	},
	animateSizeToYear: function (year, force) {
		if (this.currentYear == year && !force) return;
		this.currentYear = year;
		var size = this.getSizeAtYear(year).toFixed(0);
		if (this.currentSize == size && !force) return;
		var style = this.element.style;
		if (size == 0) {
			style.display = "none";
		} else if (this.currentSize == 0) {
			style.display = "";
		}
		this.currentSize = size;
		style.fontSize = this.areaToRadius(size);
	}
}

function getNodesAtYear(year) {
	return nodes.filter(function (node) {
		return node.getSizeAtYear(year) != 0;
	});
}

var visibleNodes = nodes;
function updateNodeSizesWithYear(year) {
	var prevNodes = visibleNodes;
	visibleNodes = getNodesAtYear(year);
	var nodesToConsider = visibleNodes.union(prevNodes);
	nodesToConsider.forEach(function (node) {
		node.animateSizeToYear(year);
	});
}

db.view('goldenmatrix/nodes_and_threads', {
	include_docs: true,
	success: function (data) {
		data.rows.forEach(function (row) {
			addDoc(row.doc);
		});
		slider.update();
		readHash();
	}
});

function addDoc(doc) {
	if (doc.type == "node") {
		addNode(new GMNode(doc));
	} else if (doc.type == "node-thread") {
		getNodeById(doc.node).setThread(new GMThread(doc));
	}
}

var dateEl = $("current-date");
var dateTextEl = dateEl.firstChild;

var startYear = -1300;
var endYear = 1453;
var yearStep = 1;
var defaultYear = -500;

var currentYear = defaultYear;
var yearRange = endYear - startYear;

var defaultId = '';
var currentId = defaultId;
var currentNode;
var currentNodeThread;

var slider = new Slider({
	element: dateEl,
	snap: yearStep / (yearRange),
	onupdate: function (part) {
		var year = currentYear = (startYear + yearRange * part).toFixed(0);
		var era = year < 0 ? "BC" : "CE";
		dateTextEl.nodeValue = Math.abs(year) + " " + era;
		updateNodeSizesWithYear(year);
		updateHashSoon();
	}
});

function gotoYear(year) {
	slider.set((year - startYear) / yearRange);
}

var headingsElement = $("node-headings");
var contentElement = $("node-thread-content");
var contentHeadingText = $("node-thread-heading").firstChild;
function gotoNodeThread(node, thread) {
	if (!thread) {
		// use first thread if none is specified
		thread = node.threads[0];
		var redirecting = true;
	}
	if (currentNodeThread != thread) {
		currentNodeThread = thread;
		var old = contentElement.firstChild;
		if (old) contentElement.removeChild(old);
		if (thread) contentElement.appendChild(thread.element);
		contentHeadingText.nodeValue = thread ? thread.name : "";
	}
	if (currentNode != node) {
		currentNode = node;
		old = headingsElement.firstChild;
		if (old) headingsElement.removeChild(old);
		headingsElement.appendChild(node.headingsElement);
	}
	currentId = thread ? thread.id : node ? node.id : '';
	if (redirecting) {
		// try not to break the back button when rewriting the hash
		updateHash(true);
	}
}

function updateHash(replace) {
	var hash = "";
	if (currentYear != defaultYear ||
		currentId != defaultId) {
		hash = "#" + currentYear;
		if (currentId) {
			hash += "," + currentId;
		}
	}
	if (replace) {
		location.replace(hash);
	} else {
		location.hash = hash;
	}
}
var updateHashSoon = updateHash.debounce(500);

function readHash(e) {
	var hash = location.hash.substr(1);
	var parts = hash.split(",");
	var year = parts[0] || defaultYear;
	var id = currentId = parts[1] || defaultId;
	gotoYear(year);
	var node = nodesById[id];
	if (node) {
		gotoNodeThread(node, null);
	} else {
		var split = id.split("-");
		var node = nodesById[split[0]];
		if (node) {
			var thread = node.getThread(id);
			gotoNodeThread(node, thread);
		}
	}
}
readHash();
window.addEventListener("hashchange", readHash, false);

// rewrite links with hashes. i bet some framework does this kind of thing.
function rewriteHref(e) {
	var a = e.target;
	if (a.nodeName != "A") {
		a = a.parentNode;
	}
	if (a.nodeName != "A") {
		return;
	}
	var href = a.getAttribute("href");
	if (!href) {
		return;
	}
	var href2 = a.getAttribute("data-href");
	if (href2) {
		href = href2;
	} else {
		a.setAttribute("data-href", href);
	}
	a.setAttribute("href", href.replace("{year}", currentYear));
}
document.addEventListener("click", rewriteHref, false);
document.addEventListener("focus", rewriteHref, false);
document.addEventListener("mouseover", rewriteHref, false);

// prevent dragging map image
$("map-img").addEventListener("mousedown", function (e) {
	e.preventDefault();
}, false);

var mapContainer = $("map-container");
window.addEventListener("resize", onResize, false);
function hideMap() {
	nodeContainer.style.display = "none";
}
function showMap() {
	nodeContainer.style.display = "inline-block";
	visibleNodes.forEach(function (node) {
		node.animateSizeToYear(currentYear, true);
	});
}
function onResize(e) {
	hideMap();
	setTimeout(showMap, 0);
}


// utility
/*
nodes.map(function (node) { return node.id; }).forEach(function (nodeId) {
	db.openDoc(nodeId, {success: function (doc) {
		doc.position = [
			(doc.position[0] * 741 - 56) / 685,
			(doc.position[1] * 425 - 95) / 330
			];
		db.saveDoc(doc);
	}});
});
*/