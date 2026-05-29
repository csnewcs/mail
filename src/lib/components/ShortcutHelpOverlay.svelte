<script lang="ts">
  import { X } from 'lucide-svelte'
  import { shortcutHelpGroups } from '$lib/shortcut-help'

  type Props = {
    open: boolean
    onclose: () => void
  }

  let { open, onclose }: Props = $props()
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="presentation">
    <button
      type="button"
      class="absolute inset-0 bg-black/70 backdrop-blur-sm"
      aria-label="Close keyboard shortcut help"
      onclick={onclose}
    ></button>

    <div
      class="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/95 shadow-2xl ring-1 shadow-black/60 ring-black/20"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-help-title"
    >
      <div class="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4 sm:px-6">
        <div>
          <p class="text-xs font-semibold tracking-widest text-blue-300 uppercase">Keyboard</p>
          <h2 id="shortcut-help-title" class="mt-1 text-lg font-semibold text-white">
            Shortcut help
          </h2>
          <p class="mt-1 text-sm text-zinc-400">
            Press
            <kbd
              class="rounded border border-white/15 bg-white/8 px-1.5 py-0.5 font-mono text-xs text-zinc-300"
              >?</kbd
            > anytime outside a text field to open this panel.
          </p>
        </div>
        <button
          type="button"
          class="rounded-xl border border-white/8 bg-white/4 p-2 text-zinc-400 transition hover:bg-white/8 hover:text-zinc-100"
          aria-label="Close keyboard shortcut help"
          onclick={onclose}
        >
          <X size={18} />
        </button>
      </div>

      <div class="overflow-y-auto p-5 sm:p-6">
        <div class="grid gap-4 md:grid-cols-2">
          {#each shortcutHelpGroups as group (group.title)}
            <div class="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <h3 class="mb-3 text-xs font-semibold tracking-widest text-zinc-500 uppercase">
                {group.title}
              </h3>
              <div class="space-y-2.5">
                {#each group.rows as row, rowIndex (rowIndex)}
                  <div class="flex items-start justify-between gap-4">
                    <span class="text-sm leading-6 text-zinc-300">{row.desc}</span>
                    <span class="flex shrink-0 flex-wrap justify-end gap-1.5">
                      {#each row.keys as key, keyIndex (keyIndex)}
                        <kbd
                          class="rounded-md border border-white/15 bg-white/6 px-2 py-0.5 font-mono text-xs text-zinc-300"
                          >{key}</kbd
                        >
                      {/each}
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}
