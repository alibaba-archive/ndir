/*!
 * ndir - index.js
 * Copyright(c) 2012 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var fs = require('fs');
var path = require('path');
var libpath = path.join(__dirname, process.env.NDIR_COV ? 'lib-cov' : 'lib');

var modulepath = path.join(libpath, 'ndir_.js');
if (!fs.existsSync(modulepath)) {
  modulepath = path.join(libpath, 'ndir.js');
}

module.exports = require(modulepath);