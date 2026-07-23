import assert from 'node:assert/strict'
import test from 'node:test'
import { sendStatusLabel } from './send-status.ts'

test('shows read only after a sent message has an open timestamp', () => {
  assert.equal(sendStatusLabel('sending', null), '[sending]')
  assert.equal(sendStatusLabel('failed', '2026-07-23T12:00:00.000Z'), '[failed]')
  assert.equal(sendStatusLabel('sent', null), '[sent]')
  assert.equal(sendStatusLabel('sent', '2026-07-23T12:00:00.000Z'), '[read]')
})
