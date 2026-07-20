import assert from 'node:assert/strict'
import test from 'node:test'
import { outgoingMessageBody } from './outgoing-message.ts'

test('wraps HTML fragments and creates a plain-text alternative', () => {
  const body = outgoingMessageBody('<p>Hello <strong>mail</strong>.</p><p>Second line.</p>')

  assert.match(body.html ?? '', /^<!doctype html><html>/i)
  assert.match(body.html ?? '', /<body><p>Hello/)
  assert.equal(body.text, 'Hello mail.\n\nSecond line.')
})

test('preserves complete HTML documents', () => {
  const html = '<html><body><p>Complete</p></body></html>'
  assert.deepEqual(outgoingMessageBody(html), { html, text: 'Complete' })
})

test('does not mistake comments or script content for an HTML document element', () => {
  for (const fragment of [
    '<!-- <html> --><p>Comment case</p>',
    '<script>const tag = "<html>"</script><p>Script case</p>'
  ]) {
    assert.match(outgoingMessageBody(fragment).html ?? '', /^<!doctype html><html>/i)
  }
})

test('keeps a plain-text MIME alternative for HTML without visible text', () => {
  assert.equal(outgoingMessageBody('<div></div>').text, ' ')
})
