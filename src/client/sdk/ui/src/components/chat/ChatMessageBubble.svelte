<script lang="ts">
import type { ChatMessage, ChatSenderRole } from '@sdk/core';

interface Props {
  message: ChatMessage;
  currentUserRole: 'client' | 'collaborator' | 'operations';
}

let { message, currentUserRole }: Props = $props();

const isSelf = $derived(message.sender === currentUserRole);
const isSystem = $derived(message.sender === 'system');
const isOps = $derived(message.sender === 'operations');
</script>

{#if isSystem}
  <div class="flex justify-center my-2">
    <div class="px-3 py-1 rounded-full bg-base-200 border border-base-300 text-[10px] text-base-content/70 font-mono flex items-center gap-1.5 shadow-sm">
      <span>⚙️</span>
      <span>{message.text}</span>
    </div>
  </div>
{:else}
  <div class="chat {isSelf ? 'chat-end' : 'chat-start'}">
    <div class="chat-header text-[10px] opacity-70 mb-0.5 font-mono flex items-center gap-1">
      <span class="font-bold">{message.senderName || message.sender}</span>
      {#if isOps}
        <span class="badge badge-accent badge-xs text-[9px] font-bold">Mesa de Control</span>
      {/if}
      <span class="opacity-50 text-[9px]">• {message.timestamp}</span>
    </div>

    <div class="chat-bubble text-xs leading-relaxed {isSelf ? 'chat-bubble-primary text-primary-content font-medium' : isOps ? 'chat-bubble-accent text-accent-content font-medium' : 'bg-base-200 text-base-content'}">
      {message.text}
      {#if message.masked}
        <span class="badge badge-warning badge-xs block mt-1 font-mono text-[9px] font-bold text-warning-content">
          🛡️ Contenido moderado por Escrow
        </span>
      {/if}
    </div>

    <div class="chat-footer opacity-60 text-[10px] mt-0.5">
      {isSelf ? '✓✓ Entregado' : ''}
    </div>
  </div>
{/if}
