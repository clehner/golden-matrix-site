if (location.host == "localhost" || location.host == "cel.local") {
	Couch.urlPrefix = "/couchdb";
}
var db = Couch.db("goldenmatrix");
var userCtx;
var username;
function isAdmin() {
	return userCtx && userCtx.roles.indexOf("_admin") != -1;
}
var nodesList;

function addText(element, text) {
	element.appendChild(document.createTextNode(text || " "));
}
function bindClick(handler, self) {
	return function (e) {
		e.preventDefault();
		handler.call(self);
	};
}

var nodes = {};
function GMNode(id) {
	this.id = id;
	nodes[id] = this;
	this.threads = [];
	
	this.el = document.createElement("li");
	var h = document.createElement("strong");
	h.appendChild(document.createTextNode(id));
	this.el.appendChild(h);
	//this.el.appendChild(document.createTextNode(id));
	
	addText(this.el);
	this.editLink = document.createElement("a");
	this.editLink.href = "";
	this.editLink.onclick = bindClick(this.openForEditing, this);
	this.editLink.appendChild(document.createTextNode("edit"));
	this.el.appendChild(this.editLink);
	
	addText(this.el);
	this.addLink = document.createElement("a");
	this.addLink.href = "";
	this.addLink.onclick = bindClick(this.addNewThread, this);
	this.addLink.appendChild(document.createTextNode("add node"));
	this.el.appendChild(this.addLink);
	
	this.threadsEl = document.createElement("ul");
	this.el.appendChild(this.threadsEl);
	
	// add to list
	nodesList.appendChild(this.el);
}
GMNode.prototype = {
	addThread: function (thread) {
		this.threadsEl.appendChild(thread.el);
		this.threads.push(thread);
		thread.node = this;
	},
	addNewThread: function () {
		var name = prompt("Enter a name for the node.", "");
		if (!name) return;
		name = name.trim();
		var doc = {
			_id: this.id + "-" + name.toLowerCase(),
			name: name,
			type: "node-thread",
			node: this.id,
			content: "",
			author: username
		};
		this.addThread(new GMThread(doc._id, doc));
		db.saveDoc(doc);
	},
	openForEditing: function () {
		db.openDoc(this.id, {success: function (doc) {
			this.doc = doc;
			this.addEditor();
		}.bind(this)});
	},
	addEditor: function () {
		// timeline editor
		var editorForm = document.createElement("form");
		var timeline = [];//this.doc.timeline.slice(0);
		var timelineInput = document.createElement("input");
		timelineInput.className = "timeline-editor-input";
		// allow editing the timeline in a simple text format
		timelineInput.value = this.doc.timeline.map(function (point) {
			return point.join(":");
		}).join(", ");
		this.el.insertBefore(editorForm, this.threadsEl);
		editorForm.appendChild(document.createTextNode("timeline: "));
		editorForm.appendChild(timelineInput);
		
		var saveBtn = document.createElement("input");
		saveBtn.type = "submit";
		saveBtn.value = "Save";
		editorForm.appendChild(saveBtn);
		
		var cancelBtn = document.createElement("input");
		cancelBtn.type = "reset";
		cancelBtn.value = "Cancel";
		editorForm.appendChild(cancelBtn);
		
		var el = this.el;
		function close() {
			el.removeChild(editorForm);
		}
		
		editorForm.addEventListener("reset", close, false);
		editorForm.addEventListener("submit", function (e) {
			e.preventDefault();
			this.doc.timeline = timelineInput.value.split(/, */).map(
				function (pointStr) {
					return pointStr.split(/: */).map(function (n) {
						return +n || 0;
					});
				}
			);
			db.saveDoc(this.doc, {
				success: close,
				error: function (status, err, reason) {
					addText(editorForm, reason);
				}.bind(this)
			});
		}.bind(this), false);
	},
	closeEditor: function () {
		this.el.removeChild(this.editorEl);
	},
	reorderThreads: function () {
		var threadsEl = this.threadsEl;
		this.threads.sort(function (a, b) {
			return a.doc.position - b.doc.position;
		}).forEach(function (thread) {
			threadsEl.appendChild(thread.el);
		});
	},
};

