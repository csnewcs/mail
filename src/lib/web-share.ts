import type { ComposeFields } from '$lib/composer.svelte'
import type { ShareAction } from '$lib/share-action'

export type ShareContent = {
  title?: string
  text?: string
  url: string
}

type WebShareNavigator = {
  share?: (data: ShareData) => Promise<void>
  canShare?: (data: ShareData) => boolean
  clipboard: { writeText: (value: string) => Promise<void> }
}

export type ShareContentResult = 'shared' | 'copied' | 'cancelled'

export async function shareContent(
  data: ShareContent,
  webNavigator: WebShareNavigator,
  action: ShareAction = 'native-share'
): Promise<ShareContentResult> {
  if (action === 'copy-url') {
    await webNavigator.clipboard.writeText(data.url)
    return 'copied'
  }

  const canUseNativeShare =
    typeof webNavigator.share === 'function' &&
    (typeof webNavigator.canShare !== 'function' || webNavigator.canShare(data))

  if (canUseNativeShare) {
    try {
      await webNavigator.share!(data)
      return 'shared'
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') return 'cancelled'
    }
  }

  await webNavigator.clipboard.writeText(data.url)
  return 'copied'
}

export function parseShareTarget(url: URL): ComposeFields | null {
  const hasShareData = ['share-title', 'share-text', 'share-url'].some((name) =>
    url.searchParams.has(name)
  )
  if (!hasShareData) return null

  const subject = url.searchParams.get('share-title') ?? ''
  const text = url.searchParams.get('share-text') ?? ''
  const sharedUrl = url.searchParams.get('share-url')?.trim() ?? ''
  const body = [text, sharedUrl].filter(Boolean).join('\n\n')

  if (!subject && !body) return null
  return { subject, body }
}
