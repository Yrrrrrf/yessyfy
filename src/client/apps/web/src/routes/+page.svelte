<script lang="ts">
import {
  AccessSecurityPass,
  AuthOtpModal,
  ClientReviewAndRatingSheet,
  FiscalInvoiceDrawer,
  InAppChatDrawer,
  SupplementalApprovalModal,
} from '@sdk/ui';
import type { ServiceCategory, TechnicianRecord, WarrantyCertificate } from '@sdk/core';
import { serviceOrderMachine } from '@sdk/state';
import { createActor } from 'xstate';

import AppHeader from '../lib/components/AppHeader.svelte';
import ClientDock, { type ClientTab } from '../lib/components/ClientDock.svelte';
import ClientHomeView, { type BookingDetails } from '../lib/components/ClientHomeView.svelte';
import CollaboratorDirectory from '../lib/components/CollaboratorDirectory.svelte';
import LiveServiceCockpit from '../lib/components/LiveServiceCockpit.svelte';
import UserProfileView from '../lib/components/UserProfileView.svelte';

// Client Navigation
let currentTab = $state<ClientTab>('inicio');

// Membership & User State
let isMember = $state(true);
let authenticatedUser = $state<{ id: string; phone: string; role: string } | null>({
  id: 'usr_c_mariana',
  phone: '+525541982300',
  role: 'customer',
});

// Modals & Drawers
let isAuthModalOpen = $state(false);
let isChatOpen = $state(false);
let isSecurityPassOpen = $state(false);
let isSupplementalModalOpen = $state(false);
let isReviewSheetOpen = $state(false);
let isFiscalInvoiceOpen = $state(false);

// FSM Actor
const orderActor = createActor(serviceOrderMachine);
orderActor.start();
let fsmState = $state(orderActor.getSnapshot());
orderActor.subscribe((snap) => {
  fsmState = snap;
});

// Directory Data
const PROS: (TechnicianRecord & { distanceKm: number; etaMin: number; priceFromCents: number })[] = [
  {
    id: 'tech_01',
    userId: 'usr_t1',
    user: {
      id: 'usr_t1',
      fullName: 'Roberto Morales Ramírez',
      phone: '+525541982301',
      role: 'collaborator',
      status: 'active',
      locale: 'es-MX',
    },
    trades: ['plomeria', 'electricidad'],
    kycStatus: 'verified',
    kycDocuments: { ineFrontUrl: 'https://example.com/ine.jpg' },
    clabe: '012180001234567890',
    operationalState: 'on_job',
    ratingAvg: 4.95,
    jobsCompleted: 148,
    cancellationRate: 0.01,
    updatedAt: new Date().toISOString(),
    distanceKm: 2.3,
    etaMin: 14,
    priceFromCents: 45000,
  },
  {
    id: 'tech_02',
    userId: 'usr_t2',
    user: {
      id: 'usr_t2',
      fullName: 'Ignacio Fuentes Silva',
      phone: '+525533112244',
      role: 'collaborator',
      status: 'active',
      locale: 'es-MX',
    },
    trades: ['electricidad'],
    kycStatus: 'verified',
    kycDocuments: { ineFrontUrl: 'https://example.com/ine2.jpg' },
    clabe: '012180009876543210',
    operationalState: 'idle',
    ratingAvg: 4.88,
    jobsCompleted: 92,
    cancellationRate: 0.02,
    updatedAt: new Date().toISOString(),
    distanceKm: 3.8,
    etaMin: 22,
    priceFromCents: 50000,
  },
];

let filterTrade = $state<ServiceCategory | 'todos'>('todos');
let beforePhotoUrl = $state('https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800');
let afterPhotoUrl = $state('https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800');

let activeWarranty = $state<WarrantyCertificate>({
  id: 'war_001',
  certificateNumber: 'YSF-WAR-2026-0881',
  jobOrderId: 'YSF-ORD-001',
  customerId: 'usr_c_mariana',
  collaboratorId: 'usr_t1',
  validFrom: new Date().toISOString(),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'active',
  termsHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  createdAt: new Date().toISOString(),
});

function handleBookService(details: BookingDetails) {
  orderActor.send({
    type: 'SUBMIT_REQUEST',
    customerId: authenticatedUser?.id || 'usr_c_mariana',
    category: details.category,
    locationType: 'residencial',
    urgency: 'normal',
    totalCustomerCents: details.totalCents,
  });
  orderActor.send({ type: 'DISPATCH' });
  orderActor.send({ type: 'ACCEPT_JOB', collaboratorId: 'usr_t1' });
  orderActor.send({ type: 'START_TRANSIT', etaMinutes: 14 });
  currentTab = 'reservas';
}
</script>

<AppHeader
  bind:currentTab
  isMember={isMember}
  authenticatedUser={authenticatedUser}
  onTabChange={(t) => currentTab = t}
  onOpenAuth={() => isAuthModalOpen = true}
  onOpenProfile={() => currentTab = 'perfil'}
/>

<main class="flex-1 w-full pb-20 md:pb-8">
  {#if currentTab === 'inicio'}
    <ClientHomeView
      isMember={isMember}
      hasActiveOrder={true}
      onBook={handleBookService}
      onSelectTrade={(t) => { filterTrade = t; currentTab = 'buscar'; }}
      onGoToCockpit={() => currentTab = 'reservas'}
    />
  {:else if currentTab === 'buscar'}
    <CollaboratorDirectory
      pros={PROS}
      bind:filterTrade
      onQuoteWithPro={(pro) => {
        filterTrade = pro.trades[0];
        currentTab = 'inicio';
      }}
    />
  {:else if currentTab === 'reservas'}
    <LiveServiceCockpit
      fsmState={fsmState}
      beforePhotoUrl={beforePhotoUrl}
      afterPhotoUrl={afterPhotoUrl}
      activeWarranty={activeWarranty}
      onOpenGatePass={() => isSecurityPassOpen = true}
      onOpenChat={() => isChatOpen = true}
      onOpenSupplemental={() => isSupplementalModalOpen = true}
      onOpenReview={() => isReviewSheetOpen = true}
      onOpenInvoice={() => isFiscalInvoiceOpen = true}
    />
  {:else if currentTab === 'perfil'}
    <UserProfileView
      authenticatedUser={authenticatedUser}
      bind:isMember
      onToggleMembership={() => isMember = !isMember}
      onOpenInvoiceDrawer={() => isFiscalInvoiceOpen = true}
      onLogout={() => authenticatedUser = null}
    />
  {/if}
</main>

<ClientDock
  currentTab={currentTab}
  activeOrderCount={1}
  onTabChange={(t) => currentTab = t}
/>

<!-- Modals & Overlays -->
<AuthOtpModal
  open={isAuthModalOpen}
  onClose={() => isAuthModalOpen = false}
  onAuthenticated={(u) => { authenticatedUser = u; isAuthModalOpen = false; }}
/>

<AccessSecurityPass
  open={isSecurityPassOpen}
  onClose={() => isSecurityPassOpen = false}
/>

<InAppChatDrawer
  open={isChatOpen}
  jobCode={fsmState.context.code || 'YSF-2026-0881'}
  peerName="Roberto Morales"
  peerRole="collaborator"
  currentUserRole="client"
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

<FiscalInvoiceDrawer
  open={isFiscalInvoiceOpen}
  jobCode={fsmState.context.code || 'YSF-2026-0881'}
  totalCents={fsmState.context.totalCustomerCents || 45000}
  onClose={() => isFiscalInvoiceOpen = false}
/>
