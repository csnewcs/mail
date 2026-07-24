import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareRemoteContent } from './remote-content.ts'

const remoteHtml = '<p>Hello</p><img src="https://images.example/pixel.png">'
const blockedSettings = { blockRemoteContent: true, allowedSenders: [] }

test('allows remote content only for the message granted a one-time exception', () => {
  const allowedMessageIds = new Set([101])

  const allowed = prepareRemoteContent(remoteHtml, 'first@example.com', blockedSettings, {
    messageId: 101,
    allowedMessageIds
  })
  const otherMessage = prepareRemoteContent(remoteHtml, 'other@example.com', blockedSettings, {
    messageId: 102,
    allowedMessageIds
  })

  assert.equal(allowed.blockedCount, 0)
  assert.equal(allowed.html, remoteHtml)
  assert.equal(otherMessage.blockedCount, 1)
  assert.match(
    otherMessage.html,
    /data-remote-content-blocked-src="https:\/\/images\.example\/pixel\.png"/
  )
})

test('allows remote content only for messages from a trusted sender', () => {
  const settings = { blockRemoteContent: true, allowedSenders: ['trusted@example.com'] }

  const trustedSender = prepareRemoteContent(remoteHtml, 'Trusted <trusted@example.com>', settings)
  const otherSender = prepareRemoteContent(remoteHtml, 'other@example.com', settings)

  assert.equal(trustedSender.blockedCount, 0)
  assert.equal(trustedSender.html, remoteHtml)
  assert.equal(otherSender.blockedCount, 1)
  assert.match(
    otherSender.html,
    /data-remote-content-blocked-src="https:\/\/images\.example\/pixel\.png"/
  )
})
