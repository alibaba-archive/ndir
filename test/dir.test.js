/**
 * Module dependencies.
 */

var dir = require('../lib/dir');
var should = require('should');
var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;

describe('dir', function() {
  describe('#walk()', function() {
    var root = path.dirname(__dirname) + '/';

    function check(dir, files) {
      fs.statSync(dir).isDirectory().should.be.true;
      files.should.be.a('object');
      Object.keys(files).length.should.equal(fs.readdirSync(dir).length);
      for (var k in files) {
        k.should.be.a('string');
        k.should.include(dir);
        var stats = files[k];
        stats.should.be.an.instanceof(fs.Stats);
      }
    }

    // 2 links, 39 dirs, 134 files
    var node_modulesDir = path.join(__dirname, '/../node_modules');
    it('should walk dir ' + node_modulesDir, function(done) {
      var walker = new dir.Walk(node_modulesDir);
      walker.on('dir', check);
      var dirCount = 1;
      var fileCount = 0;
      walker.on('dir', function(dirpath, files) {
        for (var k in files) {
          if (files[k].isDirectory()) {
            dirCount++;
          } else if(!files[k].isSymbolicLink() && files[k].isFile()) {
            fileCount++;
          }
        }
      });
      walker.on('end', function() {
        dirCount.should.equal(39);
        fileCount.should.equal(134);
        done();
      });
    });

    it('should walk dir all in callback', function(done) {
      var walker = new dir.Walk(__dirname, check, done);
    });

    it('walk(dir, ondir, onend, onerr) should worked', function(done) {
      dir.walk(root, check, done, function(err, p) {
        should.not.exists(p);
        should.not.exists(err);
      });
    });

    it('should success when walk empty dir', function(done) {
      dir.walk(__dirname + '/emptydir', check, done, function(err, p) {
        should.not.exists(p);
        should.not.exists(err);
      });
    });

    it('should error when walk not exists dir', function(done) {
      dir.walk(__dirname + '/not-exists-dir', check, done, function(err) {
        err.should.be.an.instanceof(Error);
        err.message.should.include('ENOENT, no such file or directory');
      });
    });

    it('should error when walk a file', function(done) {
      dir.walk(__dirname + '/dir.test.js', check, done, function(err) {
        err.should.be.an.instanceof(Error);
        err.message.should.include('ENOTDIR, not a directory');
      });
    });

    if (path.existsSync('/.fseventsd')) {
      it('should error when walk noPermission dir', function(done) {
        dir.walk('/.fseventsd', check, done, function(err) {
          err.should.be.an.instanceof(Error);
          err.message.should.include('EACCES, permission denied');
        });
      });
    }
    
  });

  describe('#copyfile()', function() {
    var from = __dirname + '/dir.test.foo.txt';
    var to = __dirname + '/dir.test.bar.txt';
    var toParentNotExists = '/tmp/' + new Date().getTime() + '/dir.test.bar.txt';

    before(function() {
      path.existsSync(to) && fs.unlinkSync(to);
    });

    it('should worked', function(done) {
      dir.copyfile(from, to, function(err) {
        should.not.exist(err);
        fs.statSync(to).isFile().should.be.true;
        fs.readFileSync(to).toString().should.equal(fs.readFileSync(from).toString());
        dir.copyfile(to, to, function(err) {
          // copy save should callback(err)
          err.should.be.an.instanceof(Error);
          err.message.should.include('not copied');
          fs.statSync(to).isFile().should.be.true;
          fs.readFileSync(to).toString().should.equal(fs.readFileSync(from).toString());
          done();
        });
      });
    });

    it('should copy toParentNotExists', function(done) {
      dir.copyfile(from, toParentNotExists, function(err) {
        should.not.exist(err);
        fs.statSync(toParentNotExists).isFile().should.be.true;
        fs.readFileSync(toParentNotExists).toString().should.equal(fs.readFileSync(from).toString());
        done();
      });
    });

  });

  describe('#mkdir()', function() {
    var existsDir = '/tmp/dir.test.exists.dir';
    var notExistsDir = '/tmp/dir.test/not.exists.dir';

    before(function(done) {
      !path.existsSync(existsDir) && fs.mkdirSync(existsDir);
      exec('rm -rf /tmp/dir.test', done);
    });

    after(function() {
      fs.rmdirSync(existsDir);
    });

    it('should make exists dir success', function(done) {
      path.existsSync(existsDir).should.be.true;
      dir.mkdir(existsDir, function(err) {
        path.existsSync(existsDir).should.be.true;
        done(err);
      });
    });

    it('should make not exists dir success', function(done) {
      path.existsSync(notExistsDir).should.be.false;
      dir.mkdir(notExistsDir, function(err) {
        path.existsSync(notExistsDir).should.be.true;
        done(err);
      });
    });

  });
});