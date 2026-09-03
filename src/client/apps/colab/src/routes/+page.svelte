<script lang="ts">
import {
  ClientReviewAndRatingSheet,
  InAppChatDrawer,
  SupplementalApprovalModal,
} from '@sdk/ui';
import { serviceOrderMachine } from '@sdk/state';
import { createActor } from 'xstate';

import ColabHeader from '../lib/components/ColabHeader.svelte';
import ColabDock from '../lib/components/ColabDock.svelte';
import RadarJobView from '../lib/components/RadarJobView.svelte';
import ActiveJobExecutionView from '../lib/components/ActiveJobExecutionView.svelte';
import SatTaxWalletView from '../lib/components/SatTaxWalletView.svelte';
import ColabProfileView from '../lib/components/ColabProfileView.svelte';
import type { ColabTab } from '../lib/types.ts';

// Tab & Duty Navigation
let currentTab = $state<ColabTab>('radar');
let isCollabOnDuty = $state(true);

// Modals
let isChatOpen = $state(false);
let isSupplementalModalOpen = $state(false);
let isReviewSheetOpen = $state(false);

// Radar Audio & Countdown State
let radarTimerSeconds = $state(0);
let radarInterval: number | null = null;
let sharedAudioCtx: AudioContext | null = null;

function handleToggleDuty() {
  isCollabOnDuty = !isCollabOnDuty;
  if (isCollabOnDuty && typeof window !== 'undefined') {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!sharedAudioCtx) sharedAudioCtx = new AudioContextClass();
      if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();
    } catch (_) {}
  }
}

function triggerRadarAlert() {
  if (typeof window !== 'undefined') {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!sharedAudioCtx) sharedAudioCtx = new AudioContextClass();
      if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();

      const osc = sharedAudioCtx.createOscillator();
      const gain = sharedAudioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, sharedAudioCtx.currentTime); // 880Hz tone
      gain.gain.setValueAtTime(0.25, sharedAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, sharedAudioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(sharedAudioCtx.destination);
      osc.start();
      osc.stop(sharedAudioCtx.currentTime + 0.5);
    } catch (_) {}

    if ('vibrate' in navigator) {
      navigator.vibrate([300, 100, 300, 100, 500]);
    }
  }
}

function startRadarCountdown() {
  radarTimerSeconds = 45;
  triggerRadarAlert();
  if (radarInterval) clearInterval(radarInterval);
  radarInterval = setInterval(() => {
    if (radarTimerSeconds > 0) {
      radarTimerSeconds--;
    } else {
      if (radarInterval) clearInterval(radarInterval);
    }
  }, 1000) as unknown as number;
}

// FSM Actor
const orderActor = createActor(serviceOrderMachine);
orderActor.start();
let fsmState = $state(orderActor.getSnapshot());
orderActor.subscribe((snap) => {
  fsmState = snap;
});
</script>

<ColabHeader
  bind:currentTab
  bind:isCollabOnDuty
  onTabChange={(t) => currentTab = t}
  onToggleDuty={handleToggleDuty}
/>

<main class="flex-1 w-full pb-20 md:pb-8">
  {#if currentTab === 'radar'}
    <RadarJobView
      isCollabOnDuty={isCollabOnDuty}
      radarTimerSeconds={radarTimerSeconds}
      onTriggerSimulatedJob={startRadarCountdown}
      onAcceptJob={(_job) => {
        radarTimerSeconds = 0;
        currentTab = 'chamba_activa';
        orderActor.send({ type: 'ACCEPT_JOB', collaboratorId: 'usr_t1' });
      }}
      onRejectJob={() => {
        radarTimerSeconds = 0;
      }}
    />
  {:else if currentTab === 'chamba_activa'}
    <ActiveJobExecutionView
      fsmState={fsmState}
      onSendFsmEvent={(evt) => orderActor.send(evt)}
      onOpenChat={() => isChatOpen = true}
      onOpenSupplemental={() => isSupplementalModalOpen = true}
      onFinishJob={() => isReviewSheetOpen = true}
    />
  {:else if currentTab === 'billetera'}
    <SatTaxWalletView />
  {:else if currentTab === 'perfil'}
    <ColabProfileView />
  {/if}
</main>

<ColabDock
  currentTab={currentTab}
  activeJobCount={1}
  onTabChange={(t) => currentTab = t}
/>

<!-- In-App Overlays & Modals -->
<InAppChatDrawer
  open={isChatOpen}
  jobCode={fsmState.context.code || 'YSF-2026-0881'}
  peerName="Mariana Garza Lozano"
  peerRole="customer"
  currentUserRole="collaborator"
  onClose={() => isChatOpen = false}
/>

<SupplementalApprovalModal
  open={isSupplementalModalOpen}
  reason="Tubería de cobre oculta con fisura por corrosión interna."
  supplementalCents={35000}
  onApprove={() => {
    orderActor.send({ type: 'APPROVE_SUPPLEMENTAL_QUOTE' });
    isSupplementalModalOpen = false;
  }}
  onReject={() => {
    orderActor.send({ type: 'REJECT_SUPPLEMENTAL_QUOTE' });
    isSupplementalModalOpen = false;
  }}
/>

<ClientReviewAndRatingSheet
  open={isReviewSheetOpen}
  jobCode={fsmState.context.code || 'YSF-2026-0881'}
  collaboratorName="Roberto Morales"
  onSubmit={(data) => {
    orderActor.send({
      type: 'VALIDATE_OK',
      rating: data.rating,
    });
    isReviewSheetOpen = false;
  }}
  onClose={() => isReviewSheetOpen = false}
/>
