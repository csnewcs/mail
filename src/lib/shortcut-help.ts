export type ShortcutHelpRow = {
  keys: string[]
  desc: string
}

export type ShortcutHelpGroup = {
  title: string
  rows: ShortcutHelpRow[]
}

export const shortcutHelpGroups: ShortcutHelpGroup[] = [
  {
    title: 'Navigation',
    rows: [
      { keys: ['?'], desc: 'Open keyboard shortcut help' },
      { keys: ['←', '→'], desc: 'Switch focus between mailbox sidebar, mail list, and back' },
      { keys: ['↑', '↓'], desc: 'Move selection up / down in the focused panel' },
      { keys: ['j', 'k'], desc: 'Move selection down / up in the mail list' },
      { keys: ['Enter'], desc: 'Open focused message' },
      { keys: ['u', 'Esc'], desc: 'Go back to mail list from a message' }
    ]
  },
  {
    title: 'Mail list',
    rows: [
      { keys: ['x'], desc: 'Toggle selection on the focused message' },
      { keys: ['* a'], desc: 'Select all visible messages' },
      { keys: ['* n'], desc: 'Clear selection' },
      { keys: ['e'], desc: 'Archive focused message (or all selected)' },
      { keys: ['#'], desc: 'Move focused message to trash (or all selected)' },
      { keys: ['c'], desc: 'Compose a new message' },
      { keys: ['Esc'], desc: 'Clear selection' }
    ]
  },
  {
    title: 'Reading a message',
    rows: [
      { keys: ['r'], desc: 'Reply' },
      { keys: ['a'], desc: 'Reply all' },
      { keys: ['f'], desc: 'Forward' },
      { keys: ['e'], desc: 'Archive' },
      { keys: ['#'], desc: 'Move to trash' },
      { keys: ['u'], desc: 'Back to list' }
    ]
  },
  {
    title: 'Composer',
    rows: [{ keys: ['Esc'], desc: 'Minimise composer (draft is auto-saved)' }]
  },
  {
    title: 'Mouse',
    rows: [
      { keys: ['Click checkbox'], desc: 'Select a message' },
      { keys: ['Shift + click checkbox'], desc: 'Select a range of messages' }
    ]
  }
]
