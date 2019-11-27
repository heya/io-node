# `io-node`


[![Build status][travis-image]][travis-url]
[![NPM version][npm-image]][npm-url]

[![Greenkeeper][greenkeeper-image]][greenkeeper-url]
[![Dependencies][deps-image]][deps-url]
[![devDependencies][dev-deps-image]][dev-deps-url]

This is a Node-specific transport for [heya-io](https://github.com/heya/io) based on built-in `http` and `https` modules. The main purpose of the module is to provide an ergonomic simple light-weight HTTP I/O on Node leveraging existing customization facilities of `heya-io` where appropriate.

Following `heya-io` services are supported as is out of the box:

* `io.track` &mdash; tracks I/O requests to eliminate duplicates, register an interest without initiating I/O requests, and much more.
* `io.mock` &mdash; mocks responses to I/O requests without writing a special server courtesy of [Mike Wilcox](https://github.com/clubajax). Very useful for rapid prototyping and writing tests.
* `io.bust` &mdash; a simple pseudo plugin to generate a randomized query value to bust cache.
* `io.retry` &mdash; a flexible way to retry requests, e.g., to deal with unreliable servers or to watch for changing values.

Additionally it supports:

* Completely transparent compression/decompression.
  * `gzip` and `deflate` are supported out of the box with no extra dependencies using built-in modules.
  * More compressions, like [brotli](https://en.wikipedia.org/wiki/Brotli) can be easily plugged in.
    * `brotli` is automatically supported if an underlying Node has it.
  * The compression is supported **both ways**.
* Streaming.
  * Both streaming a server request and a server response are supported.

# Examples

Plain vanilla GET:

```js
const io = require('heya-io-node');

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

Streaming (since 1.1.0):

```js
const ios = require('heya-io-node/stream');
fs.createReadStream('sample.json')
  .pipe(ios.post({
    url: 'https://example.com/analyze',
    headers: {
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip',
      'Accept: plain/text'
    }
  }))
  .pipe(process.stdout);

// or it can be done more granularly:

io.post({
  url: 'https://example.com/analyze',
  headers: {
    'Content-Type': 'application/json',
    'Content-Encoding': 'gzip',
    'Accept: plain/text'
  },
  responseType: '$tream'
}, fs.createReadStream('sample.json'))
  .then(res => res.pipe(process.stdout));
```

Mock in action:

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
  return io.get('/a/b', options.query || options.data || null);
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

See more examples in [heya-io's Wiki](https://github.com/heya/io/wiki/), [heya-io-node's Wiki](https://github.com/heya/io-node/wiki/), and the cookbooks of `heya-io`:

* [Cookbook: main](https://github.com/heya/io/wiki/Cookbook:-main)
* Services:
  * [Cookbook: mock](https://github.com/heya/io/wiki/Cookbook:-mock)
  * [Cookbook: track](https://github.com/heya/io/wiki/Cookbook:-track)

# How to install

```bash
npm install --save heya-io-node
# or: yarn add heya-io-node
```

# Documentation

All documentation can be found in [project's wiki](https://github.com/heya/io-node/wiki).

# Working on this project

In order to run tests locally, you should start the test server first:

```bash
npm start
```

Then (likely in a different command line window) run tests:

```bash
npm test
```

The server runs indefinitely, and can be stopped by Ctrl+C.

# Versions

- 1.1.6 &mdash; *Technical release: added Greenkeeper and removed `yarn.lock`.*
- 1.1.5 &mdash; *Updated dependencies and added a test suite for `io.retry`.*
- 1.1.4 &mdash; *Updated dependencies.*
- 1.1.3 &mdash; *Added experimental `IncomeMessage` support.*
- 1.1.2 &mdash; *Exposed `getData()` and `getHeaders()` on stream and error objects.*
- 1.1.1 &mdash; *Added support for `Buffer`, replaced failure objects with `Error`-based objects.*
- 1.1.0 &mdash; *Getting rid of `request`, use native `http`/`https`, support compression and streaming.*
- 1.0.3 &mdash; *Bugfix: custom headers. Thx [Bryan Pease](https://github.com/Akeron972)!*
- 1.0.2 &mdash; *Added custom body processors.*
- 1.0.1 &mdash; *New dependencies.*
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
[greenkeeper-image]: https://badges.greenkeeper.io/heya/io.svg
[greenkeeper-url]:   https://greenkeeper.io/
