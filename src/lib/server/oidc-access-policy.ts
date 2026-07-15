export type OidcSubjectBinding = {
  subject: string | null
  discoveryUrl: string | null
}

export function evaluateOidcSubjectClaim(
  binding: OidcSubjectBinding,
  discoveryUrl: string,
  subject: string
) {
  const endpointChanged = binding.discoveryUrl !== null && binding.discoveryUrl !== discoveryUrl
  const shouldClaim = binding.discoveryUrl !== discoveryUrl || binding.subject === null

  return {
    allowed: shouldClaim || binding.subject === subject,
    endpointChanged,
    nextBinding: shouldClaim ? { discoveryUrl, subject } : binding
  }
}
