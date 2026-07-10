const TRACKING_PIXEL_PATTERN =
  /<img\b(?=[^>]*(?:src\s*=\s*["']?(?:https?:)?\/\/|data-[^=]*=))(?=[^>]*(?:width\s*=\s*["']?1(?:px)?["']?|height\s*=\s*["']?1(?:px)?["']?|style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0|width\s*:\s*1px|height\s*:\s*1px)[^"']*["']))[^>]*>/gi
const OPENAI_TRACING_PATTERN =
  /(?:https?:)?\/\/(?:api\.)?openai\.com\b|\bopenai[_-]?(?:api|trace|tracking|tracker|beacon|pixel)\b|\bsk-[A-Za-z0-9_-]{20,}\b/gi
const STRIPE_TRACING_PATTERN =
  /(?:https?:)?\/\/(?:js|m|q|r|hooks)\.stripe\.(?:com|network)\b|\bstripe[_-]?(?:api|trace|tracking|tracker|beacon|pixel)\b|\b(?:pk|sk)_(?:live|test)_[A-Za-z0-9]{16,}\b/gi
const BEACON_URL_PATTERN =
  /(?:https?:)?\/\/[^\s"'<>]+(?:\/(?:track|tracking|tracker|pixel|beacon|open|read)(?:[/?#]|$)|[?&](?:track|tracking|tracker|pixel|beacon|open|read|recipient|message|campaign|mailing)[_-]?(?:id|token|uuid)?=)/gi

function matchRanges(value: string, pattern: RegExp) {
  return Array.from(value.matchAll(pattern), (match) => {
    const start = match.index ?? 0
    return { start, end: start + match[0].length }
  })
}

function countDistinctMatches(value: string, patterns: RegExp[]) {
  const ranges = patterns.flatMap((pattern) => matchRanges(value, pattern))
  ranges.sort((a, b) => a.start - b.start || b.end - a.end)

  let count = 0
  let coveredEnd = -1
  for (const range of ranges) {
    if (range.start < coveredEnd) continue
    count += 1
    coveredEnd = range.end
  }

  return count
}

export function countHtmlTracingCodes(html: string | null | undefined) {
  if (!html) return 0

  return countDistinctMatches(html, [
    TRACKING_PIXEL_PATTERN,
    OPENAI_TRACING_PATTERN,
    STRIPE_TRACING_PATTERN,
    BEACON_URL_PATTERN
  ])
}
