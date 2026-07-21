export function normalizeOpenAIApiKey(value: string) {
  return value.replace(/[^\x21-\x7e]/g, '')
}
