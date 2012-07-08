/*!
 * ndir - lib/jscexify
 * Copyright(c) 2012 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var fs = require('fs');
var path = require('path');
fs.exists = fs.exists || path.exists;

/**
 * jscexify
 */
var Jscex = require('jscex');

if (process.env.NODE_ENV === 'test') {
  Jscex.logger.level = Jscex.Logging.Level.INFO;
}

require("jscex-jit").init();
require("jscex-async").init();
require("jscex-async-powerpack").init();

var Async = Jscex.Async;
var Task = Async.Task;
var Binding = Async.Binding;

fs.existsAsync = Binding.fromCallback(fs.exists);
fs.mkdirAsync = Binding.fromStandard(fs.mkdir);

module.exports = Jscex;