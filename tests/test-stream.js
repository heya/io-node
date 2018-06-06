'use strict';

const {Readable, Writable} = require('stream');

const unit = require('heya-unit');
const ios = require('../stream');

const isJson = /^application\/json\b/;
// const isXml = /^application\/xml\b/;

class Collector extends Writable {
	constructor(cb) {
		super();
		this.cb = cb;
		this.buffer = null;
		this.on('finish', () => this.cb(this.buffer)); // for Node 6
	}
	_write(chunk, encoding, callback) {
		if (this.buffer === null) {
			this.buffer = chunk;
		} else {
			this.buffer += chunk;
		}
		callback(null);
	}
	// _final(callback) { // unavailable in Node 6
	// 	this.cb(this.buffer);
	// 	callback(null);
	// }
}

const collect = cb => new Collector(cb);
const collectJson = cb => collect(buffer => cb(JSON.parse(buffer.toString())));

class Pusher extends Readable {
	constructor(string) {
		super();
		this.string = string;
	}
	_read(size) {
		if (this.string) {
			if (this.string.length <= size) {
				this.push(this.string);
				this.string = '';
			} else {
				this.push(this.string.substr(0, size));
				this.string = this.string.substr(size);
			}
		} else {
			this.push(null);
		}
	}
}

const push = text => new Pusher(text);
const pushJson = object => push(JSON.stringify(object));

unit.add(module, [
	function test_stream_exist(t) {
		eval(t.TEST('typeof ios == "object"'));
		eval(t.TEST('typeof ios.IO == "function"'));
		eval(t.TEST('typeof ios.get == "function"'));
		eval(t.TEST('typeof ios.put == "function"'));
		eval(t.TEST('typeof ios.post == "function"'));
		eval(t.TEST('typeof ios.patch == "function"'));
		eval(t.TEST('typeof ios.remove == "function"'));
		eval(t.TEST('typeof ios["delete"] == "function"'));
	},
	function test_stream_io1(t) {
		const x = t.startAsync();
		const s = new ios.IO('http://localhost:3000/api');
		let buffer = null;
		s.on('data', chunk => (buffer === null ? (buffer = chunk) : (buffer += chunk)));
		s.on('end', () => {
			const data = JSON.parse(buffer.toString());
			eval(t.TEST('data.method === "GET"'));
			eval(t.TEST('data.body === null'));
			x.done();
		});
	},
	function test_stream_io2(t) {
		const x = t.startAsync();
		new ios.IO('http://localhost:3000/api').pipe(
			collectJson(data => {
				eval(t.TEST('data.method === "GET"'));
				eval(t.TEST('data.body === null'));
				x.done();
			})
		);
	},
	function test_stream_get(t) {
		const x = t.startAsync();
		ios.get('http://localhost:3000/api').pipe(
			collectJson(data => {
				eval(t.TEST('data.method === "GET"'));
				eval(t.TEST('data.body === null'));
				x.done();
			})
		);
	},
	function test_stream_put(t) {
		const x = t.startAsync();
		ios.put('http://localhost:3000/api', {a: 1}).pipe(
			collectJson(data => {
				eval(t.TEST('data.method === "PUT"'));
				eval(t.TEST('data.body === "{\\"a\\":1}"'));
				x.done();
			})
		);
	},
	function test_stream_put_pipe(t) {
		const x = t.startAsync();
		pushJson({a: 1})
			.pipe(
				ios.put({
					url: 'http://localhost:3000/api',
					headers: {
						'Content-Type': 'application/json',
						'Content-Encoding': 'deflate'
					}
				})
			)
			.pipe(
				collectJson(data => {
					eval(t.TEST('data.method === "PUT"'));
					eval(t.TEST('data.body === "{\\"a\\":1}"'));
					x.done();
				})
			);
	},
	function test_stream_post(t) {
		const x = t.startAsync();
		ios.post('http://localhost:3000/api', {a: 1}).pipe(
			collectJson(data => {
				eval(t.TEST('data.method === "POST"'));
				eval(t.TEST('data.body === "{\\"a\\":1}"'));
				x.done();
			})
		);
	},
	function test_stream_patch(t) {
		const x = t.startAsync();
		ios.patch('http://localhost:3000/api', {a: 1}).pipe(
			collectJson(data => {
				eval(t.TEST('data.method === "PATCH"'));
				eval(t.TEST('data.body === "{\\"a\\":1}"'));
				x.done();
			})
		);
	},
	function test_stream_remove(t) {
		const x = t.startAsync();
		ios.remove('http://localhost:3000/api').pipe(
			collectJson(data => {
				eval(t.TEST('data.method === "DELETE"'));
				eval(t.TEST('data.body === null'));
				x.done();
			})
		);
	},
	function test_stream_get_query(t) {
		const x = t.startAsync();
		ios.get('http://localhost:3000/api', {a: 1}).pipe(
			collectJson(data => {
				eval(t.TEST('data.method === "GET"'));
				eval(t.TEST('t.unify(data.query, {a: "1"})'));
				x.done();
			})
		);
	},
	function test_stream_get_error(t) {
		const x = t.startAsync();
		const stream = ios.get('http://localhost:3000/api', {status: 500});
		stream.pipe(
			collectJson(data => {
				t.test(false); // we should not be here
				x.done();
			})
		);
		stream.on('error', e => {
			eval(t.TEST('e.xhr.status === 500'));
			x.done();
		});
	},
	function test_stream_get_txt(t) {
		const x = t.startAsync();
		ios.get('http://localhost:3000/api', {payloadType: 'txt'}).pipe(
			collect(buffer => {
				const data = buffer.toString();
				eval(t.TEST('typeof data == "string"'));
				eval(t.TEST('data == "Hello, world!"'));
				x.done();
			})
		);
	},
	// function test_stream_get_xml (t) {
	// 	if (typeof DOMParser == 'undefined') return;
	// 	var x = t.startAsync();
	// 	io.get('http://localhost:3000/api', {payloadType: 'xml'}).then(function (data) {
	// 		eval(t.TEST('typeof data == "object"'));
	// 		eval(t.TEST('data.nodeName == "#document"'));
	// 		eval(t.TEST('data.nodeType == 9'));
	// 		return io.post('http://localhost:3000/api', data);
	// 	}).then(function (data) {
	// 		eval(t.TEST('isXml.test(data.headers["content-type"])'));
	// 		x.done();
	// 	});
	// },
	function test_stream_get_xml_as_text(t) {
		const x = t.startAsync();
		ios.get(
			{
				url: 'http://localhost:3000/api',
				mime: 'text/plain'
			},
			{payloadType: 'xml'}
		).pipe(
			collect(buffer => {
				const data = buffer.toString();
				eval(t.TEST('typeof data == "string"'));
				eval(t.TEST('data == "<div>Hello, world!</div>"'));
				x.done();
			})
		);
	},
	function test_stream_custom_headers(t) {
		const x = t.startAsync();
		const net = new ios.IO({
			url: 'http://localhost:3000/api',
			headers: {
				Accept: 'text/mod+plain',
				'Content-Type': 'text/plain'
			},
			method: 'POST',
			data: 'Some Text'
		});
		net.pipe(
			collectJson(data => {
				eval(t.TEST('data.method === "POST"'));
				eval(t.TEST('data.body === "Some Text"'));
				eval(t.TEST('data.headers["content-type"] === "text/plain"'));
				eval(t.TEST('data.headers["accept"] === "text/mod+plain"'));

				eval(t.TEST('net.meta.status == 200'));

				const headers = net.getHeaders();
				eval(t.TEST('isJson.test(headers["content-type"])'));

				x.done();
			})
		);
	}
]);
