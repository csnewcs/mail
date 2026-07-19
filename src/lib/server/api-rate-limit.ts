const WINDOW_MS = 60_000
const MAX_REQUESTS = 120
const MAX_SEND_REQUESTS = 20

type Bucket = { startedAt: number; requests: number; sends: number }
const buckets = new Map<string, Bucket>()

function bucketFor(keyId: string, now: number) {
  let bucket = buckets.get(keyId)
  if (!bucket || now - bucket.startedAt >= WINDOW_MS) {
    bucket = { startedAt: now, requests: 0, sends: 0 }
    buckets.set(keyId, bucket)
  }
  return bucket
}

export function checkApiRateLimit(keyId: string, now = Date.now()) {
  const bucket = bucketFor(keyId, now)
  bucket.requests += 1
  return bucket.requests <= MAX_REQUESTS
}

export function checkApiSendRateLimit(keyId: string, now = Date.now()) {
  const bucket = bucketFor(keyId, now)
  bucket.sends += 1
  return bucket.sends <= MAX_SEND_REQUESTS
}
