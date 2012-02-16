/*!
 * ndir - lib/ndir.js
 * Copyright(c) 2012 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

 var fs = require('fs');
 var path = require('path');
 var util = require('util');
 var EventEmitter = require('events').EventEmitter;

/**
 * Walking dir base on `Event`.
 * 
 * @param  {String} dir     Start walking path.
 * @param  {Function(dir)} [onDir]   When a dir walk through, `emit('dir', dirpath, files)`.
 * @param  {Function} [onEnd]   When a dir walk over, `emit('end')`.
 * @param  {Function(err)} [onError] When stat a path error, `emit('error', err, path)`.
 * @return {Walk} dir walker instance.
 * @public
 */
exports.walk = function walk(dir, onDir, onEnd, onError) {
  return new Walk(dir, onDir, onEnd, onError);
};

/**
 * dir Walker Class.
 * 
 * @constructor
 * @param {String} root    Root path.
 * @param {Function(dirpath, files)} [onDir]   The `dir` event callback.
 * @param {Function} [onEnd]   The `end` event callback.
 * @param {Function(err)} [onError] The `error` event callback.
 * @public
 */
function Walk(root, onDir, onEnd, onError) {
  if (!(this instanceof Walk)) {
    return new Walk(root, onDir, onEnd, onError);
  }
  this.dirs = [path.resolve(root)];
  onDir && this.on('dir', onDir);
  onEnd && this.on('end', onEnd);
  onError && this.on('error', onError);
  var self = this;
  // let listen `files` Event first.
  process.nextTick(function() {
    self.next();
  });
};
util.inherits(Walk, EventEmitter);

exports.Walk = Walk;

/**
 * Next move, if move to the end, 
 * will `emit('end')` event.
 * 
 * @private
 */
Walk.prototype.next = function() {
  var dir = this.dirs.shift();
  if (!dir) {
    return this.emit('end');
  }
  this._dir(dir);
};

/**
 * @private
 */
Walk.prototype._dir = function(dir) {
  var self = this;
  fs.readdir(dir, function(err, files) {
    if (err) {
      self.emit('error', err, dir);
      return self.next();
    }
    var infos = [];
    if (files.length === 0) {
      self.emit('dir', dir, infos);
      return self.next();
    }
    var counter = 0;
    files.forEach(function(file) {
      var p = path.join(dir, file);
      fs.lstat(p, function(err, stats) {
        if (err) {
          self.emit('error', err, p);
        } else {
          infos.push([p, stats]);
          if (stats.isDirectory()) {
            self.dirs.push(p);
          }
        }
        if (++counter === files.length) {
          self.emit('dir', dir, infos);
          self.next();
        }
      });
    });
  });
};

/**
 * Copy file, auto create tofile dir if dir not exists.
 * 
 * @param  {String}   fromfile Source file path.
 * @param  {String}   tofile   Target file path.
 * @param  {Function(err)} callback
 * @public
 */
exports.copyfile = function copyfile(fromfile, tofile, callback) {
  fromfile = path.resolve(fromfile);
  tofile = path.resolve(tofile);
  if (fromfile === tofile) {
    var msg = 'cp: "' + fromfile + '" and "' + tofile + '" are identical (not copied).';
    return callback(new Error(msg));
  }
  exports.mkdir(path.dirname(tofile), function(err) {
    if (err) {
      return callback(err);
    }
    var ws = fs.createWriteStream(tofile);
    var rs = fs.createReadStream(fromfile);
    var error = null;
    var onerr = function(err) {
      var cb = callback;
      callback = null;
      cb(err);
    };
    ws.on('error', onerr); // if file not open, these is only error event will be emit.
    rs.on('error', onerr);
    ws.on('close', function() {
      // after file open, error event could be fire close event before.
      callback && callback();
    });
    rs.pipe(ws);
  });
};

/**
 * @private
 */
function _mkdir(dir, callback) {
  path.exists(dir, function(exists) {
    if (exists) {
      return callback();
    }
    fs.mkdir(dir, callback);
  });
};

/**
 * mkdir if dir not exists, equal mkdir -p /path/foo/bar
 *
 * @param {String} dir
 * @param {Function(err)} callback
 * @public
 */
exports.mkdir = function mkdir(dir, callback) {
  var parent = path.dirname(dir);
  path.exists(parent, function(exists) {
    if (exists) {
      return _mkdir(dir, callback);
    }
    exports.mkdir(parent, function(err) {
      if (err) {
        return callback(err);
      }
      _mkdir(dir, callback);
    });
  });
};

/**
 * Line data reader
 * 
 * @example
 * var ndir = require('ndir');
 * ndir.createLineReader('/tmp/access.log')
 *   .on('line', function(line) { console.log(line.toString()); })
 *   .on('end', function() {})
 *   .on('error', function(err) { console.error(err); });
 *   
 * @param {String|ReadStream} file, file path or a `ReadStream` object.
 */
exports.createLineReader = function(file) {
  return new LineReader(file);
};

/**
 * Read stream data line by line.
 * 
 * @constructor
 * @param {String|ReadStream} file File path or data stream object.
 */
function LineReader(file) {
  if (typeof file === 'string') {
    this.readstream = fs.createReadStream(file);
  } else {
    this.readstream = file;
  }
  this.remainBuffers = [];
  var self = this;
  this.readstream.on('data', function(data) {
    self.ondata(data);
  });
  this.readstream.on('error', function(err) {
    self.emit('error', err);
  });
  this.readstream.on('end', function() {
    self.emit('end');
  });
}
util.inherits(LineReader, EventEmitter);

/**
 * `Stream` data event handler.
 * 
 * @param  {Buffer} data
 * @private
 */
LineReader.prototype.ondata = function(data) {
  var i = 0;
  var found = false;
  for (var l = data.length; i < l; i++) {
    if (data[i] === 10) {
      found = true;
      break;
    }
  }
  if (!found) {
    this.remainBuffers.push(data);
    return;
  }
  var line = null;
  if (this.remainBuffers.length > 0) {
    var size = i;
    for (var j = 0, jl = this.remainBuffers.length; j < jl; j++) {
      size += this.remainBuffers[j].length;
    }
    line = new Buffer(size);
    var pos = 0;
    for (var j = 0, jl = this.remainBuffers.length; j < jl; j++) {
      var buf = this.remainBuffers[j];
      buf.copy(line, pos);
      pos += buf.length;
    }
    // check if `\n` is the first char in `data`
    if (i > 0) {
      data.copy(line, pos, 0, i);
    }
    this.remainBuffers = [];
  } else {
    line = data.slice(0, i);
  }
  this.emit('line', line);
  this.ondata(data.slice(i + 1));
};