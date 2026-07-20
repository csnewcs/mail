<script lang="ts">
  type Props = {
    spfStatus?: string | null
    dkimStatus?: string | null
    dmarcStatus?: string | null
    authenticationTrusted?: boolean
    compact?: boolean
  }

  let {
    spfStatus = null,
    dkimStatus = null,
    dmarcStatus = null,
    authenticationTrusted = false,
    compact = false
  }: Props = $props()

  const checks = $derived([
    { label: 'SPF', status: spfStatus },
    { label: 'DKIM', status: dkimStatus },
    { label: 'DMARC', status: dmarcStatus }
  ])

  function tone(status: string | null) {
    if (!authenticationTrusted) return 'border-white/8 bg-white/3 text-zinc-400'
    if (status === 'pass') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
    if (status === 'fail' || status === 'permerror') {
      return 'border-rose-400/20 bg-rose-400/10 text-rose-300'
    }
    if (status === 'softfail' || status === 'temperror' || status === 'policy') {
      return 'border-amber-400/20 bg-amber-400/10 text-amber-300'
    }
    return 'border-white/8 bg-white/3 text-zinc-400'
  }

  function statusLabel(status: string | null) {
    if (!status) return 'unknown'
    if (!authenticationTrusted) return 'unverified'
    return status.replace('error', ' error')
  }
</script>

<div
  class="flex flex-wrap items-center gap-1.5"
  aria-label="Receiver-reported email authentication results"
  title={authenticationTrusted
    ? 'Authentication results from a configured trusted receiving service'
    : 'Authentication header claims are not from a configured trusted service'}
>
  {#each checks as check (check.label)}
    <span
      class={[
        'inline-flex items-center rounded-full border font-medium uppercase',
        compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
        tone(check.status)
      ]}
    >
      {check.label}
      {statusLabel(check.status)}
    </span>
  {/each}
</div>
