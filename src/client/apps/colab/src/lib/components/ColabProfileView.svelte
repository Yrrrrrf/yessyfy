<script lang="ts">
import { VehiclePlateCard } from '@sdk/ui';

let fullName = $state('Roberto Morales Ramírez');
let phone = $state('+52 55 4198 2301');
let rfc = $state('MORR820915ABC');
let clabe = $state('012180001234567890');
</script>

<div class="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
  <!-- Profile Avatar Card -->
  <div class="card bg-base-100 border border-base-300 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-5 shadow-sm">
    <div class="w-20 h-20 rounded-3xl bg-gradient-to-tr from-accent to-primary text-accent-content font-black text-3xl flex items-center justify-center shadow-md">
      R
    </div>
    <div class="flex-1 text-center sm:text-left space-y-1">
      <div class="flex flex-col sm:flex-row sm:items-center gap-2">
        <h3 class="font-black text-xl text-base-content">{fullName}</h3>
        <span class="badge badge-success badge-sm font-bold">✓ INE Verificado</span>
      </div>
      <p class="text-xs text-base-content/60 font-mono">{phone} • RFC: {rfc}</p>
      <div class="flex flex-wrap justify-center sm:justify-start gap-1.5 pt-1">
        <span class="badge badge-neutral badge-xs font-bold">4.95 ★ (148 Trabajos)</span>
        <span class="badge badge-info badge-xs font-bold">Antecedentes No Penales OK</span>
        <span class="badge badge-primary badge-xs font-bold">Garantía Escrow Pro</span>
      </div>
    </div>
  </div>

  <!-- Registered Vehicle Box -->
  <div class="card bg-base-100 border border-base-300 rounded-3xl p-6 space-y-3 shadow-sm">
    <h4 class="font-black text-sm text-base-content uppercase tracking-wider">Transporte Autorizado para Caseta</h4>
    <VehiclePlateCard
      plateNumber="M-892-CDMX"
      vehicleType="moto"
      modelDescription="Italika FT150 Roja (Pase Digital Activo)"
    />
  </div>

  <!-- Bank CLABE for SPEI -->
  <div class="card bg-base-100 border border-base-300 rounded-3xl p-6 space-y-4 shadow-sm">
    <h4 class="font-black text-sm text-base-content uppercase tracking-wider">Cuenta Bancaria para Dispersión SPEI</h4>
    <fieldset class="fieldset space-y-2 text-xs">
      <div class="flex justify-between py-1 border-b border-base-300">
        <span class="text-base-content/60 font-medium">Banco Receptor:</span>
        <span class="font-bold text-base-content">BBVA México</span>
      </div>
      <div class="flex justify-between py-1 border-b border-base-300">
        <span class="text-base-content/60 font-medium">CLABE Interbancaria (18 dígitos):</span>
        <span class="font-mono font-bold text-base-content">{clabe}</span>
      </div>
      <div class="flex justify-between py-1">
        <span class="text-base-content/60 font-medium">Régimen Fiscal SAT:</span>
        <span class="font-mono font-bold text-base-content">626 - RESICO / Plataformas</span>
      </div>
    </fieldset>
  </div>
</div>
