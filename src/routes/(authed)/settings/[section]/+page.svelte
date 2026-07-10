<script lang="ts">
  import SettingsPage from '../+page.svelte'

  let { data } = $props()
</script>

<SettingsPage data={data as never} />
