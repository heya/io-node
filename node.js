'use strict';

var io = require('heya-io/io');
var FauxXHR = require('heya-io/FauxXHR');

var request = require('request');


// node() handler based on request
// This is a Node-only module.

function requestAsync () {
	var args = Array.prototype.slice.call(arguments, 0);
	return new Promise(function(resolve, reject){
		args.push(function (error) {
			if (error) {
				reject(error);
			} else {
				resolve(Array.prototype.slice.call(arguments, 1));
			}
		});
		try {
			request.apply(null, args);
		} catch (e) {
			reject(e);
		}
	});
}
requestAsync.original = request;

function makeHeaders (rawHeaders, mime) {
	if (mime) {
		rawHeaders = rawHeaders.filter(function (value, index, array) {
			return array[index >> 1 << 1].toLowerCase() != 'content-type';
		});
		rawHeaders.push('Content-Type', mime);
	}
	return rawHeaders.reduce(function (acc, value, index) {
		return acc + (index % 2 ? ': ' : (index ? '\r\n' : '')) + value;
	}, '');
}

var isJson = /^application\/json\b/;

function requestTransport (options, prep) {
	var req = {
			url: prep.url,
			method: options.method,
			headers: options.headers ? Object.create(options.headers) : {}
		};
	if (options.timeout) req.timeout = options.timeout;
	req.body = io.processData({setRequestHeader: function (key, value) {
		req.headers[key] = value;
	}}, options, prep.data);
	if (req.body && typeof req.body == 'object') {
		var bodyProcessors = io.node.bodyProcessors;
		for (var i = 0; i < bodyProcessors.length; i += 2) {
			if(req.body instanceof bodyProcessors[i]) {
				bodyProcessors[i + 1](req, options, prep);
				break;
			}
		}
	}
	// console.log('REQ', req);
	return requestAsync(io.node.inspectRequest(req)).then(function (response) {
		var head  = response[0];
		return io.node.inspectResult(new io.Result(new FauxXHR({
			status: head.statusCode,
			statusText: head.statusMessage,
			headers: makeHeaders(head.rawHeaders, options.mime),
			responseType: options.responseType || '',
			responseText: response[1].toString()
		}), options));
	});
}

function identity (x) { return x; }

io.node = {
	attach: attach,
	detach: detach,
	inspectRequest: identity,
	inspectResult:  identity,
	bodyProcessors: []
};

var oldTransport;

function attach () {
	if (io.defaultTransport !== requestTransport) {
		oldTransport = io.defaultTransport;
		io.defaultTransport = requestTransport;
		return true;
	}
	return false;
}

function detach () {
	if (oldTransport && io.defaultTransport === requestTransport) {
		io.defaultTransport = oldTransport;
		oldTransport = null;
		return true;
	}
	return false;
}

module.exports = io;
