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

let inputDraft = $state('');
let securityWarning = $state<string | null>(null);

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
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end" onclick={onClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="bg-base-100 border-l border-base-300 w-full sm:max-w-md h-full flex flex-col shadow-2xl"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="p-4 border-b border-base-300 flex items-center justify-between bg-base-200/70">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-primary text-primary-content font-bold flex items-center justify-center text-sm shadow">
            {peerName?.[0] || '?'}
          </div>
          <div>
            <h4 class="font-bold text-sm text-base-content flex items-center gap-1.5">
              {peerName}
              <span class="badge badge-success text-white badge-xs">En línea</span>
            </h4>
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
        <span>Chat sincronizado en tiempo real. Teléfonos y CLABEs bancarias son enmascarados para resguardo de la garantía Escrow.</span>
      </div>

      <!-- Messages Stream -->
      <div class="flex-1 p-4 overflow-y-auto space-y-3">
        {#each messages as msg (msg.id)}
          <ChatMessageBubble
            message={msg}
            currentUserRole={currentUserRole}
          />
        {/each}
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
          bind:value={inputDraft}
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
  </div>
{/if}
