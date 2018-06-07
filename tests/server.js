'use strict';

const http = require('http');
const path = require('path');
const url = require('url');

const debug = require('debug')('heya-io:server');
const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');

const bundler = require('heya-bundler');

const io = require('../main');

// The APP

const app = express();
// app.use(compression());
// app.use(bodyParser.raw({type: '*/*'}));

const compressionMiddleware = compression();
app.use((req, res, next) => {
	if (req.path === '/redirect') {
		return next();
	}
	return compressionMiddleware(req, res, next);
});

const bodyParserMiddleware = bodyParser.raw({type: '*/*'});
app.use((req, res, next) => {
	if (req.path === '/redirect') {
		return next();
	}
	return bodyParserMiddleware(req, res, next);
});

let counter = 0;

const alphabet = 'abcdefghijklmnopqrstuvwxyz';

app.get('/alpha', function(req, res) {
	var n;
	if (req.query.n) {
		n = +req.query.n;
		if (isNaN(n)) {
			n = 100;
		}
		n = Math.min(1000, Math.max(n, 1));
	}
	res.set('Content-Type', 'text/plain');
	for (var i = 0; i < n; ++i) {
		res.write(alphabet);
	}
	res.end();
});
app.post('/alpha', function(req, res) {
	var body = req.body.toString(),
		n = body.length,
		verified = true;
	for (var i = 0; i < n; i += 26) {
		if (body.substr(i, 26) !== alphabet) {
			verified = false;
			break;
		}
	}
	res.jsonp({n: n, verified: verified});
});

const doNotSet = {'content-encoding': 1, 'content-length': 1, etag: 1, connection: 1, 'transfer-encoding': 1}

app.all('/redirect', (req, res) => {
	const urlTo = new url.URL(req.query.to, 'http://localhost:3000/');
	io({
		method: req.method,
		url: urlTo.href,
		headers: req.headers,
		responseType: '$tream',
		returnXHR: true,
		query: {},
		data: req
	}).then(xhr => {
		res.status(xhr.status);
		const headers = io.getHeaders(xhr);
		Object.keys(headers).forEach(key => {
			const value = headers[key];
			if (value instanceof Array) {
				value.forEach(v => res.set(key, v));
			} else {
				!doNotSet[key] && res.set(key, value);
			}
		});
		xhr.response.pipe(res);
	}).catch(e => console.error(e));
});

app.all('/api', function(req, res) {
	if (req.query.status) {
		var status = parseInt(req.query.status, 10);
		if (isNaN(status) || status < 100 || status >= 600) {
			status = 200;
		}
		res.status(status);
	}
	switch (req.query.payloadType) {
		case 'txt':
			res.set('Content-Type', 'text/plain');
			res.send('Hello, world!');
			return;
		case 'xml':
			res.set('Content-Type', 'application/xml');
			res.send('<div>Hello, world!</div>');
			return;
	}
	var data = {
		method: req.method,
		protocol: req.protocol,
		hostname: req.hostname,
		url: req.url,
		originalUrl: req.originalUrl,
		headers: req.headers,
		body: (req.body && req.body.length && req.body.toString()) || null,
		query: req.query,
		now: Date.now(),
		counter: counter++
	};
	var timeout = 0;
	if (req.query.timeout) {
		var timeout = parseInt(req.query.timeout, 10);
		if (isNaN(timeout) || timeout < 0 || timeout > 60000) {
			timeout = 0;
		}
	}
	if (timeout) {
		setTimeout(function() {
			res.jsonp(data);
		}, timeout);
	} else {
		res.jsonp(data);
	}
});

app.put(
	'/bundle',
	bundler({
		isUrlAcceptable: isUrlAcceptable,
		resolveUrl: resolveUrl
	})
);

function isUrlAcceptable(uri) {
	return typeof uri == 'string' && !/^\/\//.test(uri) && (uri.charAt(0) === '/' || /^http:\/\/localhost:3000\//.test(uri));
}

function resolveUrl(uri) {
	return uri.charAt(0) === '/' ? 'http://localhost:3000' + uri : uri;
}

app.use(express.static(path.join(__dirname, '..')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers

app.use(function(err, req, res, next) {
	// for simplicity we don't use fancy HTML formatting opting for a plain text
	res.status(err.status || 500);
	res.set('Content-Type', 'text/plain');
	res.send('Error (' + err.status + '): ' + err.message + '\n' + err.stack);
	debug('Error: ' + err.message + ' (' + err.status + ')');
});

// The SERVER

/**
 * Get port from environment and store in Express.
 */

var host = process.env.HOST || 'localhost',
	port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on provided host, or all network interfaces.
 */

server.listen(port, host);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
	var port = parseInt(val, 10);

	if (isNaN(port)) {
		// named pipe
		return val;
	}

	if (port >= 0) {
		// port number
		return port;
	}

	return false;
}

/**
 * Human-readable port description.
 */

function portToString(port) {
	return typeof port === 'string' ? 'pipe ' + port : 'port ' + port;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
	if (error.syscall !== 'listen') {
		throw error;
	}

	var bind = portToString(port);

	// handle specific listen errors with friendly messages
	switch (error.code) {
		case 'EACCES':
			console.error('Error: ' + bind + ' requires elevated privileges');
			process.exit(1);
			break;
		case 'EADDRINUSE':
			console.error('Error: ' + bind + ' is already in use');
			process.exit(1);
			break;
		default:
			throw error;
	}
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
	//var addr = server.address();
	var bind = portToString(port);
	debug('Listening on ' + (host || 'all network interfaces') + ' ' + bind);
}
