<script lang="ts">
interface Props {
  message: string;
}

let { message }: Props = $props();
</script>

<div class="p-3 bg-warning/20 border-t border-warning/40 text-xs text-warning-content font-medium">
  {message}
</div>
