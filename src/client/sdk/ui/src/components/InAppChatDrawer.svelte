<script lang="ts">
import { chatStore } from '@sdk/state';
import ChatMessageBubble from './chat/ChatMessageBubble.svelte';
import QuickReplyChips from './chat/QuickReplyChips.svelte';
import AntiDisintermediationAlert from './chat/AntiDisintermediationAlert.svelte';

interface Props {
  open: boolean;
  jobCode: string;
  peerName: string;
  peerRole: 'collaborator' | 'customer' | 'operations';
  currentUserRole?: 'client' | 'collaborator' | 'operations';
  onClose: () => void;
}

let {
  open,
  jobCode,
  peerName,
  peerRole,
  currentUserRole = 'client',
  onClose,
}: Props = $props();

const messages = $derived(chatStore.getMessages(jobCode));
const activeTyping = $derived(chatStore.getTyping(jobCode));

let inputDraft = $state('');
let securityWarning = $state<string | null>(null);
let chatContainerEl = $state<HTMLDivElement | null>(null);

const mySenderName = $derived(
  currentUserRole === 'client'
    ? 'Mariana Garza'
    : currentUserRole === 'collaborator'
      ? 'Roberto Morales'
      : 'Mesa de Control'
);

const quickReplies = $derived(
  currentUserRole === 'client'
    ? [
        'Ya estoy en casa',
        'Anúnciate en caseta Torre B',
        'El interfón es el 501',
        '¿Traes refacciones nuevas?',
      ]
    : currentUserRole === 'collaborator'
      ? [
          'Ya llegué a la puerta',
          'Estoy buscando estacionamiento',
          'Traigo refacciones nuevas',
          '¿Podría abrir la llave de paso general?',
        ]
      : [
          'Protocolo QA pericial verificado',
          'Fondos en Escrow confirmados',
          'Soporte técnico a la orden',
        ]
);

$effect(() => {
  if (messages.length || activeTyping) {
    if (chatContainerEl) {
      setTimeout(() => {
        chatContainerEl?.scrollTo({
          top: chatContainerEl.scrollHeight,
          behavior: 'smooth',
        });
      }, 50);
    }
  }
});

function handleInputChange(text: string) {
  inputDraft = text;
  if (text.trim().length > 0) {
    chatStore.broadcastTyping(jobCode, currentUserRole, mySenderName);
  }
}

function handleSendMessage(textToSend?: string) {
  const content = textToSend || inputDraft.trim();
  if (!content) return;

  const result = chatStore.sendMessage(jobCode, currentUserRole, mySenderName, content);

  if (result.intercepted && result.warning) {
    securityWarning = result.warning;
    setTimeout(() => {
      securityWarning = null;
    }, 6000);
  }

  inputDraft = '';
}

let dialogEl = $state<HTMLDialogElement | null>(null);

$effect(() => {
  if (open) {
    if (dialogEl && !dialogEl.open) {
      dialogEl.showModal();
    }
  } else {
    if (dialogEl?.open) {
      dialogEl.close();
    }
  }
});

function handleCancel(e: Event) {
  e.preventDefault();
  onClose();
}
</script>

<dialog
  bind:this={dialogEl}
  class="modal modal-end"
  oncancel={handleCancel}
  onclose={() => {
    if (open) onClose();
  }}
>
  <div
    class="modal-box bg-base-100 border-l border-base-300 w-full sm:max-w-md h-full flex flex-col shadow-2xl p-0"
  >
      <!-- Header -->
      <div class="p-4 border-b border-base-300 flex items-center justify-between bg-base-200/70">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-primary text-primary-content font-bold flex items-center justify-center text-sm shadow">
            {peerName?.[0] || '?'}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-sm text-base-content">{peerName}</h4>
              <span class="badge badge-success text-white badge-xs font-mono font-bold flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                Sincronizado
              </span>
            </div>
            <p class="text-[11px] text-base-content/60 font-mono">
              Orden #{jobCode} • {peerRole === 'collaborator' ? 'Técnico Verificado' : peerRole === 'operations' ? 'Mesa de Control' : 'Cliente'}
            </p>
          </div>
        </div>
        <button type="button" class="btn btn-ghost btn-circle btn-sm" onclick={onClose}>✕</button>
      </div>

      <!-- Security Notice -->
      <div class="p-2.5 bg-primary/10 border-b border-primary/20 text-[11px] text-primary font-medium flex items-center gap-2">
        <span>🛡️</span>
        <span>Chat sincronizado en tiempo real entre cliente y colaborador con protección Escrow.</span>
      </div>

      <!-- Messages Stream -->
      <div
        bind:this={chatContainerEl}
        class="flex-1 p-4 overflow-y-auto space-y-3 scroll-smooth"
      >
        {#each messages as msg (msg.id)}
          <ChatMessageBubble
            message={msg}
            currentUserRole={currentUserRole}
          />
        {/each}

        <!-- Active Typing Indicator Bubble -->
        {#if activeTyping && activeTyping.sender !== currentUserRole}
          <div class="chat chat-start">
            <div class="chat-header text-[10px] opacity-70 mb-0.5 font-mono">
              <span class="font-bold">{activeTyping.senderName}</span>
            </div>
            <div class="chat-bubble bg-base-200 text-base-content text-xs flex items-center gap-2 py-2 px-3.5 shadow-sm">
              <span class="loading loading-dots loading-xs text-primary"></span>
              <span class="text-[11px] opacity-80 italic">escribiendo mensaje...</span>
            </div>
          </div>
        {/if}
      </div>

      <!-- Warning Alert -->
      {#if securityWarning}
        <AntiDisintermediationAlert message={securityWarning} />
      {/if}

      <!-- Quick Reply Chips -->
      <QuickReplyChips
        replies={quickReplies}
        onSelect={(reply) => handleSendMessage(reply)}
      />

      <!-- Message Input -->
      <div class="p-3 border-t border-base-300 bg-base-100 flex gap-2">
        <input
          type="text"
          placeholder="Escribe un mensaje seguro..."
          value={inputDraft}
          oninput={(e) => handleInputChange(e.currentTarget.value)}
          class="input input-sm flex-1 rounded-xl text-xs"
          onkeydown={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button
          type="button"
          class="btn btn-primary btn-sm rounded-xl px-4 font-bold text-primary-content"
          onclick={() => handleSendMessage()}
        >
          Enviar
        </button>
      </div>
    </div>
  <form method="dialog" class="modal-backdrop">
    <button type="button" onclick={onClose}>close</button>
  </form>
</dialog>
