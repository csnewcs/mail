import assert from 'node:assert/strict'
import test from 'node:test'
import { parseMailtoUrl } from './mailto.ts'

test('parses mailto recipients and compose fields', () => {
  assert.deepEqual(
    parseMailtoUrl(
      'mailto:alice%40example.com?to=bob%40example.com&cc=carol%40example.com&bcc=dave%40example.com&subject=Project%20update&body=First%20line%0ASecond%20line'
    ),
    {
      to: 'alice@example.com, bob@example.com',
      cc: 'carol@example.com',
      bcc: 'dave@example.com',
      subject: 'Project update',
      body: 'First line\nSecond line'
    }
  )
})

test('handles repeated, case-insensitive address headers', () => {
  assert.deepEqual(parseMailtoUrl('mailto:?CC=one%40example.com&cc=two%40example.com'), {
    to: '',
    cc: 'one@example.com, two@example.com',
    bcc: '',
    subject: '',
    body: ''
  })
})

test('preserves whitespace in message bodies', () => {
  assert.equal(parseMailtoUrl('mailto:test@example.com?body=%20hello%0A')?.body, ' hello\n')
})

test('rejects non-mailto and malformed URLs', () => {
  assert.equal(parseMailtoUrl('https://example.com'), null)
  assert.equal(parseMailtoUrl('mailto:invalid%escape'), null)
})
