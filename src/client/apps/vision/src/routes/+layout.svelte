<script lang="ts">
import type {Snippet} from 'svelte';
import ProductShell from '../../../../sdk/ui/src/product/ProductShell.svelte';
import '../../../../sdk/ui/src/product/style.css';
let {children}:{children:Snippet}=$props();
</script>
<ProductShell surface="vision">{@render children()}</ProductShell>
