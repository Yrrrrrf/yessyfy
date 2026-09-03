<script lang="ts">
export interface ChatMessage {
  id: string;
  sender: 'client' | 'collaborator';
  text: string;
  timestamp: string;
  masked: boolean;
}

interface Props {
  message: ChatMessage;
  currentUserRole: 'client' | 'collaborator';
}

let { message, currentUserRole }: Props = $props();

const isSelf = $derived(message.sender === currentUserRole);
</script>

<div class="chat {isSelf ? 'chat-end' : 'chat-start'}">
  <div class="chat-header text-[10px] opacity-50 mb-0.5 font-mono">
    {message.timestamp}
  </div>
  <div class="chat-bubble text-xs leading-relaxed {isSelf ? 'chat-bubble-primary text-white' : 'bg-base-200 text-base-content'}">
    {message.text}
    {#if message.masked}
      <span class="badge badge-warning badge-xs block mt-1 font-mono text-[9px]">
        Contenido moderado
      </span>
    {/if}
  </div>
  <div class="chat-footer opacity-50 text-[10px]">
    {isSelf ? '✓✓ Leído' : ''}
  </div>
</div>
