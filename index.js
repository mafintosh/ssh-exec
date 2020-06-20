'use strict'

/* eslint standard/no-callback-literal: "off" */

const ssh2 = require('ssh2')
const fs = require('fs')
const path = require('path')
const duplexify = require('duplexify')
const once = require('once')

const HOME = process.env.HOME || process.env.USERPROFILE

function parse (opts) {
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

function exec (cmd, opts, cb) {
  opts = parse(opts)

  const stream = duplexify()
  const client = new ssh2.Client()
  let key = opts.key === false ? undefined : opts.key || path.join(HOME, '.ssh', 'id_rsa')
  let fingerprint

  client.on('error', function (err) {
    stream.destroy(err)
  })

  function connect () {
    if (key && key.toString().toLowerCase().indexOf('encrypted') > -1) key = null

    function verifier (hash) {
      fingerprint = hash

      if (!opts.fingerprint) return true
      if (fingerprint === opts.fingerprint) return true

      client.destroy(new Error('Host could not be verified'))
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
      password: opts.password,
      port: opts.port || 22,
      tryKeyboard: !!opts.password,
      privateKey: key,
      agent: process.env.SSH_AUTH_SOCK,
      hostHash: 'md5',
      hostVerifier: verifier
    })
  }

  function run () {
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
          const err = new Error('Non-zero exit code: ' + code)
          err.code = code
          stream.emit('error', err)
        }
        stream.emit('exit', code)
        client.end()
      })
    })
  }

  function onverify (err) {
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

function oncallback (stream, cb) {
  cb = once(cb)

  let stderr = ''
  let stdout = ''

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
