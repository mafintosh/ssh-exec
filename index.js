var ssh2 = require('ssh2')
var fs = require('fs')
var path = require('path')
var duplexify = require('duplexify')
var once = require('once')

var HOME = process.env.HOME || process.env.USERPROFILE

var parse = function (opts) {
  if (typeof opts === 'string') {
    opts = opts.match(/^(?:([^@]+)@)?([^:]+)(?::(\d+))?$/) || []
    opts = {
      host: opts[2],
      user: opts[1],
      port: parseInt(opts[3], 10) || 22
    }
  }

  return opts
}

var exec = function (cmd, opts, cb) {
  opts = parse(opts)

  var stream = duplexify()
  var client = new ssh2.Client()
  var key = opts.key === false ? undefined : opts.key || path.join(HOME, '.ssh', 'id_rsa')
  var fingerprint

  client.on('error', function (err) {
    stream.destroy(err)
  })

  client.on('timeout', function() {
    stream.destroy(new Error('socket timeout'))
  })

  var connect = function () {
    var verifier = function (hash) {
      fingerprint = hash

      if (!opts.fingerprint) return true
      if (fingerprint === opts.fingerprint) return true

      return false
    }

    if (opts.password) {
      client.on('keyboard-interactive', function (a, b, c, prompt, cb) {
        cb([opts.password])
      })
    }

    client.connect({
      host: opts.host,
      username: opts.user,
      password: process.env.SSH_PASSWORD || opts.password,
      passphrase: process.env.SSH_PASSPHRASE || opts.passphrase,
      port: opts.port || 22,
      tryKeyboard: !!opts.password,
      privateKey: key,
      allowAgentFwd: opts.allowAgentFwd,
      agent: process.env.SSH_AUTH_SOCK || opts.agent,
      hostHash: opts.hostHash || 'md5',
      hostVerifier: verifier,
      localUsername: opts.localUsername,
      localHostname: opts.localHostname,
      forceIPv4: opts.forceIPv4,
      forceIPv6: opts.forceIPv6,
      keepaliveCountMax: opts.keepaliveCountMax,
      keepaliveInterval: opts.keepaliveInterval,
      algorithms: opts.algorithms,
      compress: opts.compress,
      strictVendor: opts.strictVendor,
      readyTimeout: opts.readyTimeout,
      timeout: opts.timeout,
      sock: opts.sock
    })
  }

  var run = function () {
    client.exec(cmd, function (err, stdio) {
      if (err) return stream.destroy(err)

      stream.setWritable(stdio)
      stream.setReadable(stdio)

      stream.emit('ready')

      stdio.stderr.setEncoding('utf-8')
      stdio.stderr.on('data', function (data) {
        stream.emit('warn', data)
      })

      stdio.on('exit', function (code) {
        if (code !== 0) {
          var err = new Error('Non-zero exit code: ' + code)
          err.code = code
          stream.emit('error', err)
        }
        stream.emit('exit', code)
        client.end()
      })
    })
  }

  var onverify = function (err) {
    if (err) return stream.destroy(err)
    run()
  }

  client.once('ready', function () {
    if (fingerprint === opts.fingerprint) return run()
    if (!stream.emit('verify', fingerprint, onverify)) return run()
  })

  stream.on('close', function () {
    client.end()
  })

  if (!key || Buffer.isBuffer(key) || key.toString().indexOf('\n') > -1) {
    connect()
  } else {
    fs.readFile(key, function (_, buffer) {
      key = buffer
      connect()
    })
  }

  if (cb) oncallback(stream, cb)
  return stream
}

var oncallback = function (stream, cb) {
  cb = once(cb)

  var stderr = ''
  var stdout = ''

  stream.setEncoding('utf-8')

  stream.on('warn', function (data) {
    stderr += data
  })

  stream.on('data', function (data) {
    stdout += data
  })

  stream.on('error', function (err) {
    cb(err, stdout, stderr)
  })

  stream.on('end', function () {
    cb(null, stdout, stderr)
  })
}

module.exports = exec
