function validate(conditions) {
	for (var i = 0; i < conditions.length; i++) {
		if (!conditions[i++]) {
			throw {forbidden: conditions[i]};
		}
	}
}

function isArray(obj) {
	return Object.prototype.toString.call(obj) == "[object Array]";
}

function isPoint(obj) {
	return isArray(obj) &&
		obj.length == 2 &&
		!obj.some(isNaN);
}

function (doc, oldDoc, userCtx) {
	var isAdmin = userCtx.roles.indexOf('_admin') != -1;
	var type = doc.type || (oldDoc && oldDoc.type);
	
	if (!userCtx.name) {
		throw {unauthorized: "You must be logged in."};
	}
	
	var members = {
		jearle: 1,
		dmccall: 1,
		eschultz14: 1,
		akelly11: 1,
		clasersohn13: 1,
		bstein13: 1,
		rkadri11: 1,
		irowe12: 1,
		ccummings14: 1,
		cchanning14: 1,
		jlesser13: 1,
		mhykes14: 1,
		wkessler13: 1,
		mkiss13: 1,
		rodidi13: 1,
		clehner11: 1
	};
	
	if (!members[userCtx.name] && !isAdmin) {
		throw {unauthorized: "You don't have permission to do that."};
	}
	
	if (doc._deleted) {
		if (!isAdmin) {
			throw {unauthorized: "Only admin can delete docs."};
		}
		return;
	}
	
	if (type == "node") {
		if (doc.name.toLowerCase() != doc._id) {
			throw {forbidden: "Node id should be lowercase of its name."};
		}
		if (!isArray(doc.timeline)) {
			throw {forbidden: "Node must have a timeline array."};
		}
		if (!isArray(doc.position) || !isPoint(doc.position)) {
			throw {forbidden: "Node must have a position point."};
		}
	} else if (type == "node-thread") {
		if (doc._id != (doc.node + "-" + doc.name.toLowerCase())) {
			throw {forbidden: "Node-thread id must be node-{name} where {name} is the lowercase of its thread name."};
		}
		if (typeof doc.content != "string") {
			throw {forbidden: "Node-thread should have some content."};
		}
	
	} else {
		throw {forbidden: "Type must be node or node-thread."};
	}
}