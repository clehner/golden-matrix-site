if (location.host == "localhost" || location.host == "cel.local") {
	Couch.urlPrefix = "/couchdb";
}
var db = Couch.db("goldenmatrix");

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
	},
	addNewThread: function () {
		var name = prompt("Enter a name for the node, capitalized.", "");
		if (!name) return;
		var doc = {
			_id: this.id + "-" + name.toLowerCase(),
			name: name,
			type: "node-thread",
			node: this.id,
			content: ""
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
			close();
			alert(JSON.stringify(this.doc.timeline));
		}.bind(this), false);
	}
};

var nodeThreads = {};
function GMThread(id, doc) {
	nodeThreads[id] = this;
	this.id = id;
	this.name = id.split("-")[1];
	this.doc = doc;
	
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
	},
	closeEditor: function () {
		this.el.removeChild(this.editorEl);
	},
	saveEdits: function () {
		this.doc.content = this.editorTextarea.value;
		addText(this.editorEl, "...");
		db.saveDoc(this.doc, {
			success: this.closeEditor.bind(this),
			error: function (e) {
				addText(this.editorTextarea, e);
			}
		});
	}
};

function showList() {
	db.view('goldenmatrix/node_and_thread_names', {
		group: true,
		success: function (data) {
			data.rows.forEach(function (row) {
				var nodeName = row.key;
				var threadNames = row.value;
				var node = new GMNode(nodeName);
				threadNames.forEach(function (threadName) {
					node.addThread(new GMThread(threadName));
				});
			});
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
		var username = session.userCtx.name;
		if (username) {
			showList();
			showLoggedinUser(username);
		} else {
			showLogin();
		}
	}, error: function (reason) {
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