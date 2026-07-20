import { readErrorMessage } from '$lib/http'
import { READ_CONTROL_VERSION } from '$lib/push-control'

export type PushSetupStatus =
  | 'checking'
  | 'unsupported'
  | 'blocked'
  | 'unconfigured'
  | 'configured'
  | 'server-unconfigured'
  | 'disabled'
  | 'error'

function decodeApplicationServerKey(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
}

function subscriptionUsesKey(subscription: PushSubscription, publicKey: string) {
  const currentKey = subscription.options.applicationServerKey
  if (!currentKey) return false
  const current = new Uint8Array(currentKey)
  const expected = decodeApplicationServerKey(publicKey)
  return (
    current.length === expected.length && current.every((value, index) => value === expected[index])
  )
}

class PushNotificationsState {
  status = $state<PushSetupStatus>('checking')
  configuring = $state(false)
  private publicKey: string | null = null
  private registration: ServiceWorkerRegistration | null = null
  private subscription: PushSubscription | null = null
  private refreshPromise: Promise<void> | null = null

  private supported() {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    )
  }

  private async waitForServiceWorkerActivation() {
    const worker = this.registration?.installing ?? this.registration?.waiting
    if (!worker || worker.state === 'activated') return

    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(() => {
        worker.removeEventListener('statechange', handleStateChange)
        resolve()
      }, 2_000)
      const handleStateChange = () => {
        if (worker.state !== 'activated' && worker.state !== 'redundant') return
        window.clearTimeout(timeout)
        worker.removeEventListener('statechange', handleStateChange)
        resolve()
      }
      worker.addEventListener('statechange', handleStateChange)
    })
  }

  private async readControlVersion() {
    const worker = this.registration?.active
    if (!worker || typeof MessageChannel === 'undefined') return 0

    return new Promise<number>((resolve) => {
      const channel = new MessageChannel()
      const timeout = window.setTimeout(() => resolve(0), 500)
      channel.port1.onmessage = (event) => {
        window.clearTimeout(timeout)
        resolve(event.data?.readControlVersion === READ_CONTROL_VERSION ? READ_CONTROL_VERSION : 0)
      }
      worker.postMessage({ type: 'GET_PUSH_CAPABILITIES' }, [channel.port2])
    })
  }

  private async syncSubscription(subscription: PushSubscription) {
    const readControlVersion = await this.readControlVersion()
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...subscription.toJSON(), readControlVersion })
    })
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, 'Failed to register notifications.'))
    }
  }

  private async removeSubscription(subscription: PushSubscription) {
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    }).catch(() => undefined)
    await subscription.unsubscribe()
  }

  private async createSubscription() {
    if (!this.registration || !this.publicKey) {
      throw new Error('Notification setup is not ready.')
    }
    this.subscription = await this.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.publicKey
    })
  }

  private async refreshStatus() {
    this.status = 'checking'
    if (!this.supported()) {
      this.status = 'unsupported'
      return
    }
    if (Notification.permission === 'denied') {
      this.status = 'blocked'
      return
    }

    try {
      const response = await fetch('/api/push/vapid-public-key')
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to check notification setup.'))
      }
      const payload = (await response.json()) as { publicKey?: string | null }
      this.publicKey = payload.publicKey ?? null
      if (!this.publicKey) {
        this.status = 'server-unconfigured'
        return
      }

      this.registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready
      await this.registration.update().catch(() => undefined)
      await this.waitForServiceWorkerActivation()
      this.subscription = await this.registration.pushManager.getSubscription()
      if (this.subscription && !subscriptionUsesKey(this.subscription, this.publicKey)) {
        await this.removeSubscription(this.subscription)
        this.subscription = null
      }

      if (!this.subscription && Notification.permission === 'granted') {
        await this.createSubscription()
      }
      if (!this.subscription) {
        this.status = 'unconfigured'
        return
      }

      await this.syncSubscription(this.subscription)
      this.status = 'configured'
    } catch {
      this.status = 'error'
    }
  }

  async refresh(force = false) {
    if (this.refreshPromise) {
      const activeRefresh = this.refreshPromise
      if (!force) return activeRefresh
      await activeRefresh
      if (this.refreshPromise === activeRefresh) this.refreshPromise = null
    }
    this.refreshPromise = this.refreshStatus()
    try {
      await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  disable() {
    this.publicKey = null
    this.registration = null
    this.subscription = null
    this.status = 'disabled'
  }

  async enable() {
    if (this.configuring) return false
    if (!this.supported()) {
      this.status = 'unsupported'
      return false
    }
    if (!this.publicKey || !this.registration) {
      throw new Error('Notification setup is not ready. Retry the setup check.')
    }

    this.configuring = true
    try {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          this.status = permission === 'denied' ? 'blocked' : 'unconfigured'
          return false
        }
      } else if (Notification.permission !== 'granted') {
        this.status = 'blocked'
        return false
      }

      if (!this.subscription) {
        await this.createSubscription()
      }

      const subscription = this.subscription
      if (!subscription) throw new Error('Notification subscription was not created.')
      await this.syncSubscription(subscription)
      this.status = 'configured'
      return true
    } catch (error) {
      this.status = 'unconfigured'
      throw error
    } finally {
      this.configuring = false
    }
  }
}

export const pushNotifications = new PushNotificationsState()
