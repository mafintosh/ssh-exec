var Connection = require('ssh2');
var stream = require('stream-wrapper');
var path = require('path');
var fs = require('fs');

var HOME = process.env.HOME || process.env.USERPROFILE;

var exec = function(cmd, opts, callback) {
	if (typeof opts === 'string') {
		opts = opts.match(/^(?:([^@]+)@)?(.+)$/) || [];
		opts = {
			host: opts[2],
			user: opts[1]
		};
	}

	var output = stream.passThrough();
	var conn = new Connection();

	var key = opts.key === false ? undefined : opts.key || path.join(HOME, '.ssh', 'id_rsa');

	var onkey = function() {
		conn.on('ready', function() {
			conn.exec(cmd, {env:opts.env}, function(err, stream) {
				if (err) return output.emit('error', err);
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
			privateKey: key
		});
	};

	if (!key || Buffer.isBuffer(key)) return onkey();

	fs.readFile(key, function(_, buffer) {
		key = buffer;
		onkey();
	});

	if (!callback) return output;

	var buffer = [];

	stream.on('data', function(data) {
		buffer.push(data);
	});
	stream.on('exit', function(code) {
		if (!code) {
			var buf = buffer.length === 1 ? buffer[0] : Buffer.concat(buffer);
			if (opts.encoding) buf = buf.toString(opts.encoding);
			return callback(null, buf);
		}

		var err = new Error('bad exit code');
		err.code = code;
		callback(err);
	});
	stream.on('error', callback);

	return output;
};

module.exports = exec;