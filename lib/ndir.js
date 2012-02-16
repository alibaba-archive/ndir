/**
 * Module dependencies.
 */

 var fs = require('fs');
 var path = require('path');
 var util = require('util');
 var EventEmitter = require('events').EventEmitter;

/**
 * walk dir base on Event
 *
 *  - `dir` Event: when a dir walk through, emit('dir', dirpath, files)
 *  - `end` Event: when a dir walk over, emit('end')
 *  - `error` Event: when stat a path error, emit('error', err, path)
 */

exports.walk = function walk(dir, onDir, onEnd, onError) {
  return new Walk(dir, onDir, onEnd, onError);
};

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

Walk.prototype.next = function() {
  var dir = this.dirs.shift();
  if (!dir) {
    return this.emit('end');
  }
  this._dir(dir);
};

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
 * @param {Function} callback
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
 *   ndir.createLineReader('/tmp/access.log')
 *   .on('line', function(line) { console.log(line.toString()); })
 *   .on('end', function() {})
 *   .on('error', function(err) { console.error(err); });
 *
 * @param {String|ReadStream} file, file path or a `ReadStream` object.
 */

exports.createLineReader = function(file) {
  return new LineReader(file);
};

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