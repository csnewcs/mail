import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_INLINE_ATTACHMENT_SIZE_BYTES,
  parseComposerAttachments
} from './mail-attachments.ts'

test('accepts a valid attachment above the inline delivery threshold', () => {
  const content = Buffer.alloc(MAX_INLINE_ATTACHMENT_SIZE_BYTES + 1).toString('base64')
  const result = parseComposerAttachments([
    {
      name: 'large.bin',
      contentType: 'application/octet-stream',
      size: MAX_INLINE_ATTACHMENT_SIZE_BYTES + 1,
      contentBase64: content
    }
  ])

  assert.equal(result.ok, true)
})

test('rejects attachments above the public attachment limit', () => {
  const result = parseComposerAttachments([
    {
      name: 'too-large.bin',
      contentType: 'application/octet-stream',
      size: MAX_ATTACHMENT_SIZE_BYTES + 1,
      contentBase64: 'YQ=='
    }
  ])

  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.error, /exceeds/)
})
