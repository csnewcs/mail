import assert from 'node:assert/strict'
import test from 'node:test'
import { readNotificationBatches } from './push-control.ts'

test('deduplicates and bounds read-notification control payloads', () => {
  const ids = [0, -1, 1, 1, ...Array.from({ length: 250 }, (_, index) => index + 2)]
  const batches = readNotificationBatches(ids)

  assert.deepEqual(
    batches.map((batch) => batch.length),
    [200, 51]
  )
  assert.deepEqual(
    batches.flat(),
    Array.from({ length: 251 }, (_, index) => index + 1)
  )
})
