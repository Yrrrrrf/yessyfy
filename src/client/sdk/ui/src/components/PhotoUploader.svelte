<script lang="ts">
import type { PhotoQAPhase } from "@sdk/core";
import { getPhaseLabel, watermarkAndHashImage } from "./photo/CanvasWatermarker.ts";
import CameraViewfinderModal from "./photo/CameraViewfinderModal.svelte";
import PhotoPreviewCard from "./photo/PhotoPreviewCard.svelte";

interface Props {
	phase: PhotoQAPhase;
	jobCode?: string;
	latitude?: number;
	longitude?: number;
	altitude?: number;
	onPhotoCaptured?: (data: {
		dataUrl: string;
		sha256: string;
		phase: PhotoQAPhase;
		latitude?: number;
		longitude?: number;
		altitude?: number;
		timestamp?: string;
	}) => void;
}

let {
	phase,
	jobCode = "YSF-JOB-001",
	latitude = 19.4326,
	longitude = -99.1332,
	altitude = 2240,
	onPhotoCaptured,
}: Props = $props();

let isProcessing = $state(false);
let isCameraOpen = $state(false);
let previewUrl = $state<string | null>(null);
let fullSha256 = $state<string | null>(null);
let hashPreview = $state<string | null>(null);

const phaseLabel = $derived(getPhaseLabel(phase));

function handleModalCapture(result: {
	dataUrl: string;
	sha256: string;
	phase: PhotoQAPhase;
	latitude: number;
	longitude: number;
	altitude: number;
	timestamp: string;
}) {
	previewUrl = result.dataUrl;
	fullSha256 = result.sha256;
	hashPreview = result.sha256.slice(0, 16);

	onPhotoCaptured?.({
		dataUrl: result.dataUrl,
		sha256: result.sha256,
		phase: result.phase,
		latitude: result.latitude,
		longitude: result.longitude,
		altitude: result.altitude,
		timestamp: result.timestamp,
	});
}

async function handleFileInput(e: Event) {
	const target = e.target as HTMLInputElement;
	const file = target.files?.[0];
	if (!file) return;

	isProcessing = true;
	try {
		const result = await watermarkAndHashImage(file, {
			jobCode,
			phase,
			latitude,
			longitude,
			altitude,
		});
		previewUrl = result.dataUrl;
		fullSha256 = result.sha256;
		hashPreview = result.sha256.slice(0, 16);
		onPhotoCaptured?.({
			dataUrl: result.dataUrl,
			sha256: result.sha256,
			phase,
			latitude,
			longitude,
			altitude,
			timestamp: result.timestamp,
		});
	} catch (err) {
		console.error("Error processing photo QA:", err);
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
			<span class="badge badge-success badge-sm font-mono text-[10px] font-bold" title={fullSha256 || ""}>
				✓ SHA: {hashPreview}...
			</span>
		{/if}
	</div>

	{#if previewUrl}
		<div class="space-y-3">
			<PhotoPreviewCard
				previewUrl={previewUrl}
				onClear={() => {
					previewUrl = null;
					hashPreview = null;
					fullSha256 = null;
				}}
			/>

			<div class="flex items-center justify-between gap-3">
				<!-- 56px Touch Target: Retake Photo Button -->
				<button
					type="button"
					class="btn btn-outline btn-neutral min-h-[56px] flex-1 rounded-2xl font-bold flex items-center justify-center gap-2 cursor-pointer"
					onclick={() => {
						isCameraOpen = true;
					}}
				>
					<span class="text-xl">🔄</span>
					<span class="text-xs">Volver a Tomar Foto</span>
				</button>

				<!-- Clear / Delete -->
				<button
					type="button"
					class="btn btn-ghost btn-circle min-h-[56px] min-w-[56px] text-error hover:bg-error/10 cursor-pointer"
					onclick={() => {
						previewUrl = null;
						hashPreview = null;
						fullSha256 = null;
					}}
					aria-label="Eliminar Evidencia"
				>
					🗑️
				</button>
			</div>
		</div>
	{:else}
		<div class="space-y-3">
			<!-- 56px Touch Target Primary Camera Trigger (Default Action) -->
			<button
				type="button"
				class="w-full flex flex-col items-center justify-center border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 rounded-3xl p-6 min-h-[140px] gap-3 transition-all cursor-pointer group shadow-sm"
				onclick={() => {
					isCameraOpen = true;
				}}
				disabled={isProcessing}
			>
				<div class="w-16 h-16 rounded-2xl bg-primary text-primary-content flex items-center justify-center text-3xl shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform">
					📸
				</div>
				<div class="text-center space-y-0.5">
					<span class="font-black text-sm text-base-content block">
						Tomar Foto con Cámara en Campo (56px)
					</span>
					<span class="text-xs text-base-content/60 block">
						Visor táctil predeterminado con estampa NOM-151 y SHA-256
					</span>
				</div>
				<span class="badge badge-primary badge-sm font-black text-primary-content uppercase tracking-wider">
					Cámara Predeterminada
				</span>
			</button>

			<!-- Secondary File Input Fallback (for gallery / disk upload) -->
			<div class="flex items-center justify-between text-xs px-2 text-base-content/60">
				<label class="flex items-center gap-1.5 hover:text-base-content cursor-pointer transition-colors">
					<input
						type="file"
						accept="image/*"
						capture="environment"
						class="hidden"
						onchange={handleFileInput}
						disabled={isProcessing}
					/>
					{#if isProcessing}
						<span class="loading loading-spinner loading-xs text-primary"></span>
						<span>Estampando marca NOM-151...</span>
					{:else}
						<span>📁 O subir desde galería / archivo</span>
					{/if}
				</label>

				<span class="font-mono text-[10px] text-base-content/50">
					GPS {latitude.toFixed(4)}°, {longitude.toFixed(4)}° (±3m)
				</span>
			</div>
		</div>
	{/if}
</div>

<!-- Camera Viewfinder Modal -->
<CameraViewfinderModal
	open={isCameraOpen}
	phase={phase}
	jobCode={jobCode}
	latitude={latitude}
	longitude={longitude}
	altitude={altitude}
	onCapture={handleModalCapture}
	onClose={() => {
		isCameraOpen = false;
	}}
/>



