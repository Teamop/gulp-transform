'use strict';

var inherits = require('util').inherits;
var Transform = require('stream').Transform;
var PluginError = require('gulp-util').PluginError;



// Main plugin function.
module.exports = function gulpTransform(transformFn, options) {
  if (isNone(transformFn)) {
    throwPluginError('transformFn must be defined.');
  } else if (!isFunction(transformFn)) {
    throwPluginError('transformFn must be a function.');
  } else if (!isNone(options) && !isObject(options)) {
    throwPluginError('options must be an object if defined.');
  } else {
    return new PluginStream(transformFn, options);
  }
};



// Stream returned by main plugin function.
function PluginStream(fn, opts) {
  Transform.call(this, {objectMode: true});
  this.fn = fn;
  this.opts = opts || {};
}

inherits(PluginStream, Transform);

// Transforms the contents of each file and emits the file.
PluginStream.prototype._transform = function(file, enc, next) {
  var fn = this.fn, opts = this.opts;

  if (file.isBuffer()) {
    file.contents = transform(fn, file.contents, file, opts);
  }

  if (file.isStream()) {
    file.contents = file.contents.pipe(new ContentStream(fn, file, opts));
  }

  next(null, file);
};



// Stream that transforms file contents if file is in streaming mode.
function ContentStream(fn, file, opts) {
  Transform.call(this);
  this.fn = fn;
  this.file = file;
  this.opts = opts;
  this.data = [];
}

inherits(ContentStream, Transform);

// Pushes each chunck into a data array.
ContentStream.prototype._transform = function(chunk, enc, next) {
  this.data.push(chunk);
  next();
};

// Transforms and emits concatinated data.
ContentStream.prototype._flush = function(done) {
  var contents = Buffer.concat(this.data);
  this.push(transform(this.fn, contents, this.file, this.opts));
  done();
};



// Invokes transformFn.
function transform(fn, contents, file, opts) {
  // Cast contents to string if encoding is defined in opts.
  contents = opts.encoding ? contents.toString(opts.encoding) : contents;
  contents = fn.call(opts.thisArg, contents, file);

  // Ensure transformFn returns a String or a Buffer and return as a Buffer.
  if (Buffer.isBuffer(contents)) {
    return contents;
  } else if (isString(contents)) {
    return new Buffer(contents);
  } else {
    throwPluginError('transformFn must return a string or a buffer.');
  }
}



function throwPluginError(message) {
  throw new PluginError('gulp-transform', message);
}



function isNone(value) {
  return value === undefined || value === null;
}

function isFunction(value) {
  return typeof value === 'function';
}

function isObject(value) {
  var type = typeof value;
  return type === 'object' || type === 'function';
}

function isString(value) {
  return typeof value === 'string' || value instanceof String;
}
