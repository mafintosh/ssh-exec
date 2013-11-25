var Connection = require('ssh2');
var stream = require('stream-wrapper');
var concat = require('concat-stream');
var once = require('once');
var path = require('path');
var fs = require('fs');

var HOME = process.env.HOME || process.env.USERPROFILE;

var buffer = function(stream, enc, callback) {
	var result = undefined;
	var exited = false;

	callback = once(callback);
	stream.pipe(concat(function(buffer) {
		if (enc) buffer = buffer.toString(enc);
		if (exited) return callback(null, buffer);
		result = buffer;
	}));

	stream.on('error', callback);
	stream.on('exit', function(code) {
		if (code) {
			var err = new Error('bad exit code');
			err.code = code
			return callback(err);
		}
		if (result !== undefined) return callback(null, result);
		exited = true;
	});
};

var exec = function(cmd, opts, callback) {
	if (typeof opts === 'string') {
		opts = opts.match(/^(?:([^@]+)@)?([^:]+)(?::(\d+))?$/) || [];
		opts = {
			host: opts[2],
			user: opts[1],
			port: parseInt(opts[3], 10) || 22
		};
	}

	var output = stream.passThrough();
	var conn = new Connection();

	var key = opts.key === false ? undefined : opts.key || path.join(HOME, '.ssh', 'id_rsa');

	var onkey = function() {
		conn.on('ready', function() {
			conn.exec(cmd, {env:opts.env}, function(err, stream) {
				if (err) {
					conn.end();
					output.emit('error', err);
					return;
				}

				stream.pipe(output);

				stream.on('exit', function(code) {
					conn.end();
					output.emit('exit', code);
				});
			});
		});

		conn.on('error', function(err) {
			output.emit('error', err);
		});

		conn.connect({
			host: opts.host,
			username: opts.user,
			password: opts.password,
			port: opts.port || 22,
			privateKey: key
		});
	};

	if (!key || Buffer.isBuffer(key)) {
		onkey();
	} else {
		fs.readFile(key, function(_, buffer) {
			key = buffer;
			onkey();
		});
	}

	if (!callback) return output;

	buffer(output, opts.encoding, callback);
	return output;
};

module.exports = exec;