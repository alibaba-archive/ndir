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
  this.dirs = [root];
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
      return this.emit('error', err, dir);
    }
    var infos = {};
    if (files.length === 0) {
      self.emit('dir', dir, infos, files.length);
      return self.next();
    }
    var counter = 0;
    files.forEach(function(file) {
      var p = path.join(dir, file);
      fs.stat(p, function(err, stats) {
        if (err) {
          self.emit('error', err, p);
        } else {
          infos[p] = stats;
          if (stats.isDirectory()) {
            self.dirs.push(p);
          }
        }
        if (++counter === files.length) {
          self.emit('dir', dir, infos, counter);
          self.next();
        }
      });
    });
  });
};

/**
 * Copy file, support confirm onConfirm(exists, confirmCallback)
 */

exports.copyfile = function copyfile(from, to, onConfirm, onDone) {
  path.exists(to, function(exists) {
    onConfirm(exists, function(confirm) {
      if (!confirm) {
        return onDone();
      }
      exports.mkdir(path.dirname(to), function(err) {
        if (err) {
          return onDone(err);
        }
        var ws = fs.createWriteStream(to);
        var rs = fs.createReadStream(from);
        ws.on('close', onDone);
        ws.on('error', onDone);
        rs.on('error', onDone);
        rs.pipe(ws);
      });
    });
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
 * mkdir if dir not exists
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
