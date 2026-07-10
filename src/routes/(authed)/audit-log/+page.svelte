<script lang="ts">
  import { FileSearch, ShieldCheck, UserRound, Wifi } from 'lucide-svelte'

  type AuditLog = {
    id: number
    action: string
    entityType: string
    entityId: string | null
    summary: string
    metadata: string
    actorEmail: string | null
    ipAddress: string | null
    userAgent: string | null
    createdAt: string
  }

  type Props = {
    data: {
      logs: AuditLog[]
    }
  }

  let { data }: Props = $props()

  const logs = $derived(data.logs)
  const securityLogs = $derived(logs.filter((log) => log.action.startsWith('security.')))

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value))
  }

  function formatMetadata(value: string) {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value || '{}'
    }
  }

  function actionTone(action: string) {
    if (action.startsWith('security.'))
      return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
    if (action.includes('delete') || action.includes('remove')) {
      return 'border-rose-400/20 bg-rose-400/10 text-rose-200'
    }
    if (action.includes('settings') || action.includes('setup')) {
      return 'border-blue-400/20 bg-blue-400/10 text-blue-200'
    }
    return 'border-zinc-400/20 bg-zinc-400/10 text-zinc-200'
  }
</script>

<svelte:head>
  <title>Security Audit Log · Mail</title>
</svelte:head>

<div class="h-full overflow-y-auto p-4 sm:p-6 lg:p-10">
  <div class="mx-auto max-w-6xl space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div
          class="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200"
        >
          <ShieldCheck size={13} />
          Security
        </div>
        <h1 class="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Security Audit Log
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          Review recent security and administrative events, including setup changes, actors, IP
          addresses, and redacted metadata.
        </p>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:w-72">
        <div class="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p class="text-xs text-zinc-500">Total events</p>
          <p class="mt-1 text-2xl font-semibold text-white">{logs.length}</p>
        </div>
        <div class="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p class="text-xs text-emerald-200/70">Security events</p>
          <p class="mt-1 text-2xl font-semibold text-emerald-100">{securityLogs.length}</p>
        </div>
      </div>
    </div>

    {#if logs.length === 0}
      <div class="rounded-3xl border border-white/8 bg-white/[0.03] p-10 text-center">
        <FileSearch size={34} class="mx-auto text-zinc-600" />
        <h2 class="mt-4 text-base font-semibold text-white">No audit events yet</h2>
        <p class="mt-2 text-sm text-zinc-500">Security events will appear here when they occur.</p>
      </div>
    {:else}
      <div class="overflow-hidden rounded-3xl border border-white/8 bg-[#101116]">
        <div
          class="hidden grid-cols-[180px_minmax(0,1fr)_180px_150px] gap-4 border-b border-white/8 px-5 py-3 text-xs font-semibold tracking-widest text-zinc-500 uppercase lg:grid"
        >
          <span>Time</span>
          <span>Event</span>
          <span>Actor</span>
          <span>Source</span>
        </div>

        <div class="divide-y divide-white/6">
          {#each logs as log (log.id)}
            <article class="grid gap-4 px-5 py-4 lg:grid-cols-[180px_minmax(0,1fr)_180px_150px]">
              <div>
                <p class="text-sm font-medium text-zinc-200">{formatDate(log.createdAt)}</p>
                <p class="mt-1 text-xs text-zinc-600">#{log.id}</p>
              </div>

              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class={`rounded-full border px-2 py-0.5 text-xs ${actionTone(log.action)}`}>
                    {log.action}
                  </span>
                  <span class="rounded-full bg-white/6 px-2 py-0.5 text-xs text-zinc-400">
                    {log.entityType}{log.entityId ? `:${log.entityId}` : ''}
                  </span>
                </div>
                <p class="mt-2 text-sm leading-6 text-zinc-200">{log.summary}</p>
                <details class="mt-3 rounded-xl border border-white/8 bg-black/20 p-3">
                  <summary class="cursor-pointer text-xs font-medium text-zinc-400">
                    Metadata
                  </summary>
                  <pre
                    class="mt-3 max-h-56 overflow-auto text-xs leading-5 whitespace-pre-wrap text-zinc-500">{formatMetadata(
                      log.metadata
                    )}</pre>
                </details>
              </div>

              <div class="min-w-0 text-sm text-zinc-400">
                <div class="flex items-center gap-2">
                  <UserRound size={14} class="shrink-0 text-zinc-600" />
                  <span class="truncate">{log.actorEmail ?? 'System'}</span>
                </div>
                {#if log.userAgent}
                  <p class="mt-2 line-clamp-2 text-xs break-all text-zinc-600">{log.userAgent}</p>
                {/if}
              </div>

              <div class="min-w-0 text-sm text-zinc-400">
                <div class="flex items-center gap-2">
                  <Wifi size={14} class="shrink-0 text-zinc-600" />
                  <span class="truncate">{log.ipAddress ?? 'Unknown'}</span>
                </div>
              </div>
            </article>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
