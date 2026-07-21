<script lang="ts">
  import { onMount } from 'svelte'
  import { resolve } from '$app/paths'
  import { Download, KeyRound, Trash2, Upload } from 'lucide-svelte'
  import { errorMessageFromUnknown, readErrorMessage } from '$lib/http'

  type KeySummary = {
    id: number
    fingerprint: string
    name: string
    email: string
    userIds: string[]
    isOwn: boolean
    isDefault: boolean
    hasPrivateKey: boolean
    createdAt: string
  }

  let keys = $state<KeySummary[]>([])
  let loading = $state(true)
  let working = $state(false)
  let errorMessage = $state<string | null>(null)
  let name = $state('')
  let email = $state('')
  let passphrase = $state('')
  let algorithm = $state<'curve25519' | 'rsa4096'>('curve25519')
  let armoredKey = $state('')
  let importPassphrase = $state('')
  let importAsOwn = $state(true)

  async function loadKeys() {
    loading = true
    try {
      const response = await fetch('/api/openpgp/keys')
      if (!response.ok)
        throw new Error(await readErrorMessage(response, 'Unable to load OpenPGP keys.'))
      keys = ((await response.json()) as { keys?: KeySummary[] }).keys ?? []
    } catch (error) {
      errorMessage = errorMessageFromUnknown(error, 'Unable to load OpenPGP keys.')
    } finally {
      loading = false
    }
  }

  async function submit(payload: Record<string, unknown>) {
    working = true
    errorMessage = null
    try {
      const response = await fetch('/api/openpgp/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok)
        throw new Error(await readErrorMessage(response, 'Unable to save OpenPGP key.'))
      await loadKeys()
      return true
    } catch (error) {
      errorMessage = errorMessageFromUnknown(error, 'Unable to save OpenPGP key.')
      return false
    } finally {
      working = false
    }
  }

  async function generate() {
    if (await submit({ action: 'generate', name, email, passphrase, algorithm })) passphrase = ''
  }

  async function importKey() {
    if (
      await submit({
        action: 'import',
        armoredKey,
        passphrase: importPassphrase,
        isOwn: importAsOwn,
        makeDefault: importAsOwn
      })
    ) {
      armoredKey = ''
      importPassphrase = ''
    }
  }

  async function readKeyFile(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0]
    if (file) armoredKey = await file.text()
  }

  async function removeKey(id: number) {
    working = true
    errorMessage = null
    try {
      const response = await fetch(`/api/openpgp/keys/${id}`, { method: 'DELETE' })
      if (!response.ok)
        throw new Error(await readErrorMessage(response, 'Unable to delete OpenPGP key.'))
      await loadKeys()
    } catch (error) {
      errorMessage = errorMessageFromUnknown(error, 'Unable to delete OpenPGP key.')
    } finally {
      working = false
    }
  }

  onMount(() => void loadKeys())
</script>

<div class="space-y-5">
  <div>
    <h2 class="text-sm font-semibold tracking-widest text-zinc-500 uppercase">OpenPGP keys</h2>
    <p class="mt-1 text-sm text-zinc-500">
      Generate or import your signing/decryption key. Import recipient public keys to encrypt mail
      to them.
    </p>
  </div>
  {#if errorMessage}<p
      class="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
    >
      {errorMessage}
    </p>{/if}
  <div class="rounded-lg border border-white/8 bg-white/3 p-4">
    <div class="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-200">
      <KeyRound size={15} /> Generate a key pair
    </div>
    <div class="grid gap-3 sm:grid-cols-2">
      <label class="text-xs text-zinc-400"
        >Name<input
          bind:value={name}
          class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
        /></label
      >
      <label class="text-xs text-zinc-400"
        >Email<input
          type="email"
          bind:value={email}
          class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
        /></label
      >
      <label class="text-xs text-zinc-400"
        >Algorithm<select
          bind:value={algorithm}
          class="mt-1 w-full rounded-lg border border-white/10 bg-[#17171c] px-3 py-2 text-sm text-zinc-200"
          ><option value="curve25519">Curve25519 (recommended)</option><option value="rsa4096"
            >RSA 4096</option
          ></select
        ></label
      >
      <label class="text-xs text-zinc-400"
        >Key passphrase<input
          type="password"
          bind:value={passphrase}
          autocomplete="new-password"
          class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
        /></label
      >
    </div>
    <button
      type="button"
      disabled={working || !name.trim() || !email.trim()}
      onclick={() => void generate()}
      class="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >{working ? 'Working...' : 'Generate key'}</button
    >
  </div>
  <div class="rounded-lg border border-white/8 bg-white/3 p-4">
    <div class="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-200">
      <Upload size={15} /> Import a key
    </div>
    <input
      type="file"
      accept=".asc,application/pgp-keys,text/plain"
      onchange={(event) => void readKeyFile(event)}
      class="mb-3 block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-zinc-200"
    />
    <textarea
      bind:value={armoredKey}
      rows="5"
      placeholder="-----BEGIN PGP PRIVATE KEY BLOCK-----"
      class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
    ></textarea>
    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      <label class="text-xs text-zinc-400"
        >Passphrase (private keys only)<input
          type="password"
          bind:value={importPassphrase}
          autocomplete="current-password"
          class="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
        /></label
      >
      <label class="flex items-center gap-2 self-end py-2 text-sm text-zinc-300"
        ><input type="checkbox" bind:checked={importAsOwn} class="accent-blue-500" /> This is my key</label
      >
    </div>
    <button
      type="button"
      disabled={working || !armoredKey.trim()}
      onclick={() => void importKey()}
      class="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >Import key</button
    >
  </div>
  <div class="space-y-2">
    {#if loading}<p class="text-sm text-zinc-500">Loading keys...</p>
    {:else if keys.length === 0}<p
        class="rounded-lg border border-dashed border-white/10 p-4 text-sm text-zinc-500"
      >
        No OpenPGP keys configured.
      </p>
    {:else}{#each keys as key (key.id)}
        <div
          class="flex flex-col gap-3 rounded-lg border border-white/8 bg-white/3 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-zinc-200">
              {key.userIds[0] || key.email || 'OpenPGP key'}
            </p>
            <p class="mt-1 font-mono text-[11px] break-all text-zinc-500">{key.fingerprint}</p>
            <div class="mt-1 flex gap-2 text-[11px] text-zinc-500">
              <span>{key.hasPrivateKey ? 'Private + public' : 'Public only'}</span
              >{#if key.isDefault}<span class="text-emerald-400">Default signing key</span>{/if}
            </div>
          </div>
          <div class="flex shrink-0 gap-2">
            <a
              href={resolve('/api/openpgp/keys/[id]/public', { id: String(key.id) })}
              class="rounded-lg border border-white/10 p-2 text-zinc-400 hover:bg-white/8 hover:text-zinc-200"
              aria-label="Download public key"><Download size={14} /></a
            ><button
              type="button"
              disabled={working}
              onclick={() => void removeKey(key.id)}
              class="rounded-lg border border-white/10 p-2 text-zinc-400 hover:bg-white/8 hover:text-rose-400 disabled:opacity-50"
              aria-label="Delete key"><Trash2 size={14} /></button
            >
          </div>
        </div>
      {/each}{/if}
  </div>
</div>
