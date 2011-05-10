function(doc) {
	if (doc.type == "node") {
		emit([doc._id, 0], doc);
	} else if (doc.type == "node-thread") {
		emit([doc.node, 1], doc);
	}
}