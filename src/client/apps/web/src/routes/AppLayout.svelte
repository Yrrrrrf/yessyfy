<script lang="ts">
import type { Snippet } from 'svelte';

let { children }: { children: Snippet } = $props();
</script>

<div class="min-h-screen bg-base-100 text-base-content flex flex-col font-sans selection:bg-primary selection:text-white">
  <div class="flex-1 w-full flex flex-col relative">
    {@render children()}
  </div>
</div>
