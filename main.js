'use strict';

const {Readable} = require('stream');

const io = require('./node');

io.node.attach();

const passThrough = (_1, _2, data) => new io.Ignore(data);

io.dataProcessors.push(Readable, passThrough, Buffer, passThrough);

module.exports = io;
