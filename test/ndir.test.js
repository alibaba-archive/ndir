/**
 * Module dependencies.
 */

var dir = require('../');
var should = require('../node_modules/should');
var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;

var root = path.resolve('.');
describe('ndir', function() {
  describe('#walk()', function() {
    var emptydir = path.join(root, 'test/emptydir');

    before(function() {
      if (!path.existsSync(emptydir)) {
        fs.mkdirSync(emptydir);
      }
    });
    after(function() {
      if (path.existsSync(emptydir)) {
        fs.rmdirSync(emptydir);
      }
    });

    function check(dir, files) {
      fs.statSync(dir).isDirectory().should.be.true;
      files.should.be.an.instanceof(Array);
      files.length.should.equal(fs.readdirSync(dir).length);
      for (var i = 0, l = files.length; i < l; i++) {
        var info = files[i];
        info[0].should.be.a('string');
        info[0].should.include(dir);
        var stats = info[1];
        stats.should.be.an.instanceof(fs.Stats);
      }
    }

    var walkdir = path.join(root, 'test');
    it('should walk dir ' + walkdir, function end(done) {
      var walker = new dir.Walk(walkdir);
      walker.on('dir', check);
      var dirCount = 1;
      var fileCount = 0;
      walker.on('dir', function(dirpath, files) {
        for (var i = 0, l = files.length; i < l; i++) {
          var info = files[i];
          var stats = info[1];
          if (stats.isDirectory()) {
            dirCount++;
          } else if(!stats.isSymbolicLink() && stats.isFile()) {
            fileCount++;
          }
        }
      });
      walker.on('end', function() {
        dirCount.should.equal(2);
        fileCount.should.equal(4);
        done();
      });
    });

    it('should walk "' + root + '" in callback mode', function(done) {
      var walker = new dir.Walk(__dirname, check, done);
    });

    it('should walk "' + root + '" no error', function(done) {
      dir.walk(root, check, done, function(err, p) {
        should.not.exist(err);
        should.not.exist(p);
      });
    });

    it('should success when walk empty dir', function(done) {
      dir.walk(emptydir, check, done, function(err, p) {
        should.not.exist(err);
        should.not.exist(p);
      });
    });

    it('should error when walk not exists dir', function(done) {
      dir.walk('test/not-exists-dir', check, done, function(err) {
        err.should.be.an.instanceof(Error);
        err.message.should.include('ENOENT, no such file or directory');
      });
    });

    it('should error when walk a file', function(done) {
      dir.walk('test/ndir.test.js', check, done, function(err) {
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
    var from = 'test/dir.test.foo.txt';
    var to = 'test/dir.test.bar.txt';
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

  describe('#createLineReader()', function() {
    it('should read line by line', function(done) {
      var logfile = __dirname + '/access.log';
      var lines = fs.readFileSync(logfile, 'utf8').split('\n');
      var index = 0;
      dir.createLineReader(logfile)
      .on('line', function(line) {
        line.should.be.an.instanceof(Buffer);
        var s = line.toString();
        s.should.equal(lines[index++]);
        if (s) {
          s[s.length - 1].should.not.equal('\n');
        }
      })
      .on('end', done)
      .on('error', done);
    });
  });
});