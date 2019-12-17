'use strict';

const {PassThrough} = require('stream');

const unit = require('heya-unit');
const io   = require('../main');


const alphabet = 'abcdefghijklmnopqrstuvwxyz';

unit.add(module, [
	function test_node_$tream (t) {
		const x = t.startAsync();
		io.get({
			url: 'http://localhost:3000/alpha',
			responseType: '$tream'
		}, {n: 100}).then(res => {
			let buffer = null;
			res.on('data', chunk => (buffer === null ? (buffer = chunk) : (buffer += chunk)));
			res.on('end', () => {
				eval(t.TEST('buffer.length === 2600'));
				for (let i = 0; i < buffer.length; i += 26) {
					eval(t.TEST('buffer.toString("utf8", i, i + 26) === alphabet'));
				}
				x.done();
			});
		});
	},
	function test_node_fromStream (t) {
		const x = t.startAsync(), dataStream = new PassThrough();
		io.post({
			url: 'http://localhost:3000/api',
			headers: {
				'Content-Type': 'application/json'
			}
		}, dataStream).then(data => {
			eval(t.TEST('data.method === "POST"'));
			eval(t.TEST('data.body === "{\\"a\\":1}"'));
			x.done();
		});
		dataStream.end(JSON.stringify({a: 1}));
	},
	function test_node_forceCompression (t) {
		const x = t.startAsync(), dataStream = new PassThrough();
		io.post({
			url: 'http://localhost:3000/alpha',
			headers: {
				'Content-Type': 'plain/text',
				'$-Content-Encoding': 'gzip'
			}
		}, dataStream).then(data => {
			eval(t.TEST('data.n === 2626'));
			eval(t.TEST('data.verified'));
			x.done();
		});
		for (let i = 0; i < 100; ++i) dataStream.write(alphabet);
		dataStream.end(alphabet);
	},
	function test_node_buffer(t) {
		const x = t.startAsync();
		io.post({
			url: 'http://localhost:3000/api',
			headers: {
				'Content-Type': 'application/json'
			}
		}, Buffer.from(JSON.stringify({a: 1}))).then(data => {
			eval(t.TEST('data.method === "POST"'));
			eval(t.TEST('data.headers["content-type"] === "application/json"'));
			eval(t.TEST('data.body === "{\\"a\\":1}"'));
			x.done();
		});
	},
	function test_node_redirect (t) {
		const x = t.startAsync(), dataStream = new PassThrough();
		io.post({
			url: 'http://localhost:3000/redirect?to=/api',
			headers: {
				'Content-Type': 'application/json'
			}
		}, dataStream).then(data => {
			// console.log(data);
			eval(t.TEST('data.method === "POST"'));
			eval(t.TEST('data.body === "{\\"a\\":1}"'));
			x.done();
		});
		dataStream.end(JSON.stringify({a: 1}));
	}
]);
