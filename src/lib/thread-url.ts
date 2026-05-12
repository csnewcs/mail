// Thread IDs are email Message-IDs and can contain slashes. Double-encoding
// prevents the server from normalising %2F into a path separator.
export function encodeThreadId(id: string): string {
  return encodeURIComponent(encodeURIComponent(id))
}

// Must be called on params.threadId after SvelteKit's automatic decode.
export function decodeThreadId(param: string): string {
  return decodeURIComponent(param)
}
