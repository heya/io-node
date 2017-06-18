# `io-node`

[![Build status][travis-image]][travis-url]
[![Dependencies][deps-image]][deps-url]
[![devDependencies][dev-deps-image]][dev-deps-url]
[![NPM version][npm-image]][npm-url]

This is a Node-specific transport for [heya-io](https://github.com/heya/io) based on venerable [request](https://www.npmjs.com/package/request), and an adapter, which sets things right to work on Node. The main purpose of the module is to provide a robust foundation to run `heya-io`-based unit tests on Node, and to write an isomorphic JavaScript code. But it can be used to simplify I/O on Node, and to use enhanced features of `heya-io` in the server environment.

Presently following `heya-io` services are supported as is:

* `io.track` &mdash; a simple plugin to track I/O requests to eliminate duplicates, register an interest without initiating I/O requests, and much more.
* `io.mock` &mdash; a way to mock I/O requests without writing a special server courtesy of [Mike Wilcox](https://github.com/clubajax). Very useful for rapid prototyping and writing tests.
* `io.bust` &mdash; a simple plugin to generate a randomized query value to bust cache.

# Examples

Plain vanilla GET:

```js
var io = require('heya-io-node');

io.get('http://example.com/hello').then(function (value) {
  console.log(value);
});

io.get('/hello', {to: 'world', times: 5}).then(function (value) {
  // GET /hello?to=world&times=5
  console.log(value);
});
```

Some other verbs ([REST](https://en.wikipedia.org/wiki/Representational_state_transfer) example):

```js
function done() { console.log('done'); }

io.post('/things', {name: 'Bob', age: 42}).then(done);
io.put('/things/5', {name: 'Alice', age: 33}).then(done);
io.patch('/things/7', {age: 14}).then(done);
io.remove('/things/3').then(done);
```

Mock:

```js
// set up a mock handler
io.mock('/a*', function (options, prep) {
  console.log('Got call: ' + options.method + ' ' + prep.url);
  return 42;
});

// let's make a call
io.get('/a/x').then(function (value) {
  console.log(value); // 42
});

// set up a redirect /b => /a/b
io.mock('/b', function (options) {
  return heya.io.get('/a/b', options.query || options.data || null);
});

// let's make another call
io.get('/b', {q: 1}).then(function (value) {
  console.log(value); // 42
});
```

Using `url` template to sanitize URLs (ES6):

```js
const url = require('heya-io/url');

const client = 'Bob & Jordan & Co';
io.get(url`/api/${client}/details`).then(function (value) {
  // GET /api/Bob%20%26%20Jordan%20%26%20Co/details
  console.log(value);
});
```

See more examples in [heya-io's Wiki](https://github.com/heya/io/wiki/) and the cookbooks of `heya-io`:

* [Cookbook: main](https://github.com/heya/io/wiki/Cookbook:-main)
* Services:
  * [Cookbook: mock](https://github.com/heya/io/wiki/Cookbook:-mock)
  * [Cookbook: track](https://github.com/heya/io/wiki/Cookbook:-track)

# How to install

```txt
npm install --save heya-io-node
```

```txt
yarn add heya-io-node
```

# Documentation

All documentation can be found in [project's wiki](https://github.com/heya/io-node/wiki).

# Versions

- 1.0.0 &mdash; *The initial release.*

# License

BSD or AFL &mdash; your choice.


[npm-image]:      https://img.shields.io/npm/v/heya-io-node.svg
[npm-url]:        https://npmjs.org/package/heya-io-node
[deps-image]:     https://img.shields.io/david/heya/io-node.svg
[deps-url]:       https://david-dm.org/heya/io-node
[dev-deps-image]: https://img.shields.io/david/dev/heya/io-node.svg
[dev-deps-url]:   https://david-dm.org/heya/io-node?type=dev
[travis-image]:   https://img.shields.io/travis/heya/io-node.svg
[travis-url]:     https://travis-ci.org/heya/io-node
