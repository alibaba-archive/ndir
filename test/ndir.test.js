/**
 * Module dependencies.
 */

var dir = require('../');
var should = require('../node_modules/should');
var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;
fs.existsSync = fs.existsSync || path.existsSync;
var root = path.resolve('.');
var logfile = __dirname + '/access.log';
var lines = fs.readFileSync(logfile, 'utf8').split('\n');

describe('ndir', function () {
  describe('walk()', function () {
    var emptydir = path.join(root, 'test/emptydir');

    before(function () {
      if (!fs.existsSync(emptydir)) {
        fs.mkdirSync(emptydir, '0777');
      }
    });
    after(function () {
      if (fs.existsSync(emptydir)) {
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
      walker.on('dir', function (dirpath, files) {
        for (var i = 0, l = files.length; i < l; i++) {
          var info = files[i];
          var stats = info[1];
          if (stats.isDirectory()) {
            dirCount++;
          } else if (!stats.isSymbolicLink() && stats.isFile()) {
            fileCount++;
          }
        }
      });
      walker.on('end', function () {
        dirCount.should.equal(2);
        fileCount.should.equal(4);
        done();
      });
    });

    it('should walk "' + root + '" in callback mode', function (done) {
      var walker = new dir.Walk(__dirname, check, done);
    });

    it('should walk "' + root + '" no error', function (done) {
      dir.walk(root, check, done, function (err, p) {
        should.not.exist(err);
        should.not.exist(p);
      });
    });

    it('should success when walk empty dir', function (done) {
      dir.walk(emptydir, check, done, function (err, p) {
        should.not.exist(err);
        should.not.exist(p);
      });
    });

    it('should error when walk not exists dir', function (done) {
      dir.walk('test/not-exists-dir', check, done, function (err) {
        err.should.be.an.instanceof(Error);
        err.message.should.include('ENOENT');
      });
    });

    it('should error when walk a file', function (done) {
      dir.walk('test/ndir.test.js', check, done, function (err) {
        err.should.be.an.instanceof(Error);
        err.message.should.include('ENOTDIR');
      });
    });

    if (fs.existsSync('/.fseventsd')) {
      it('should error when walk noPermission dir', function (done) {
        dir.walk('/.fseventsd', check, done, function (err) {
          err.should.be.an.instanceof(Error);
          err.message.should.include('EACCES');
        });
      });
    }
    
  });

  describe('copyfile()', function () {
    var from = 'test/dir.test.foo.txt';
    var to = 'test/dir.test.bar.txt';
    var toParentNotExists = '/tmp/' + new Date().getTime() + '/dir.test.bar.txt';

    before(function () {
      fs.existsSync(to) && fs.unlinkSync(to);
    });

    it('should worked', function (done) {
      dir.copyfile(from, to, function (err) {
        should.not.exist(err);
        fs.statSync(to).isFile().should.be.true;
        fs.readFileSync(to).toString().should.equal(fs.readFileSync(from).toString());
        dir.copyfile(to, to, function (err) {
          // copy save should callback(err)
          err.should.be.an.instanceof(Error);
          err.message.should.include('not copied');
          fs.statSync(to).isFile().should.be.true;
          fs.readFileSync(to).toString().should.equal(fs.readFileSync(from).toString());
          done();
        });
      });
    });

    it('should copy toParentNotExists', function (done) {
      dir.copyfile(from, toParentNotExists, function (err) {
        should.not.exist(err);
        fs.statSync(toParentNotExists).isFile().should.be.true;
        fs.readFileSync(toParentNotExists).toString().should.equal(fs.readFileSync(from).toString());
        done();
      });
    });

  });

  describe('mkdir()', function () {
    var existsDir = '/tmp/dir.test.exists.dir';
    var notExistsDir = '/tmp/dir.test/not.exists.dir/haha/1/2/3/4/2/3/1/2/3';

    before(function (done) {
      !fs.existsSync(existsDir) && fs.mkdirSync(existsDir, '0777');
      exec('rm -rf /tmp/dir.test', done);
    });

    after(function () {
      fs.rmdirSync(existsDir);
    });

    it('should make exists dir success', function (done) {
      fs.existsSync(existsDir).should.be.true;
      dir.mkdir(existsDir, function (err) {
        fs.existsSync(existsDir).should.be.true;
        done(err);
      });
    });

    it('should make not exists dir success', function (done) {
      fs.existsSync(notExistsDir).should.be.false;
      dir.mkdir(notExistsDir, function (err) {
        fs.existsSync(notExistsDir).should.be.true;
        done(err);
      });
    });

  });

  describe('createLineReader()', function () {
    it('should read line by line', function (done) {
      var index = 0;
      dir.createLineReader(logfile)
      .on('line', function (line) {
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

  describe('createBigFileWalker', function () {
    var walker;
    it('should emit readable', function (done) {
      walker = dir.createBigFileWalker(logfile, {
        offset: 10,
        piece: 100
      });
      walker.pause.should.be.not.ok;
      walker.once('readable', function () {
        walker.curr.length.should.equal(100);
        walker.back.length.should.equal(100);
        walker.pause.should.be.ok;
        done();
      });
    });

    it('should get -1 return []', function () {
      var result = walker.get(-1);
      result.should.have.length(0);
    });

    it('should walk 10 ok', function () {
      var result = walker.get(10);
      for (var i = 0; i < 10; i++) {
        result[i].toString().should.equal(lines[i + 10]);
      }
      walker.index.should.equal(10);
      walker.curr.should.have.length(100);
      walker.back.should.have.length(100);
    });

    it('should walk left ok', function () {
      var remain = walker.remain;
      var left = walker.curr.length - walker.index;
      var result = walker.get(left);
      for (var i = 0; i < left; i++) {
        result[i].toString().should.equal(lines[i + 20]);
      }
      walker.curr.length.should.equal(100);
      walker.pause.should.be.not.ok;
      walker.back.should.equal(remain);
      walker.remain.length.should.equal(0);
    });

    it('should walker more ok', function (done) {
      //wait load
      setTimeout(function () {
        var remain = walker.remain;
        var back = walker.back;
        var result = walker.get(150);
        walker.index.should.equal(50);
        walker.pause.should.equal(false);
        walker.curr.should.equal(back);
        walker.back.should.equal(remain);
        for (var i = 0; i < result.length; i++) {
          result[i].toString().should.equal(lines[i + 110]);
        }
        done();
      }, 100);
    });

    it('should walker end', function (done) {
      //wait load
      setTimeout(function () {
        var result = walker.get(150);
        walker.got.should.equal(lines.length - 11);
        done();
      }, 100);
    });
  });
});
