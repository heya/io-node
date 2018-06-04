'use strict';

const url = require('url');
const http = require('http');
const https = require('https');
const zlib = require('zlib');

const io = require('heya-io/io');
const FauxXHR = require('heya-io/FauxXHR');

// This is a Node-only module.

const makeHeaders = (rawHeaders, mime) => {
	if (mime) {
		rawHeaders = rawHeaders.filter((_, index, array) => array[index >> 1 << 1].toLowerCase() != 'content-type');
		rawHeaders.push('Content-Type', mime);
	}
	return rawHeaders.reduce((acc, value, index) => acc + (index % 2 ? ': ' : (index ? '\r\n' : '')) + value, '');
}

const returnDataStream = res => {
	const encoding = res.headers['content-encoding'] || res.headers['Content-Encoding'];
	const decompressor = encoding && io.node.decompressors[encoding];
	return decompressor ? res.pipe(decompressor.stream()) : res;
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
	const decompressorOptions = Object.keys(io.node.decompressors).sort((a, b) => io.node.decompressors[a].priority - io.node.decompressors[b].priority);
	if (decompressorOptions.length) {
		newOptions.headers['Accept-Encoding'] = decompressorOptions.join(', ');
	}

	// prepare body
	newOptions.body = io.processData({setRequestHeader: function (key, value) {
		newOptions.headers[key] = value;
	}}, options, prep.data);
	if (newOptions.body && typeof newOptions.body == 'object') {
		const bodyProcessors = io.node.bodyProcessors;
		for (let i = 0; i < bodyProcessors.length; i += 2) {
			if(newOptions.body instanceof bodyProcessors[i]) {
				bodyProcessors[i + 1](newOptions, options, prep);
				break;
			}
		}
	}

	return new Promise((resolve, reject) => {
		const options = io.node.inspectRequest(newOptions);
		const proto = options.protocol && options.protocol.toLowerCase() === 'https:' ? https : http;
		const req = proto.request(options, res => resolve(res));
		req.on('error', e => reject(e));
		req.end(options.body);
	}).then(res => {
		if (options.responseType === '$tream') {
			const xhr = new FauxXHR({
				status: res.statusCode,
				statusText: res.statusMessage,
				headers: makeHeaders(res.rawHeaders, options.mime),
				responseType: options.responseType || '',
				responseText: ''
			});
			xhr.response = returnDataStream(res);
			return xhr;
		}
		return new Promise(resolve => {
			const dataStream = returnDataStream(res);
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
	}).then(xhr => io.node.inspectResult(new io.Result(xhr, options)));
}

let oldTransport;

const attach = () => {
	if (io.defaultTransport !== requestTransport) {
		oldTransport = io.defaultTransport;
		io.defaultTransport = requestTransport;
		return true;
	}
	return false;
}

const detach = () => {
	if (oldTransport && io.defaultTransport === requestTransport) {
		io.defaultTransport = oldTransport;
		oldTransport = null;
		return true;
	}
	return false;
}

const identity = x => x;

io.node = {
	attach: attach,
	detach: detach,
	inspectRequest: identity,
	inspectResult:  identity,
	bodyProcessors: [],
	decompressors: {
		gzip:    {priority: 10, stream: () => zlib.createGunzip()},
		deflate: {priority: 20, stream: () => zlib.createInflate()}
	}
};

module.exports = io;
