'use strict';

const {Readable} = require('stream');

const io = require('./node');

io.node.attach();

io.dataProcessors.push(Readable, (_1, _2, data) => new io.Ignore(data));

module.exports = io;
