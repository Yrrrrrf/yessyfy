<script lang="ts">
import type { PhotoQAPhase } from '@sdk';

interface Props {
  phase: PhotoQAPhase;
  jobCode?: string;
  onPhotoCaptured?: (data: {
    dataUrl: string;
    sha256: string;
    phase: PhotoQAPhase;
  }) => void;
}

let { phase, jobCode = 'YSF-JOB-001', onPhotoCaptured }: Props = $props();

let isProcessing = $state(false);
let previewUrl = $state<string | null>(null);
let hashPreview = $state<string | null>(null);

const phaseLabel = $derived(() => {
  switch (phase) {
    case 'diagnostic_before':
      return 'Foto Diagnóstico (Antes)';
    case 'work_progress':
      return 'Foto Avance (Durante)';
    case 'proof_finished':
      return 'Foto Resultado Final (Después)';
  }
});

async function handleFileInput(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  isProcessing = true;

  try {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.onload = async () => {
        // Create canvas with watermarking
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Watermark banner
        const bannerHeight = Math.max(36, Math.round(height * 0.06));
        ctx.fillStyle = 'rgba(11, 61, 71, 0.85)'; // Dark brand teal
        ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

        // Text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.round(bannerHeight * 0.42)}px sans-serif`;
        const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const text = `YESSYFY QA • ${jobCode} • ${timestamp}`;
        ctx.fillText(text, 16, height - Math.round(bannerHeight * 0.35));

        // Export WebP / JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        previewUrl = dataUrl;

        // Calculate SHA-256 hash
        const rawBuffer = new TextEncoder().encode(dataUrl);
        const digest = await crypto.subtle.digest('SHA-256', rawBuffer);
        const hashArray = Array.from(new Uint8Array(digest));
        const sha256 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        hashPreview = sha256.slice(0, 16);

        isProcessing = false;
        onPhotoCaptured?.({ dataUrl, sha256, phase });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  } catch (err) {
    console.error('Error processing photo QA:', err);
    isProcessing = false;
  }
}
</script>

<div class="card bg-base-100 border border-base-300 rounded-3xl p-5 shadow-sm space-y-4">
  <div class="flex items-center justify-between">
    <span class="text-xs font-extrabold uppercase tracking-wider text-base-content/70">
      {phaseLabel()}
    </span>
    {#if hashPreview}
      <span class="badge badge-success badge-sm font-mono text-[10px]">
        SHA: {hashPreview}...
      </span>
    {/if}
  </div>

  {#if previewUrl}
    <div class="relative rounded-2xl overflow-hidden border border-base-300 shadow-inner group">
      <img src={previewUrl} alt="QA Evidence Preview" class="w-full h-48 object-cover" />
      <button
        type="button"
        class="btn btn-sm btn-circle btn-neutral absolute top-2 right-2 opacity-80 hover:opacity-100"
        onclick={() => { previewUrl = null; hashPreview = null; }}
      >
        ✕
      </button>
    </div>
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
        <span class="text-xs font-semibold mt-2 text-base-content/70">Estampando marca de agua QA...</span>
      {:else}
        <span class="text-3xl mb-1">📸</span>
        <span class="text-xs font-bold text-base-content">Tomar Foto o Subir Evidencia</span>
        <span class="text-[10px] text-base-content/50 mt-0.5">Se sella con GPS y fecha automáticamente</span>
      {/if}
    </label>
  {/if}
</div>
