<script lang="ts">
import { visionStore } from '../lib/visionStore.svelte.ts';
import KanbanBoard from '../lib/components/KanbanBoard.svelte';
import SpatialDispatchMap from '../lib/components/SpatialDispatchMap.svelte';
import ConversationalTree from '../lib/components/ConversationalTree.svelte';
import QaAuditInspector from '../lib/components/QaAuditInspector.svelte';
import EscrowManagementConsole from '../lib/components/EscrowManagementConsole.svelte';
</script>

<div class="p-6 space-y-6">
  {#if visionStore.activeConsole === 'kanban'}
    <KanbanBoard />
  {:else if visionStore.activeConsole === 'dispatch'}
    <SpatialDispatchMap />
  {:else if visionStore.activeConsole === 'tree'}
    <ConversationalTree />
  {:else if visionStore.activeConsole === 'qa'}
    <QaAuditInspector />
  {:else if visionStore.activeConsole === 'escrow'}
    <EscrowManagementConsole />
  {/if}
</div>
