export type MailAuthenticationStatus =
  | 'pass'
  | 'fail'
  | 'softfail'
  | 'neutral'
  | 'none'
  | 'temperror'
  | 'permerror'
  | 'policy'

type HeaderLine = { key: string; line: string }

function normalizeStatus(value: string | undefined): MailAuthenticationStatus | null {
  const normalized = value?.trim().toLowerCase()
  if (
    normalized === 'pass' ||
    normalized === 'fail' ||
    normalized === 'softfail' ||
    normalized === 'neutral' ||
    normalized === 'none' ||
    normalized === 'temperror' ||
    normalized === 'permerror' ||
    normalized === 'policy'
  ) {
    return normalized
  }
  return null
}

function methodStatus(value: string, method: 'spf' | 'dkim' | 'dmarc') {
  const clauses: string[] = []
  let clause = ''
  let quoted = false
  let commentDepth = 0
  let escaped = false
  for (const character of value) {
    if (escaped) {
      escaped = false
      continue
    }
    if (character === '\\' && (quoted || commentDepth > 0)) {
      escaped = true
      continue
    }
    if (character === '"' && commentDepth === 0) quoted = !quoted
    else if (!quoted && character === '(') commentDepth += 1
    else if (!quoted && character === ')' && commentDepth > 0) commentDepth -= 1

    if (character === ';' && !quoted && commentDepth === 0) {
      clauses.push(clause)
      clause = ''
    } else if (!quoted && commentDepth === 0) {
      clause += character
    }
  }
  clauses.push(clause)

  for (const candidate of clauses) {
    const match = candidate.trim().match(new RegExp(`^${method}\\s*=\\s*([a-z]+)`, 'i'))
    const status = normalizeStatus(match?.[1])
    if (status) return status
  }
  return null
}

export function parseMailAuthentication(
  headerLines: readonly HeaderLine[],
  trustedAuthservIds: readonly string[] = []
) {
  const authenticationResults = headerLines.find(
    (header) => header.key.toLowerCase() === 'authentication-results'
  )?.line
  const authservId = authenticationResults
    ?.match(/^[^:]+:\s*([^;\s]+)/)?.[1]
    ?.trim()
    .toLowerCase()
  const authenticationTrusted = Boolean(
    authservId &&
    trustedAuthservIds.some((trusted) => {
      const normalized = trusted.trim().toLowerCase()
      return normalized.startsWith('*.')
        ? authservId.endsWith(normalized.slice(1))
        : authservId === normalized
    })
  )

  return {
    spfStatus: authenticationResults ? methodStatus(authenticationResults, 'spf') : null,
    dkimStatus: authenticationResults ? methodStatus(authenticationResults, 'dkim') : null,
    dmarcStatus: authenticationResults ? methodStatus(authenticationResults, 'dmarc') : null,
    authservId: authservId ?? null,
    authenticationTrusted
  }
}
