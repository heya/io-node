'use strict';

// This module tests only `url` module of `heya-io`.
// It is there because Node's environment guarantees ES6 features
// required to test tagged template literals.

var unit = require('heya-unit');

const url = require('heya-io/url');


unit.add(module, [
	function test_url (t) {
		eval(t.TEST('typeof url == "function"'));
		eval(t.TEST('url`/api/22?q=1` === "/api/22?q=1"'));

		const id = 22, q = 1;
		eval(t.TEST('url`/api/${id}?q=${q}` === "/api/22?q=1"'));

		const client = 'Bob & Jordan & Co';
		eval(t.TEST('url`/api/${client}/details` === "/api/Bob%20%26%20Jordan%20%26%20Co/details"'));
	}
]);
