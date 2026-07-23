export const SHARE_ACTION_VALUES = ['native-share', 'copy-url'] as const

export type ShareAction = (typeof SHARE_ACTION_VALUES)[number]

export const DEFAULT_SHARE_CLICK_ACTION: ShareAction = 'native-share'
export const DEFAULT_SHARE_SHIFT_CLICK_ACTION: ShareAction = 'copy-url'

export function isShareAction(value: unknown): value is ShareAction {
  return SHARE_ACTION_VALUES.some((action) => action === value)
}

export function normalizeShareAction(value: unknown, fallback: ShareAction): ShareAction {
  return isShareAction(value) ? value : fallback
}

export function shareActionForClick(
  shiftKey: boolean,
  clickAction: ShareAction,
  shiftClickAction: ShareAction
): ShareAction {
  return shiftKey ? shiftClickAction : clickAction
}