var nodeThreads = {};
function GMThread(id, doc, position) {
	nodeThreads[id] = this;
	this.id = id;
	this.name = id.split("-")[1];
	this.doc = doc || {position: position};
	
	this.el = document.createElement("li");
	this.el.appendChild(document.createTextNode(this.name));
	
	addText(this.el);
	this.editLink = document.createElement("a");
	this.editLink.href = "";
	this.editLink.onclick = bindClick(this.openForEditing, this);
	this.editLink.appendChild(document.createTextNode("edit"));
	this.el.appendChild(this.editLink);
}
GMThread.prototype = {
	openForEditing: function () {
		db.openDoc(this.id, {success: function (doc) {
			this.doc = doc;
			this.addEditor();
		}.bind(this)});
	},
	addEditor: function () {
		this.editorEl = document.createElement("form");
		this.editorEl.onsubmit = bindClick(this.saveEdits, this);
		this.editorEl.onreset = bindClick(this.closeEditor, this);
		this.el.appendChild(this.editorEl);
		
		this.editorTextarea = document.createElement("textarea");
		this.editorTextarea.value = this.doc.content;
		this.editorEl.appendChild(this.editorTextarea);
		
		var saveBtn = document.createElement("input");
		saveBtn.value = "Save";
		saveBtn.type = "submit";
		this.editorEl.appendChild(saveBtn);
		
		var cancelBtn = document.createElement("input");
		cancelBtn.value = "Cancel";
		cancelBtn.type = "reset";
		this.editorEl.appendChild(cancelBtn);
		
		if (isAdmin()) {
			var deleteBtn = document.createElement("input");
			deleteBtn.value = "Delete";
			deleteBtn.type = "button";
			deleteBtn.onclick = this.deleteDoc.bind(this);
			this.editorEl.appendChild(deleteBtn);
		}
		
		addText(this.editorEl, " position: ");
		this.positionInput = document.createElement("input");
		this.positionInput.size = 1;
		this.positionInput.value = this.doc.position || 0;
		this.editorEl.appendChild(this.positionInput);
	},
	deleteDoc: function () {
		addText(this.editorEl, "...");
		db.removeDoc(this.doc, {
			success: function () {
				this.el.parentNode.removeChild(this.el);
				this.closeEditor();
			}.bind(this),
			error: function (status, err, reason) {
				addText(this.editorEl, reason);
			}.bind(this)
		});
	},
	closeEditor: function () {
		this.el.removeChild(this.editorEl);
	},
	saveEdits: function () {
		this.doc.content = this.editorTextarea.value;
		this.doc.position = +this.positionInput.value || 0;
		addText(this.editorEl, "...");
		db.saveDoc(this.doc, {
			success: function () {
				this.closeEditor();
				this.node.reorderThreads();
			}.bind(this),
			error: function (status, err, reason) {
				addText(this.editorEl, reason);
			}.bind(this)
		});
	}
};

function showList() {
	db.view('goldenmatrix/nodes_and_threads', {
		success: function (data) {
			var threadsByNode = {};
			data.rows.forEach(function (row) {
				var node = row.key[0];
				var thread = row.value;
				var threads = threadsByNode[node] || (threadsByNode[node] = []);
				if (thread) threads.push(thread);
			});
			for (var nodeName in threadsByNode) {
				var threadNames = threadsByNode[nodeName];
				var node = new GMNode(nodeName);
				threadNames.forEach(function (threadName, i) {
					node.addThread(new GMThread(threadName, null, i));
				});
			}
		}
	});
}

function hideList() {
	nodesList.innerHTML = "";
	nodes = {};
	nodeThreads = {};
}

function showLoggedinUser(username) {
	$("login-status").style.display = username ? "block" : "none";
	$("loggedin-user").innerHTML = username;
}

function init() {
	nodesList = $("nodes");
	setupLogin();
	Couch.session({success: function (session) {
		userCtx = session.userCtx;
		username = userCtx.name;
		if (username) {
			showList();
			showLoggedinUser(username);
		} else {
			showLogin();
		}
	}, error: function (reason) {
		username = null;
		userCtx = null;
		showLogin();
	}});
}

function showLogin() {
	$("login").style.display = "block";
	showLoggedinUser("");
}

function hideLogin() {
	$("login").style.display = "none";
}

function setLoginMsg(msg) {
	$("login-msg").textContent = msg;
}

var authTarget = "http://home.lehnerstudios.com:8124/login";
function setupLogin() {
	$("logout-link").onclick = function (e) {
		e.preventDefault();
		Couch.logout({success: function () {
			showLogin();
			hideList();
		}});
	};
	$("login").onsubmit = function (e) {
		e.preventDefault();
		var user = $("username").value;
		user = $("username").value = user.replace("@ross.org", "");
		var pass = $("password").value;
		setLoginMsg("...");
		RossCouchAuth.login(authTarget, user, pass, function (ok) {
			if (ok) {
				setLoginMsg("");
				hideLogin();
				showList();
				showLoggedinUser(user);
			} else {
				setLoginMsg("Unable to log in.");
			}
		});
	};
}