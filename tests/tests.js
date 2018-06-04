'use strict';

require('./test-io');
require('./test-bust');
require('./test-track');
require('./test-mock');
require('./test-url');
require('./test-io-form');
require('./test-compression');

var unit = require('heya-unit');

unit.run();
