<script lang="ts">
import { filterAntiDisintermediation } from '@sdk';

interface ChatMessage {
  id: string;
  sender: 'client' | 'collaborator';
  text: string;
  timestamp: string;
  masked: boolean;
}

interface Props {
  open: boolean;
  jobCode: string;
  peerName: string;
  peerRole: 'collaborator' | 'customer';
  currentUserRole: 'client' | 'collaborator';
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

let messages = $state<ChatMessage[]>([
  {
    id: 'm1',
    sender: 'collaborator',
    text: 'Hola, soy Roberto Morales de Yessyfy. Ya estoy en camino hacia su domicilio en Polanco con mi herramienta.',
    timestamp: '14:05',
    masked: false,
  },
  {
    id: 'm2',
    sender: 'client',
    text: 'Hola Roberto. Por favor al llegar con Don Pedro en caseta di que vas al departamento 501.',
    timestamp: '14:07',
    masked: false,
  },
]);

let inputDraft = $state('');
let securityWarning = $state<string | null>(null);

const quickReplies = $derived(
  currentUserRole === 'client'
    ? ['Ya estoy en casa', 'Anúnciate en caseta Torre B', 'El interfón es el 501', '¿Traes escalera?']
    : ['Ya llegué a la puerta', 'Estoy buscando estacionamiento', 'Traigo refacciones nuevas', '¿Podría abrir la llave general?'],
);

function sendMessage(textToSend?: string) {
  const content = textToSend || inputDraft.trim();
  if (!content) return;

  const filterResult = filterAntiDisintermediation(content);
  if (filterResult.intercepted) {
    securityWarning = '🛡️ Aviso de Protección: Por tu seguridad y para mantener la Garantía de 30 días, no compartas teléfonos ni pagos directos fuera de Yessyfy.';
    setTimeout(() => securityWarning = null, 6000);
  }

  messages.push({
    id: `msg_${Date.now()}`,
    sender: currentUserRole,
    text: filterResult.sanitizedText,
    timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    masked: filterResult.intercepted,
  });

  inputDraft = '';
}
</script>

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end" onclick={onClose}>
    <!-- Slide-over panel -->
    <div
      class="bg-base-100 border-l border-base-300 w-full sm:max-w-md h-full flex flex-col shadow-2xl"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Chat Header -->
      <div class="p-4 border-b border-base-300 flex items-center justify-between bg-base-200/60">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-primary text-white font-bold flex items-center justify-center text-sm shadow">
            {peerName?.[0] || '?'}
          </div>
          <div>
            <h4 class="font-bold text-sm text-base-content flex items-center gap-1.5">
              {peerName}
              <span class="badge badge-success badge-xs">En línea</span>
            </h4>
            <p class="text-[11px] text-base-content/60 font-mono">
              Orden #{jobCode} • {peerRole === 'collaborator' ? 'Técnico Verificado' : 'Cliente'}
            </p>
          </div>
        </div>
        <button type="button" class="btn btn-ghost btn-circle btn-sm" onclick={onClose}>✕</button>
      </div>

      <!-- Security Banner -->
      <div class="p-2.5 bg-primary/10 border-b border-primary/20 text-[11px] text-primary font-medium flex items-center gap-2">
        <span>🛡️</span>
        <span>Chat protegido: Números y cuentas bancarias son enmascarados para proteger tu garantía legal.</span>
      </div>

      <!-- Messages Body -->
      <div class="flex-1 p-4 overflow-y-auto space-y-3">
        {#each messages as msg}
          <div class="chat {msg.sender === currentUserRole ? 'chat-end' : 'chat-start'}">
            <div class="chat-header text-[10px] opacity-50 mb-0.5 font-mono">
              {msg.timestamp}
            </div>
            <div class="chat-bubble text-xs leading-relaxed {msg.sender === currentUserRole ? 'chat-bubble-primary text-white' : 'bg-base-200 text-base-content'}">
              {msg.text}
              {#if msg.masked}
                <span class="badge badge-warning badge-xs block mt-1 font-mono text-[9px]">
                  Contenido moderado
                </span>
              {/if}
            </div>
            <div class="chat-footer opacity-50 text-[10px]">
              {msg.sender === currentUserRole ? '✓✓ Leído' : ''}
            </div>
          </div>
        {/each}
      </div>

      <!-- Security Toast Alert -->
      {#if securityWarning}
        <div class="p-3 bg-warning/20 border-t border-warning/40 text-xs text-warning-content font-medium">
          {securityWarning}
        </div>
      {/if}

      <!-- Quick Replies -->
      <div class="p-2 border-t border-base-300 bg-base-200/40 flex gap-1.5 overflow-x-auto">
        {#each quickReplies as reply}
          <button
            type="button"
            class="btn btn-xs rounded-full btn-ghost border border-base-300 text-[11px] whitespace-nowrap"
            onclick={() => sendMessage(reply)}
          >
            {reply}
          </button>
        {/each}
      </div>

      <!-- Input Bar -->
      <div class="p-3 border-t border-base-300 bg-base-100 flex gap-2">
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          bind:value={inputDraft}
          class="input input-bordered input-sm flex-1 rounded-xl text-xs"
          onkeydown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          type="button"
          class="btn btn-primary btn-sm rounded-xl px-4 font-bold"
          onclick={() => sendMessage()}
        >
          Enviar
        </button>
      </div>
    </div>
  </div>
{/if}
