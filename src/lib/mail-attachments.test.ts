import assert from 'node:assert/strict'
import test from 'node:test'
import { parseComposerAttachments } from './mail-attachments.ts'

test('accepts an attachment above the former size limit', () => {
  const size = 25 * 1024 * 1024 + 1
  const content = Buffer.alloc(size).toString('base64')
  const result = parseComposerAttachments([
    {
      name: 'large.bin',
      contentType: 'application/octet-stream',
      size,
      contentBase64: content,
      deliveryMode: 'mail'
    }
  ])

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.attachments[0].deliveryMode, 'mail')
})

test('preserves an explicit public-link delivery mode', () => {
  const result = parseComposerAttachments([
    {
      name: 'shared.txt',
      contentType: 'text/plain',
      size: 1,
      contentBase64: 'YQ==',
      deliveryMode: 'public'
    }
  ])

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.attachments[0].deliveryMode, 'public')
})

test('rejects an unknown attachment delivery mode', () => {
  const result = parseComposerAttachments([
    {
      name: 'shared.txt',
      contentType: 'text/plain',
      size: 1,
      contentBase64: 'YQ==',
      deliveryMode: 'unknown'
    }
  ])

  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.error, /delivery mode/)
})

test('keeps legacy attachment routing when delivery mode is absent', () => {
  const small = parseComposerAttachments([
    { name: 'small.txt', contentType: 'text/plain', size: 1, contentBase64: 'YQ==' }
  ])
  const largeSize = 5 * 1024 * 1024 + 1
  const large = parseComposerAttachments([
    {
      name: 'large.bin',
      contentType: 'application/octet-stream',
      size: largeSize,
      contentBase64: Buffer.alloc(largeSize).toString('base64')
    }
  ])

  assert.equal(small.ok, true)
  if (small.ok) assert.equal(small.attachments[0].deliveryMode, 'mail')
  assert.equal(large.ok, true)
  if (large.ok) assert.equal(large.attachments[0].deliveryMode, 'public')
})
