module.exports = process.env.JSCOV 
  ? require('./lib-cov/ndir')
  : require('./lib/ndir');