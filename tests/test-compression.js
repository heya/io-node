'use strict';

const unit = require('heya-unit');
const io   = require('../main');

const alphabet = 'abcdefghijklmnopqrstuvwxyz';

const rep = (str, n) => {
	let buffer = '', t = str;
	while (n > 0) {
		if (n & 1) {
			buffer += t;
		}
		n >>= 1;
		if (n) {
			t += t;
		}
	}
	return buffer;
};

unit.add(module, [
	function test_compression_get (t) {
		const x = t.startAsync();
		io.get({
			url: 'http://localhost:3000/alpha',
			returnXHR: true
		}, {n: 100}).then(xhr => {
			eval(t.TEST('xhr.getResponseHeader("Content-Encoding")'));
			eval(t.TEST('xhr.responseText.length === 2600'));
			for (let i = 0; i < xhr.responseText.length; i += 26) {
				eval(t.TEST('xhr.responseText.substr(i, 26) === alphabet'));
			}
			x.done();
		});
	},
	function test_compression_post (t) {
		const x = t.startAsync();
		io.post({
			url: 'http://localhost:3000/alpha',
			headers: {
				'Content-Type': 'plain/text'
			}
		}, rep(alphabet, 100)).then(data => {
			eval(t.TEST('data.n === 2600'));
			eval(t.TEST('data.verified'));
			x.done();
		});
	},
	function test_compression_force (t) {
		const x = t.startAsync();
		io.post({
			url: 'http://localhost:3000/alpha',
			headers: {
				'Content-Type': 'plain/text',
				'Content-Encoding': 'gzip'
			}
		}, rep(alphabet, 100)).then(data => {
			eval(t.TEST('data.n === 2600'));
			eval(t.TEST('data.verified'));
			x.done();
		});
	}
]);
