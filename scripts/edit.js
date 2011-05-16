Couch.urlPrefix = "/couchdb/";
var db = Couch.db("goldenmatrix");

var nodesList = $("nodes");

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
	this.el.appendChild(document.createTextNode(id));
	
	addText(this.el);
	this.editLink = document.createElement("a");
	this.editLink.href = "";
	this.editLink.onclick = bindClick(this.openForEditing);
	this.editLink.appendChild(document.createTextNode("edit"));
	this.el.appendChild(this.editLink);
	
	addText(this.el);
	this.addLink = document.createElement("a");
	this.addLink.href = "";
	this.addLink.onclick = bindClick(this.addNewThread);
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
	openForEditing: function () {
		
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
		
		var saveBtn = document.createElement("button");
		addText(saveBtn, "Save");
		saveBtn.type = "submit";
		this.editorEl.appendChild(saveBtn);
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
