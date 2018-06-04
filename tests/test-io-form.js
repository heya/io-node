'use strict';

var unit = require('heya-unit');
var io   = require('../main');


function FormData (data) { this.data = data; }


var isMultiPart = /^multipart\/form-data\b/;

unit.add(module, [
	function test_setup () {
		io.node.bodyProcessors.push(FormData, function (req) {
			req.formData = req.body.data;
			delete req.body;
		});
	},
	function test_io_post_formdata (t) {
		var x = t.startAsync();
		var data = new FormData({
				user: 'heh!',
				buffer: Buffer.alloc(10)
			});
		io.post({
			url: 'http://localhost:3000/api',
			headers: {
				'Content-Type': 'multipart/form-data'
			}
		}, data).then(function (data) {
			eval(t.TEST('isMultiPart.test(data.headers["content-type"])'));
			x.done();
		});
	},
	function test_teardown () {
		io.node.bodyProcessors.pop();
		io.node.bodyProcessors.pop();
	}
]);
