function(doc) {
	if (doc.type == "node") {
		emit([doc._id]);
	} else if (doc.type == "node-thread") {
		emit([doc.node, doc.position || 0], doc._id);
	}
}