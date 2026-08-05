import assert from 'node:assert/strict'
import test, { beforeEach } from 'node:test'
import {
  createThreadShareToken,
  getSharedMessagesByShareToken
} from './mail.js'
import { resetDemoState } from './demo.js'

test('creates thread share token for multiple selected messages and retrieves them', async () => {
  resetDemoState()
  const messageIds = ['demo-msg-1', 'demo-msg-2']
  const token = await createThreadShareToken(messageIds)

  assert.strictEqual(typeof token, 'string')
  assert.ok(token && token.length > 0)

  const shared = await getSharedMessagesByShareToken(token!)
  assert.strictEqual(shared.length, 2)
  const ids = shared.map((m) => m.messageId)
  assert.ok(ids.includes('demo-msg-1'))
  assert.ok(ids.includes('demo-msg-2'))
})

test('filters out unselected messages from the shared thread link', async () => {
  resetDemoState()
  const selectedIds = ['demo-msg-2']
  const token = await createThreadShareToken(selectedIds)

  const shared = await getSharedMessagesByShareToken(token!)
  assert.strictEqual(shared.length, 1)
  assert.strictEqual(shared[0].messageId, 'demo-msg-2')
})

test('returns empty array for invalid or non-existent token', async () => {
  resetDemoState()
  const shared = await getSharedMessagesByShareToken('non-existent-token-12345')
  assert.deepStrictEqual(shared, [])
})

test('reuses existing share token when same message selection is shared again', async () => {
  resetDemoState()
  const messageIds = ['demo-msg-1', 'demo-msg-2']
  const token1 = await createThreadShareToken(messageIds)
  const token2 = await createThreadShareToken(messageIds)

  assert.strictEqual(typeof token1, 'string')
  assert.strictEqual(token1, token2)
})
