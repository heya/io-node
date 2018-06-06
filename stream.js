'use strict';

const {Duplex, PassThrough} = require('stream');

const io = require('./main');

const requestHasNoBody = {GET: 1, HEAD: 1, OPTIONS: 1, DELETE: 1},
	responseHasNoBody = {HEAD: 1, OPTIONS: 1};

class IO extends Duplex {
	constructor(options, streamOptions) {
		super(streamOptions);
		this.meta = null;

		if (typeof options == 'string') {
			options = {url: options, method: 'GET'};
		} else {
			options = Object.create(options);
			options.method = (options.method && options.method.toUpperCase()) || 'GET';
		}
		options.responseType = '$tream';
		options.returnXHR = true;

		if (requestHasNoBody[options.method] === 1 || 'data' in options) {
			this._write = (_1, _2, callback) => callback(null);
			// this._final = callback => callback(null); // unavailable in Node 6
		} else {
			this.input = options.data = new PassThrough();
			this.on('finish', () => this.input.end(null, null)); // for Node 6
		}

		io(options)
			.then(xhr => {
				this.meta = xhr;
				this.output = xhr.response;
				this.output.on('data', chunk => !this.push(chunk) && this.output.pause());
				this.output.on('end', () => this.push(null));
				if (responseHasNoBody[options.method] === 1) {
					this.resume();
				}
			})
			.catch(e => this.emit('error', e));
	}
	_write(chunk, encoding, callback) {
		let error = null;
		try {
			this.input.write(chunk, encoding, e => callback(e || error));
		} catch (e) {
			error = e;
		}
	}
	// _final(callback) { // unavailable in Node 6
	// 	let error = null;
	// 	try {
	// 		this.input.end(null, null, e => callback(e || error));
	// 	} catch (e) {
	// 		error = e;
	// 	}
	// }
	_read() {
		this.output && this.output.resume();
	}
}

const mod = {IO: IO};

const makeVerb = verb => (url, data) => {
	const options = typeof url == 'string' ? {url: url} : Object.create(url);
	options.method = verb;
	if (data) {
		options.data = data;
	}
	return new IO(options);
};

['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].forEach(verb => {
	mod[verb.toLowerCase()] = makeVerb(verb);
});
mod.del = mod.remove = mod['delete']; // alias for simplicity

module.exports = mod;
