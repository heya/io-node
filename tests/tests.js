'use strict';

require('./test-io');
require('./test-bust');
require('./test-track');
require('./test-mock');
require('./test-url');
require('./test-compression');
require('./test-node');
require('./test-stream');

var unit = require('heya-unit');

unit.run();
