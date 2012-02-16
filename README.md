# ndir

[![Build Status](https://secure.travis-ci.org/fengmk2/ndir.png)](http://travis-ci.org/fengmk2/ndir)

The lost dir util tools. Handle dir and file in Event.

## Install

```
$ npm install ndir
```

require `ndir`

```
var ndir = require('ndir');
```

## Walk dir: ndir.walk()

callback mode:

```
ndir.walk('./', function onDir(dirpath, files) {
  console.log(' * %s', dirpath);
  for (var i = 0, l = files.length; i < l; i++) {
    var info = files[i];
    if (info[1].isFile()) {
      console.log('   * %s', info[0]);
    }
  }
}, function end() {
  console.log('walk end.');
}, function error(err, errPath) {
  console.error('%s error: %s', errPath, err);
});
```

event mode:

```
var walker = ndir.walk('./');
walker.on('dir', function(dirpath, files) {
  console.log(' * %s', dirpath);
  for (var i = 0, l = files.length; i < l; i++) {
    var info = files[i];
    if (info[1].isFile()) {
      console.log('   * %s', info[0]);
    }
  }
});
walker.on('error', function(err, errPath) {
  console.error('%s error: %s', errPath, err);
});
walker.on('end', function() {
  console.log('walk end.');
});
```

## Copy file: ndir.copyfile()

Copy file, auto create target file parent dir if it not exists.

```
ndir.copyfile(fromfile, tofile, function(err) {
  if (err) {
    throw err;
  }
  consle.log('copy file success.');
});
```

## Make dir: ndir.mkdir()

Make dir, equal `$ mkdir -p dirname` .

```
ndir.mkdir(dirname, function(err) {
  if (err) {
    throw err;
  }
  consle.log('mkdir success.');
});
```

## Read a file line by line

If you want to read a file line by line, `ndir.LineReader` will help you easy way to do that.

```
var ndir = require('ndir');
var assert = require('assert');

var lineNumber = 0;
ndir.createLineReader('./test/access.log').on('line', function(line) {
  assert.ok(Buffer.isBuffer(line));
  console.log('%d: %s', ++lineNumber, line.toString());
}).on('end', function() {
  console.log('read a file done.')
}).on('error', function(err) {
  console.log('error: ', err.message)
});
```

## Viewing Examples

First install the dev dependencies to install all the example / test suite deps:

```
$ npm install -d
```

then run whichever tests you want:

```
$ node example/listdir.js example
```

## Running Tests

To run the test suite first invoke the following command within the repo, installing the development dependencies:

```
$ npm install
```

then run the tests:

```
$ make test
```

## License 

(The MIT License)

Copyright (c) 2011-2012 fengmk2 &lt;fengmk2@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
