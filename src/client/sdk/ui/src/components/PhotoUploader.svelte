<script lang="ts">
import type { PhotoQAPhase } from '@sdk/core';
import { watermarkAndHashImage } from './photo/CanvasWatermarker.ts';
import PhotoPreviewCard from './photo/PhotoPreviewCard.svelte';

interface Props {
  phase: PhotoQAPhase;
  jobCode?: string;
  latitude?: number;
  longitude?: number;
  onPhotoCaptured?: (data: {
    dataUrl: string;
    sha256: string;
    phase: PhotoQAPhase;
    latitude?: number;
    longitude?: number;
  }) => void;
}

let {
  phase,
  jobCode = 'YSF-JOB-001',
  latitude = 19.4326,
  longitude = -99.1332,
  onPhotoCaptured,
}: Props = $props();

let isProcessing = $state(false);
let previewUrl = $state<string | null>(null);
let hashPreview = $state<string | null>(null);

const PHASE_LABELS: Record<PhotoQAPhase, string> = {
  diagnostic_before: 'Foto Diagnóstico (Antes)',
  work_progress: 'Foto Avance (Durante)',
  proof_finished: 'Foto Resultado Final (Después)',
};

const phaseLabel = $derived(PHASE_LABELS[phase] || 'Foto Evidencia');

async function handleFileInput(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  isProcessing = true;
  try {
    const result = await watermarkAndHashImage(file, { jobCode, latitude, longitude });
    previewUrl = result.dataUrl;
    hashPreview = result.sha256.slice(0, 16);
    onPhotoCaptured?.({
      dataUrl: result.dataUrl,
      sha256: result.sha256,
      phase,
      latitude,
      longitude,
    });
  } catch (err) {
    console.error('Error processing photo QA:', err);
  } finally {
    isProcessing = false;
  }
}
</script>

<div class="card bg-base-100 border border-base-300 rounded-3xl p-5 shadow-sm space-y-4">
  <div class="flex items-center justify-between">
    <span class="text-xs font-extrabold uppercase tracking-wider text-base-content/70">
      {phaseLabel}
    </span>
    {#if hashPreview}
      <span class="badge badge-success badge-sm font-mono text-[10px]">
        SHA: {hashPreview}...
      </span>
    {/if}
  </div>

  {#if previewUrl}
    <PhotoPreviewCard
      previewUrl={previewUrl}
      onClear={() => { previewUrl = null; hashPreview = null; }}
    />
  {:else}
    <label class="flex flex-col items-center justify-center border-2 border-dashed border-base-300 hover:border-primary rounded-2xl p-6 cursor-pointer bg-base-200/40 hover:bg-base-200/80 transition-all min-h-[140px]">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        class="hidden"
        onchange={handleFileInput}
        disabled={isProcessing}
      />
      {#if isProcessing}
        <span class="loading loading-spinner loading-md text-primary"></span>
        <span class="text-xs font-semibold mt-2 text-base-content/70">Estampando marca de agua con GPS y fecha...</span>
      {:else}
        <span class="text-3xl mb-1">📸</span>
        <span class="text-xs font-bold text-base-content">Tomar Foto o Subir Evidencia</span>
        <span class="text-[10px] text-base-content/50 mt-0.5 font-mono">
          Estampa automática: GPS {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
        </span>
      {/if}
    </label>
  {/if}
</div>
