'use strict';

const {Readable} = require('stream');
const {IncomingMessage} = require('http');

const io = require('./node');

// replace errors
class FailedIO extends Error {
	constructor(xhr, options, event, message = 'Failed I/O') {
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
		this.xhr = xhr;
		this.options = options;
		this.event = event;
	}
	getData() {
		return io.getData(this.xhr);
	}
	getHeaders() {
		return io.getHeaders(this.xhr);
	}
}
io.FailedIO = FailedIO;
class TimedOut extends FailedIO {
	constructor(xhr, options, event) {
		super(xhr, options, event, 'Timed out I/O');
	}
}
io.TimedOut = TimedOut;
class BadStatus extends FailedIO {
	constructor(xhr, options, event) {
		super(xhr, options, event, 'Bad status I/O' + (xhr && xhr.status ? ': ' + xhr.status : ''));
	}
}
io.BadStatus = BadStatus;

io.node.attach();

const passThrough = (_1, _2, data) => new io.Ignore(data);

io.dataProcessors.push(Readable, passThrough, Buffer, passThrough, IncomingMessage, passThrough);

module.exports = io;
