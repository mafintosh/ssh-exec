# ssh-exec

Execute a script over ssh using Node.JS

It is available through npm

	npm install ssh-exec

It is written in plain Javascript and uses [ssh2](https://github.com/mscdex/ssh2) for all the heavy lifting.

## Usage

``` js
var exec = require('ssh-exec');

// using ~/.ssh/id_rsa as the private key

exec('ls -lh', 'ubuntu@my-remote.com').pipe(process.stdout);

// or using more settings

exec('ls -lh', {
	user: 'ubuntu',
	host: 'my-remote.com',
	key: myKeyFileOrBuffer,
	env: {TEST_VAR:'test'},
	password: 'my-user-password'
}).pipe(process.stdout);

// or if you want to buffer the result

exec('ls -lh', 'ubuntu@my-remote', function(err, output) {
	if (err) return console.log('bad exit code: '+err.code);
	console.log('output', output.toString())
});
```

## License

MIT