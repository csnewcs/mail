import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { evaluateOidcSubjectClaim } from './oidc-access-policy.ts'

describe('evaluateOidcSubjectClaim', () => {
  it('allows the first subject to claim an unbound endpoint', () => {
    assert.deepEqual(
      evaluateOidcSubjectClaim({ subject: null, discoveryUrl: null }, 'issuer-a', '1'),
      {
        allowed: true,
        endpointChanged: false,
        nextBinding: { discoveryUrl: 'issuer-a', subject: '1' }
      }
    )
  })

  it('only allows the subject already bound to an endpoint', () => {
    const binding = { discoveryUrl: 'issuer-a', subject: '1' }
    assert.equal(evaluateOidcSubjectClaim(binding, 'issuer-a', '1').allowed, true)
    assert.equal(evaluateOidcSubjectClaim(binding, 'issuer-a', '2').allowed, false)
  })

  it('allows a new first subject after the endpoint changes', () => {
    assert.deepEqual(
      evaluateOidcSubjectClaim({ discoveryUrl: 'issuer-a', subject: '1' }, 'issuer-b', '2'),
      {
        allowed: true,
        endpointChanged: true,
        nextBinding: { discoveryUrl: 'issuer-b', subject: '2' }
      }
    )
  })
})
