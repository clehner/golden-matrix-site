function (keys, values) {
	return keys.map(function (key) {
		return key[0][1];
	}).filter(Boolean);
}