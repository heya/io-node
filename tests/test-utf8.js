'use strict';

const unit = require('heya-unit');
const io = require('../main');

unit.add(module, [
  function test_utf8(t) {
    const x = t.startAsync();
    const pattern = '一鸟在手胜过双鸟在林。',
      repeat = 100000;
    io({
      url: 'http://localhost:3000/api',
      query: {pattern, repeat}
    }).then(function (data) {
      eval(t.TEST('data.length === pattern.length * repeat'));
      x.done();
    });
  }
]);
