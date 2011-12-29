/**
 * Module dependencies.
 */

var fs = require('fs');
var path = require('path');
var util = require('util');
var dir = require('../lib/dir');
var rl = require("readline").createInterface(process.stdin, process.stdout);

if (process.argv.length < 4) {
  console.log('Usage: node copy-dir.js <fromdir> <todir>');
  process.exit(1);
}

var cwd = process.cwd();
var fromdir = path.join(cwd, process.argv[2]);
var todir = path.join(cwd, process.argv[3]);

console.log('Start copy %s to %s', fromdir, todir);

var tasks = [];
var fileCount = 0;
var walker = dir.walk(fromdir);
var walkerEnd = false;
walker.on('dir', function(dirpath, files) {
  var start = tasks.length === 0;
  tasks.push([dirpath, true]);
  for (var k in files) {
    tasks.push([k, files[k].isDirectory()]);
  }
  if (start) {
    walker.emit('nextCopyTask');
  }
});

function copyfile(from, to, callback) {
  var needCopy = true;
  dir.copyfile(from, to, function(exists, next) {
    if (exists) {
      rl.question('File "' + to + '" exists, overwrite? > ', function (answer) {
        if (answer === 'yes' || answer === 'y') {
          util.print(util.format('Copying "%s" to "%s" ... ', from, to));
          return next(true);
        }
        needCopy = false;
        next(false);
      });
    } else {
      util.print(util.format('Copying "%s" to "%s" ... ', from, to));
      next(true);
    }
  }, function(err) {
    if (needCopy) {
      fileCount++;
      util.print((err ? 'Error!!!' : 'done.') + '\n');
    }
    callback(err);
  });
};

walker.on('nextCopyTask', function() {
  var task = tasks.shift();
  if (!task) {
    if (walkerEnd) {
      walker.emit('endCopy');
    }
    return;
  }
  var f = task[0];
  var t = f.replace(fromdir, '');
  if (t[0] === '/') {
    t = t.substring(1);
  }
  t = path.join(todir, t);
  var isdir = task[1];
  if (isdir) {
    dir.mkdir(t, function(err) {
      walker.emit('nextCopyTask');
    });
    return;
  }
  copyfile(f, t, function() {
    walker.emit('nextCopyTask');
  });
});

walker.on('end', function() {
  walkerEnd = true;
  if (tasks.length === 0) {
    walker.emit('endCopy');
  }
});

function exit() {
  console.log('\nTotal copy %d files.', fileCount);
  process.exit(0);
};

walker.on('endCopy', exit);
rl.on('close', exit);
