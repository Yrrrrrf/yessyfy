<script lang="ts">
  import {
    Wrench,
    Zap,
    KeyRound,
    Sprout,
    House,
    BrickWall,
  } from "@lucide/svelte";
  let { category, size = 28 }: { category: string; size?: number } = $props();
</script>

<span aria-hidden="true"
  >{#if category === "plomeria"}<Wrench
      {size}
    />{:else if category === "electricidad"}<Zap
      {size}
    />{:else if category === "cerrajeria"}<KeyRound
      {size}
    />{:else if category === "jardineria"}<Sprout
      {size}
    />{:else if category === "albanileria"}<BrickWall {size} />{:else}<House
      {size}
    />{/if}</span
>
