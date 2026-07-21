export function startBackgroundAction<Key>(
  actions: Map<Key, Promise<void>>,
  key: Key,
  action: () => Promise<unknown>,
  onError: (error: unknown) => void
) {
  if (actions.has(key)) return false

  const running = Promise.resolve()
    .then(action)
    .then(() => undefined)
    .catch(onError)
    .finally(() => {
      actions.delete(key)
    })
  actions.set(key, running)
  return true
}

export async function waitForBackgroundActions(actions: Map<unknown, Promise<void>>) {
  while (actions.size > 0) {
    await Promise.allSettled([...actions.values()])
  }
}
