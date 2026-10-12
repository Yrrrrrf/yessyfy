<script lang="ts">
interface Props {
  replies: string[];
  onSelect: (reply: string) => void;
}

let { replies, onSelect }: Props = $props();
</script>

<div class="p-2 border-t border-base-300 bg-base-200/40 flex gap-1.5 overflow-x-auto">
  {#each replies as reply}
    <button
      type="button"
      class="btn btn-xs rounded-full btn-ghost border border-base-300 text-[11px] whitespace-nowrap"
      onclick={() => onSelect(reply)}
    >
      {reply}
    </button>
  {/each}
</div>



