<script lang="ts">
import { toastStore, type ToastNotification } from '@sdk/state';
import { fly } from 'svelte/transition';

interface Props {
  toast: ToastNotification;
}

let { toast }: Props = $props();

const alertTheme = $derived.by(() => {
  switch (toast.priority) {
    case 'success':
      return {
        alertClass: 'alert-success alert-soft border border-success/30 shadow-md',
        progressClass: 'progress-success',
        badgeClass: 'badge-success',
        label: 'Éxito',
      };
    case 'warning':
      return {
        alertClass: 'alert-warning alert-soft border border-warning/40 shadow-md',
        progressClass: 'progress-warning',
        badgeClass: 'badge-warning',
        label: 'Aviso',
      };
    case 'error':
      return {
        alertClass: 'alert-error alert-soft border border-error/40 shadow-lg',
        progressClass: 'progress-error',
        badgeClass: 'badge-error',
        label: 'Atención',
      };
    case 'dispatch':
      return {
        alertClass:
          'alert-warning border-2 border-warning bg-base-100 shadow-2xl text-base-content ring-2 ring-warning/30',
        progressClass: 'progress-warning',
        badgeClass: 'badge-warning font-black tracking-wider animate-pulse',
        label: 'DESPACHO URGENTE',
      };
    case 'chat':
      return {
        alertClass: 'alert-info alert-soft border border-info/40 shadow-md',
        progressClass: 'progress-info',
        badgeClass: 'badge-info',
        label: 'Mensaje Chat',
      };
    default:
      return {
        alertClass: 'alert-info alert-soft border border-info/30 shadow-md',
        progressClass: 'progress-info',
        badgeClass: 'badge-info',
        label: 'Información',
      };
  }
});

function handleActionClick() {
  if (toast.action?.onClick) {
    toast.action.onClick();
  }
  toastStore.dismiss(toast.id);
}
</script>

<div
  role="alert"
  aria-atomic="true"
  class="alert {alertTheme.alertClass} pointer-events-auto rounded-2xl flex flex-col items-stretch p-3.5 sm:p-4 transition-all duration-200 overflow-hidden backdrop-blur-md"
  transition:fly={{ x: 60, duration: 240 }}
  onmouseenter={() => toastStore.pause(toast.id)}
  onmouseleave={() => toastStore.resume(toast.id)}
>
  <!-- Content Row -->
  <div class="flex items-start gap-3 w-full">
    <!-- Semantic SVG Icon -->
    <div class="shrink-0 pt-0.5">
      {#if toast.priority === 'dispatch'}
        <div class="relative flex items-center justify-center w-7 h-7 rounded-xl bg-warning/20 text-warning">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-xl opacity-75 bg-warning"></span>
          <svg class="w-4 h-4 relative" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <title>Despacho</title>
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
      {:else if toast.priority === 'chat'}
        <div class="flex items-center justify-center w-7 h-7 rounded-xl bg-info/20 text-info">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <title>Chat</title>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      {:else if toast.priority === 'success'}
        <div class="flex items-center justify-center w-7 h-7 rounded-xl bg-success/20 text-success">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <title>Éxito</title>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      {:else if toast.priority === 'warning'}
        <div class="flex items-center justify-center w-7 h-7 rounded-xl bg-warning/20 text-warning">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <title>Advertencia</title>
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
      {:else if toast.priority === 'error'}
        <div class="flex items-center justify-center w-7 h-7 rounded-xl bg-error/20 text-error">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <title>Error</title>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
      {:else}
        <div class="flex items-center justify-center w-7 h-7 rounded-xl bg-info/20 text-info">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <title>Información</title>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
      {/if}
    </div>

    <!-- Text Header & Body -->
    <div class="flex-1 min-w-0 pr-1">
      <div class="flex items-center gap-2 mb-0.5">
        <span class="badge {alertTheme.badgeClass} badge-xs font-mono">{alertTheme.label}</span>
        {#if toast.sourceApp}
          <span class="text-[10px] font-mono uppercase text-base-content/50">[{toast.sourceApp}]</span>
        {/if}
        {#if toast.paused}
          <span class="badge badge-ghost badge-xs text-[9px]">Pausado</span>
        {/if}
      </div>
      <h4 class="text-xs font-bold text-base-content leading-snug break-words">
        {toast.title}
      </h4>
      {#if toast.description}
        <p class="text-[11px] text-base-content/75 leading-relaxed mt-0.5 break-words">
          {toast.description}
        </p>
      {/if}

      <!-- Action Button (if specified) -->
      {#if toast.action}
        <div class="mt-2.5">
          {#if toast.action.href}
            <a
              href={toast.action.href}
              class="btn btn-xs btn-primary font-bold inline-flex items-center gap-1 rounded-lg"
              onclick={handleActionClick}
            >
              <span>{toast.action.label}</span>
              <span aria-hidden="true">&rarr;</span>
            </a>
          {:else}
            <button
              type="button"
              class="btn btn-xs btn-primary font-bold inline-flex items-center gap-1 rounded-lg"
              onclick={handleActionClick}
            >
              <span>{toast.action.label}</span>
              <span aria-hidden="true">&rarr;</span>
            </button>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Dismiss Button -->
    {#if toast.dismissible}
      <button
        type="button"
        class="btn btn-ghost btn-xs btn-circle shrink-0 text-base-content/60 hover:text-base-content"
        aria-label="Cerrar notificación"
        onclick={() => toastStore.dismiss(toast.id)}
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <title>Cerrar</title>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    {/if}
  </div>

  <!-- Countdown Progress Bar -->
  {#if toast.duration > 0}
    <div class="w-full mt-2.5 pt-1">
      <progress
        class="progress {alertTheme.progressClass} w-full h-1 rounded-full opacity-60 transition-all duration-75"
        value={toast.progress}
        max="100"
        aria-label="Tiempo restante"
      ></progress>
    </div>
  {/if}
</div>



