'use strict'

const assert = require('assert')
const test = require('tap').test
assert(test !== null)

const sshExec = require('../') // reference the library
assert(sshExec !== null)

// load environment specific variables from '.env' file (if present) and add to process.env ...
const dotenv = require('dotenv')
dotenv.config()

function loggingCallback (err, stdout, stderr) {
  console.log(`loggingCallback: \nerr: ${err}\nstdout: ${stdout}\nstderr: ${stderr}\n`)
}

/** @test {sshExec} */
test('ensure objects exported by the library, exists and are of the right type', (t) => {
  t.plan(2)

  const sshExec = require('../') // reference the library
  assert(sshExec !== null)
  assert.strictEqual(typeof sshExec, 'function')
  t.ok(sshExec)
  t.strictEqual(typeof sshExec, 'function')
})

/** @test {sshExec} */
test('execute a command via ssh to root@localhost with default options, and ensure all is good', (t) => {
  if (process.env.SSH_LOCALHOST_DEFAULT_ENABLE_TEST !== 'true') {
    t.plan(1)
    t.comment('skipped test to root@localhost with default options')
    t.pass('test skipped, because env var SSH_LOCALHOST_DEFAULT_ENABLE_TEST is not defined')
  } else {
    t.plan(2)
    t.comment('run test to root@localhost with default options')
    sshExec('ls -lh', 'root@localhost').pipe(process.stdout)
    t.ok(sshExec)
    t.comment('run test to root@localhost with default options and callback')
    sshExec('ls -lh', 'root@localhost', loggingCallback)
    t.ok(sshExec)
  }
})

/** @test {sshExec} */
test('execute a command via ssh on localhost with username and password, and ensure all is good', (t) => {
  if (process.env.SSH_LOCALHOST_USERPASS_ENABLE_TEST !== 'true') {
    t.plan(1)
    t.comment('skipped test on localhost with username and password')
    t.pass('test skipped, because env var SSH_LOCALHOST_USERPASS_ENABLE_TEST is not defined')
  } else {
    t.plan(2)
    const sshConnectionOptions = {
      host: process.env.SSH_HOST,
      port: process.env.SSH_PORT,
      user: process.env.SSH_USER,
      password: process.env.SSH_PASS
    }
    t.comment('run test on localhost with username and password')
    sshExec('echo "Remote host is:"; hostname; ls -lh', sshConnectionOptions).pipe(process.stdout)
    t.ok(sshExec)
    t.comment('run test on localhost with username and password, with callback')
    sshExec('echo "Remote host is:"; hostname; ls -lh', sshConnectionOptions, loggingCallback)
    t.ok(sshExec)
  }
})

/** @test {sshExec} */
test('execute a command via ssh on localhost with username and key, and ensure all is good', (t) => {
  if (process.env.SSH_LOCALHOST_USERKEY_ENABLE_TEST !== 'true') {
    t.plan(1)
    t.comment('skipped test on localhost with username and key')
    t.pass('test skipped, because env var SSH_LOCALHOST_USERKEY_ENABLE_TEST is not defined')
  } else {
    t.plan(2)
    const sshConnectionOptions = {
      host: process.env.SSH_HOST,
      port: process.env.SSH_PORT,
      user: process.env.SSH_USER,
      key: process.env.SSH_KEY
    }
    t.comment('run test on localhost with username and key')
    sshExec('echo "Remote host is:"; hostname; ls -lh', sshConnectionOptions).pipe(process.stdout)
    t.ok(sshExec)
    t.comment('run test on localhost with username and key, with callback')
    sshExec('echo "Remote host is:"; hostname; ls -lh', sshConnectionOptions, loggingCallback)
    t.ok(sshExec)
  }
})
