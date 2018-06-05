'use strict';

const url = require('url');
const http = require('http');
const https = require('https');
const zlib = require('zlib');
const {Readable} = require('stream');

const io = require('heya-io/io');
const FauxXHR = require('heya-io/FauxXHR');

// This is a Node-only module.

const makeHeaders = (rawHeaders, mime) => {
	if (mime) {
		rawHeaders = rawHeaders.filter((_, index, array) => array[(index >> 1) << 1].toLowerCase() != 'content-type');
		rawHeaders.push('Content-Type', mime);
	}
	return rawHeaders.reduce((acc, value, index) => acc + (index % 2 ? ': ' : index ? '\r\n' : '') + value, '');
};

const returnOutputStream = (res, options) => {
	const encoding = res.headers['content-encoding'];
	const decoder =
		encoding &&
		io.node.encoders[encoding] &&
		io.node.encoders[encoding].decode &&
		io.node.encoders[encoding].decode(options);
	return decoder ? res.pipe(decoder) : res;
};

const returnInputStream = (req, options) => {
	let encoding = req.getHeader('content-encoding');
	if (!encoding) {
		encoding = io.node.preferredEncoding;
		req.setHeader('content-encoding', encoding);
	}
	const encoder =
		encoding &&
		io.node.encoders[encoding] &&
		io.node.encoders[encoding].encode &&
		io.node.encoders[encoding].encode(options);
	const stream = encoder ? (encoder.pipe(req), encoder) : req;
	if (stream === req) req.removeHeader('content-encoding');
	return stream;
};

const isJson = /^application\/json\b/;

const requestTransport = (options, prep) => {
	// create request options
	const urlObject = url.parse(prep.url);
	const newOptions = {
		url: prep.url,
		protocol: urlObject.protocol,
		hostname: urlObject.hostname,
		port: urlObject.port,
		path: urlObject.path,
		method: options.method,
		headers: Object.assign({}, options.headers)
	};
	if (urlObject.username) {
		newOptions.auth = urlObject.username;
		if (urlObject.password) {
			newOptions.auth += ':' + urlObject.password;
		}
	}
	if (options.timeout) newOptions.timeout = options.timeout;

	// create Accept-Encoding
	delete newOptions.headers['Accept-Encoding'];
	delete newOptions.headers['accept-encoding'];
	if (io.node.acceptedEncoding) {
		newOptions.headers['Accept-Encoding'] = io.node.acceptedEncoding;
	}

	// prepare body
	newOptions.body = io.processData(
		{
			setRequestHeader(key, value) {
				newOptions.headers[key] = value;
			}
		},
		options,
		prep.data
	);

	return new Promise((resolve, reject) => {
		const options = io.node.inspectRequest(newOptions);
		const proto = options.protocol && options.protocol.toLowerCase() === 'https:' ? https : http;
		const req = proto.request(options, res => resolve(res));
		req.on('error', e => reject(e));
		if (options.body instanceof Readable) {
			const stream =
				req.getHeader('content-type') && req.getHeader('content-encoding')
					? returnInputStream(req, options)
					: req;
			options.body.pipe(stream);
		} else {
			const stream =
				options.body &&
				req.getHeader('content-type') &&
				((io.node.encodingThreshold && options.body.length > io.node.encodingThreshold) ||
					req.getHeader('content-encoding'))
					? returnInputStream(req, options)
					: req;
			stream.end(options.body);
		}
	})
		.then(res => {
			if (options.responseType === '$tream') {
				const xhr = new FauxXHR({
					status: res.statusCode,
					statusText: res.statusMessage,
					headers: makeHeaders(res.rawHeaders, options.mime),
					responseType: options.responseType || '',
					responseText: ''
				});
				xhr.response = returnOutputStream(res, options);
				return xhr;
			}
			return new Promise(resolve => {
				const dataStream = returnOutputStream(res, options);
				let buffer = null;
				dataStream.on('data', chunk => (buffer === null ? (buffer = chunk) : (buffer += chunk)));
				dataStream.on('end', () => resolve(buffer));
			}).then(buffer => {
				return new FauxXHR({
					status: res.statusCode,
					statusText: res.statusMessage,
					headers: makeHeaders(res.rawHeaders, options.mime),
					responseType: options.responseType || '',
					responseText: buffer ? buffer.toString() : ''
				});
			});
		})
		.then(xhr => io.node.inspectResult(new io.Result(xhr, options)));
};

let oldTransport;

const attach = () => {
	if (io.defaultTransport !== requestTransport) {
		oldTransport = io.defaultTransport;
		io.defaultTransport = requestTransport;
		return true;
	}
	return false;
};

const detach = () => {
	if (oldTransport && io.defaultTransport === requestTransport) {
		io.defaultTransport = oldTransport;
		oldTransport = null;
		return true;
	}
	return false;
};

const identity = x => x;

const updateEncodingSettings = () => {
	const encoders = io.node.encoders,
		keys = Object.keys(encoders);
	io.node.acceptedEncoding = keys
		.filter(key => encoders[key].decode)
		.sort((a, b) => encoders[a].priority - encoders[b].priority)
		.join(', ');
	io.node.preferredEncoding = keys
		.filter(key => encoders[key].encode)
		.reduce((last, key) => (!last ? key : encoders[last].priority < encoders[key].priority ? last : key));
};

const addEncoder = (key, object) => {
	io.node.encoders[key] = object;
	updateEncodingSettings();
};

const removeEncoder = key => {
	delete io.node.encoders[key];
	updateEncodingSettings();
};

io.node = {
	attach: attach,
	detach: detach,
	inspectRequest: identity,
	inspectResult: identity,
	encodingThreshold: 0,
	encoders: {
		gzip: {
			priority: 10,
			encode: options => zlib.createGzip(options && options.compressor),
			decode: options => zlib.createGunzip(options && options.decompressor)
		},
		deflate: {
			priority: 20,
			encode: options => zlib.createDeflate(options && options.compressor),
			decode: options => zlib.createInflate(options && options.decompressor)
		}
	},
	preferredEncoding: '',
	acceptedEncoding: '',
	addEncoder: addEncoder,
	removeEncoder: removeEncoder
};

updateEncodingSettings();

module.exports = io;
