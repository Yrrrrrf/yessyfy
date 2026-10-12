<script lang="ts">
import { untrack } from "svelte";
import type { PhotoQAPhase } from "@sdk/core";
import {
	calculateSha256,
	formatNom151Timestamp,
	getPhaseLabel,
	watermarkCanvas,
} from "./CanvasWatermarker.ts";
import { soundEngine } from "../../audio/soundEngine.ts";

interface Props {
	open: boolean;
	phase: PhotoQAPhase;
	jobCode?: string;
	latitude?: number;
	longitude?: number;
	altitude?: number;
	onCapture: (result: {
		dataUrl: string;
		sha256: string;
		phase: PhotoQAPhase;
		latitude: number;
		longitude: number;
		altitude: number;
		timestamp: string;
	}) => void;
	onClose: () => void;
}

let {
	open,
	phase,
	jobCode = "YSF-JOB-001",
	latitude = 19.4326,
	longitude = -99.1332,
	altitude = 2240,
	onCapture,
	onClose,
}: Props = $props();

// Video stream & canvas refs
let videoEl = $state<HTMLVideoElement | null>(null);
let fallbackCanvasEl = $state<HTMLCanvasElement | null>(null);
let mediaStream = $state<MediaStream | null>(null);

// Component reactive state
let isSimulated = $state(false);
let simulationScene = $state<0 | 1 | 2>(0); // 0 = Plumbing, 1 = Electrical, 2 = Locksmith
let facingMode = $state<"environment" | "user">("environment");
let isFlashing = $state(false);
let isCapturing = $state(false);
let torchOn = $state(false);
let hasTorchSupport = $state(false);
// Incremented for every start/stop so a permission prompt that resolves after
// the viewfinder closes (or after the camera is flipped) cannot revive an old stream.
let cameraRequestId = 0;

// Telemetry state
let liveTimestamp = $state(formatNom151Timestamp());
let heading = $state(45);

const phaseLabel = $derived(getPhaseLabel(phase));

const SCENE_NAMES = [
	"1/3 Plomería: Corrosión Codo Cu",
	"2/3 Electricidad: Breaker 20A Disparado",
	"3/3 Cerrajería: Cerrojo Desalineado",
];

// Start live camera stream
async function startCamera() {
	stopCamera();
	const requestId = ++cameraRequestId;

	if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
		isSimulated = true;
		renderFallbackScene();
		return;
	}

	try {
		const constraints: MediaStreamConstraints = {
			video: {
				facingMode: { ideal: facingMode },
				width: { ideal: 1920 },
				height: { ideal: 1080 },
			},
			audio: false,
		};

		const stream = await navigator.mediaDevices.getUserMedia(constraints);
		if (requestId !== cameraRequestId || !open) {
			for (const track of stream.getTracks()) {
				track.stop();
			}
			return;
		}

		mediaStream = stream;
		isSimulated = false;

		if (videoEl) {
			videoEl.srcObject = stream;
			videoEl.play().catch(() => {});
		}

		// Inspect torch capability on track
		const track = stream.getVideoTracks()[0];
		if (track && "getCapabilities" in track) {
			const caps = (track as unknown as { getCapabilities: () => { torch?: boolean } }).getCapabilities();
			hasTorchSupport = !!caps?.torch;
		} else {
			hasTorchSupport = false;
		}
	} catch (_err) {
		if (requestId !== cameraRequestId || !open) return;

		// Hardware camera unavailable, fallback to simulated canvas
		isSimulated = true;
		renderFallbackScene();
	}
}

// Stop camera stream tracks
function stopCamera() {
	cameraRequestId += 1;
	if (mediaStream) {
		for (const track of mediaStream.getTracks()) {
			track.stop();
		}
		mediaStream = null;
	}
	if (videoEl) {
		videoEl.srcObject = null;
	}
	torchOn = false;
}

// Toggle flashlight / torch if available
async function toggleTorch() {
	if (!hasTorchSupport || !mediaStream) return;
	const track = mediaStream.getVideoTracks()[0];
	if (!track) return;

	try {
		torchOn = !torchOn;
		await (track as unknown as { applyConstraints: (c: { advanced: [{ torch: boolean }] }) => Promise<void> })
			.applyConstraints({ advanced: [{ torch: torchOn }] });
	} catch {
		torchOn = false;
	}
}

// Switch between rear and front camera (or toggle simulation)
function switchCamera() {
	facingMode = facingMode === "environment" ? "user" : "environment";
	if (!isSimulated) {
		startCamera();
	}
}

// Cycle through simulated inspection scenes
function cycleSimulatedScene() {
	simulationScene = ((simulationScene + 1) % 3) as 0 | 1 | 2;
	renderFallbackScene();
}

// Render high-contrast procedural inspection scenes for hardware fallback
function renderFallbackScene() {
	if (!fallbackCanvasEl) return;
	const canvas = fallbackCanvasEl;
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	const w = canvas.width;
	const h = canvas.height;

	// Reset transform and clear
	ctx.clearRect(0, 0, w, h);

	if (simulationScene === 0) {
		// --- SCENE 1: PLUMBING (Corrosión Galvánica Codo 1/2" Cobre) ---
		// Dark background concrete wall
		ctx.fillStyle = "#1E293B";
		ctx.fillRect(0, 0, w, h);

		// Wall texture grid
		ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
		ctx.lineWidth = 2;
		for (let x = 0; x < w; x += 80) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
			ctx.stroke();
		}
		for (let y = 0; y < h; y += 80) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(w, y);
			ctx.stroke();
		}

		// Horizontal copper pipe
		const pipeY = h * 0.48;
		const pipeR = 48;
		const copperGrad = ctx.createLinearGradient(0, pipeY - pipeR, 0, pipeY + pipeR);
		copperGrad.addColorStop(0, "#D97706");
		copperGrad.addColorStop(0.3, "#F59E0B");
		copperGrad.addColorStop(0.7, "#B45309");
		copperGrad.addColorStop(1, "#78350F");

		ctx.fillStyle = copperGrad;
		ctx.fillRect(w * 0.15, pipeY - pipeR, w * 0.4, pipeR * 2);

		// Vertical copper pipe downward
		const vertX = w * 0.55;
		const vertGrad = ctx.createLinearGradient(vertX - pipeR, 0, vertX + pipeR, 0);
		vertGrad.addColorStop(0, "#D97706");
		vertGrad.addColorStop(0.3, "#F59E0B");
		vertGrad.addColorStop(0.7, "#B45309");
		vertGrad.addColorStop(1, "#78350F");

		ctx.fillStyle = vertGrad;
		ctx.fillRect(vertX - pipeR, pipeY, pipeR * 2, h * 0.4);

		// 90° Copper Elbow fitting
		ctx.beginPath();
		ctx.arc(vertX - pipeR, pipeY + pipeR, pipeR * 2, -Math.PI / 2, 0, false);
		ctx.lineWidth = pipeR * 2;
		ctx.strokeStyle = "#D97706";
		ctx.stroke();

		// Solder joint ring
		ctx.fillStyle = "#94A3B8";
		ctx.fillRect(w * 0.55 - pipeR - 10, pipeY - pipeR - 6, 20, (pipeR * 2) + 12);

		// Patinated verdigris corrosion cluster
		const crustColors = ["#10B981", "#059669", "#047857", "#065F46", "#34D399"];
		for (let i = 0; i < 70; i++) {
			const cx = vertX - 10 + (Math.sin(i * 1.7) * 45);
			const cy = pipeY + 15 + (Math.cos(i * 2.3) * 35);
			const r = 3 + (i % 7);
			ctx.fillStyle = crustColors[i % crustColors.length];
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, Math.PI * 2);
			ctx.fill();
		}

		// Leaking water droplet
		const dropX = vertX + 5;
		const dropY = pipeY + pipeR + 55;
		ctx.fillStyle = "#38BDF8";
		ctx.beginPath();
		ctx.moveTo(dropX, dropY - 22);
		ctx.quadraticCurveTo(dropX + 14, dropY + 8, dropX, dropY + 22);
		ctx.quadraticCurveTo(dropX - 14, dropY + 8, dropX, dropY - 22);
		ctx.fill();

		// Droplet highlight shine
		ctx.fillStyle = "#F0F9FF";
		ctx.beginPath();
		ctx.arc(dropX - 4, dropY + 5, 4, 0, Math.PI * 2);
		ctx.fill();

		// Diagnostic callout box
		ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
		ctx.strokeStyle = "#00FF88";
		ctx.lineWidth = 2;
		ctx.fillRect(w * 0.1, h * 0.76, w * 0.8, 64);
		ctx.strokeRect(w * 0.1, h * 0.76, w * 0.8, 64);

		ctx.fillStyle = "#00FF88";
		ctx.font = "bold 20px monospace, sans-serif";
		ctx.fillText("SIMULACIÓN QA: Codo Cobre 1/2\" - Corrosión Galvánica & Fuga", w * 0.12, h * 0.76 + 38);
	} else if (simulationScene === 1) {
		// --- SCENE 2: ELECTRICAL (Centro de Carga 20A Disparado) ---
		// Dark electrical panel enclosure
		ctx.fillStyle = "#0F172A";
		ctx.fillRect(0, 0, w, h);

		const panelX = w * 0.2;
		const panelY = h * 0.12;
		const panelW = w * 0.6;
		const panelH = h * 0.64;

		// Panel steel faceplate
		ctx.fillStyle = "#334155";
		ctx.fillRect(panelX, panelY, panelW, panelH);
		ctx.strokeStyle = "#64748B";
		ctx.lineWidth = 4;
		ctx.strokeRect(panelX, panelY, panelW, panelH);

		// Breaker bays
		const breakerCount = 4;
		const bHeight = 65;
		const startBY = panelY + 40;

		for (let i = 0; i < breakerCount; i++) {
			const by = startBY + (i * 75);
			const isTripped = (i === 1);

			// Breaker body
			ctx.fillStyle = "#1E293B";
			ctx.fillRect(panelX + 40, by, panelW - 80, bHeight);

			// Rating label
			ctx.fillStyle = "#F8FAFC";
			ctx.font = "bold 16px monospace";
			ctx.fillText(i === 1 ? "20A REC" : "15A ILUM", panelX + 55, by + 40);

			// Toggle switch slot
			ctx.fillStyle = "#020617";
			ctx.fillRect(panelX + panelW - 200, by + 12, 100, bHeight - 24);

			// Switch handle
			if (isTripped) {
				// Tripped in center position with orange warning flag
				ctx.fillStyle = "#EA580C"; // Tripped flag
				ctx.fillRect(panelX + panelW - 165, by + 16, 30, bHeight - 32);
				ctx.fillStyle = "#F97316";
				ctx.fillText("TRIP", panelX + panelW - 260, by + 40);
			} else {
				// ON position pushed right
				ctx.fillStyle = "#475569";
				ctx.fillRect(panelX + panelW - 130, by + 16, 25, bHeight - 32);
				ctx.fillStyle = "#22C55E";
				ctx.fillText("ON", panelX + panelW - 250, by + 40);
			}
		}

		// Diagnostic callout box
		ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
		ctx.strokeStyle = "#F97316";
		ctx.lineWidth = 2;
		ctx.fillRect(w * 0.1, h * 0.80, w * 0.8, 64);
		ctx.strokeRect(w * 0.1, h * 0.80, w * 0.8, 64);

		ctx.fillStyle = "#F97316";
		ctx.font = "bold 20px monospace, sans-serif";
		ctx.fillText("SIMULACIÓN QA: Interruptor Termomagnético 20A Disparado", w * 0.12, h * 0.80 + 38);
	} else {
		// --- SCENE 3: LOCKSMITH (Cerrojo Desalineado con Contra-Placa) ---
		// Wood frame & jamb background
		const woodGrad = ctx.createLinearGradient(0, 0, w, 0);
		woodGrad.addColorStop(0, "#78350F");
		woodGrad.addColorStop(0.48, "#92400E");
		woodGrad.addColorStop(0.52, "#451A03");
		woodGrad.addColorStop(1, "#78350F");
		ctx.fillStyle = woodGrad;
		ctx.fillRect(0, 0, w, h);

		// Door reveal seam
		ctx.fillStyle = "#000000";
		ctx.fillRect(w * 0.49, 0, w * 0.02, h);

		// Satin brass strike plate on right jamb
		const spX = w * 0.52;
		const spY = h * 0.22;
		const spW = w * 0.25;
		const spH = h * 0.5;

		const brassGrad = ctx.createLinearGradient(spX, spY, spX + spW, spY + spH);
		brassGrad.addColorStop(0, "#FEF08A");
		brassGrad.addColorStop(0.3, "#EAB308");
		brassGrad.addColorStop(0.7, "#CA8A04");
		brassGrad.addColorStop(1, "#A16207");

		ctx.fillStyle = brassGrad;
		ctx.fillRect(spX, spY, spW, spH);

		// Strike plate mortise opening
		const moY = spY + (spH * 0.35);
		const moH = 70;
		ctx.fillStyle = "#0F172A";
		ctx.fillRect(spX + 15, moY, spW - 30, moH);

		// Misaligned brass deadbolt coming from left door edge
		// It hits 18px lower than the mortise hole
		const boltY = moY + 45;
		const boltH = 50;
		ctx.fillStyle = "#E2E8F0";
		ctx.fillRect(w * 0.38, boltY, w * 0.18, boltH);

		// Wear & scratch score marks on brass lip
		ctx.strokeStyle = "#451A03";
		ctx.lineWidth = 3;
		for (let s = 0; s < 5; s++) {
			ctx.beginPath();
			ctx.moveTo(spX + 5, boltY + 8 + (s * 8));
			ctx.lineTo(spX + 25, boltY + 12 + (s * 8));
			ctx.stroke();
		}

		// Diagnostic callout box
		ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
		ctx.strokeStyle = "#EAB308";
		ctx.lineWidth = 2;
		ctx.fillRect(w * 0.1, h * 0.80, w * 0.8, 64);
		ctx.strokeRect(w * 0.1, h * 0.80, w * 0.8, 64);

		ctx.fillStyle = "#EAB308";
		ctx.font = "bold 20px monospace, sans-serif";
		ctx.fillText("SIMULACIÓN QA: Cerrojo Desalineado - Fricción Severa 4mm", w * 0.12, h * 0.80 + 38);
	}
}

// Shutter execution: feedback, capture, watermarking & hash
async function capturePhoto() {
	if (isCapturing) return;
	isCapturing = true;

	// 1. Audio feedback: 2-stage mechanical shutter click
	soundEngine.playCameraShutter();

	// 2. Dual-pulse haptic kick for heavy cowhide work gloves
	if (typeof navigator !== "undefined" && "vibrate" in navigator) {
		try {
			navigator.vibrate([120, 80, 120]);
		} catch {
			// Vibration ignored if blocked
		}
	}

	// 3. Screen flash animation
	isFlashing = true;
	setTimeout(() => {
		isFlashing = false;
	}, 150);

	try {
		// 4. Capture source to off-screen canvas
		const captureCanvas = document.createElement("canvas");
		const capW = 1920;
		const capH = 1080;
		captureCanvas.width = capW;
		captureCanvas.height = capH;
		const capCtx = captureCanvas.getContext("2d");

		if (!capCtx) {
			throw new Error("Unable to create capture 2D context");
		}

		if (!isSimulated && videoEl && videoEl.videoWidth > 0) {
			capCtx.drawImage(videoEl, 0, 0, capW, capH);
		} else if (fallbackCanvasEl) {
			capCtx.drawImage(fallbackCanvasEl, 0, 0, capW, capH);
		} else {
			// Plain fallback pattern if canvas unbound
			capCtx.fillStyle = "#0B3D47";
			capCtx.fillRect(0, 0, capW, capH);
			capCtx.fillStyle = "#00FF88";
			capCtx.font = "bold 42px monospace";
			capCtx.fillText("EVIDENCIA QA EN CAMPO - YESSYFY", 80, 200);
		}

		// 5. Burn industrial NOM-151 legal banner & compute SHA-256
		const watermarkResult = await watermarkCanvas(captureCanvas, {
			jobCode,
			phase,
			latitude,
			longitude,
			altitude,
			heading,
			timestamp: liveTimestamp,
		});

		// 6. Callback with tamper-evident payload
		onCapture({
			dataUrl: watermarkResult.dataUrl,
			sha256: watermarkResult.sha256,
			phase,
			latitude,
			longitude,
			altitude,
			timestamp: watermarkResult.timestamp,
		});

		// 7. Auto close
		onClose();
	} catch (err) {
		console.error("Camera capture failed:", err);
	} finally {
		isCapturing = false;
	}
}

// Lifecycle effect: handle open/close, timers & device orientation
$effect(() => {
	if (!open) {
		untrack(stopCamera);
		return;
	}

	// Only `open` should drive this effect. startCamera/stopCamera touch reactive
	// refs such as mediaStream; tracking those would stop a stream as soon as it
	// is assigned, then continuously request another one.
	untrack(startCamera);

	// Ticking NOM-151 timestamp (updates every 500ms)
	const timeInterval = setInterval(() => {
		liveTimestamp = formatNom151Timestamp();
	}, 500);

	// Device orientation listener for compass heading
	function handleOrientation(e: DeviceOrientationEvent) {
		if (e.alpha !== null) {
			heading = Math.round(e.alpha);
		}
	}

	if (typeof window !== "undefined" && "DeviceOrientationEvent" in window) {
		window.addEventListener("deviceorientation", handleOrientation);
	}

	// Keyboard shortcut: Escape to close
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			onClose();
		}
	}
	window.addEventListener("keydown", handleKeyDown);

	return () => {
		clearInterval(timeInterval);
		if (typeof window !== "undefined") {
			window.removeEventListener("deviceorientation", handleOrientation);
			window.removeEventListener("keydown", handleKeyDown);
		}
		untrack(stopCamera);
	};
});
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/95 text-white overflow-hidden select-none"
		role="dialog"
		aria-modal="true"
		aria-label="Visor de Cámara QA en Campo"
	>
		<!-- Camera / Fallback Viewport Container -->
		<div class="relative w-full h-full max-w-5xl max-h-[100dvh] flex flex-col justify-between bg-black overflow-hidden">
			
			<!-- Video Stream Element -->
			<video
				bind:this={videoEl}
				autoplay
				playsinline
				muted
				class="absolute inset-0 w-full h-full object-cover {isSimulated ? 'hidden' : 'block'}"
			></video>

			<!-- Procedural Fallback Canvas (1920x1080) -->
			<canvas
				bind:this={fallbackCanvasEl}
				width="1920"
				height="1080"
				class="absolute inset-0 w-full h-full object-contain bg-black {isSimulated ? 'block' : 'hidden'}"
			></canvas>

			<!-- 80,000 Lux Glare-Proof HUD Overlays -->
			<div class="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6">
				
				<!-- Rule of Thirds Grid -->
				<div class="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-25">
					<div class="border-r border-b border-[#00FF88]/40"></div>
					<div class="border-r border-b border-[#00FF88]/40"></div>
					<div class="border-b border-[#00FF88]/40"></div>
					<div class="border-r border-b border-[#00FF88]/40"></div>
					<div class="border-r border-b border-[#00FF88]/40"></div>
					<div class="border-b border-[#00FF88]/40"></div>
					<div class="border-r border-[#00FF88]/40"></div>
					<div class="border-r border-[#00FF88]/40"></div>
					<div></div>
				</div>

				<!-- Viewfinder Corner Brackets -->
				<div class="absolute inset-6 sm:inset-10 pointer-events-none">
					<!-- Top-Left -->
					<div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#00FF88]"></div>
					<!-- Top-Right -->
					<div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#00FF88]"></div>
					<!-- Bottom-Left -->
					<div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#00FF88]"></div>
					<!-- Bottom-Right -->
					<div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#00FF88]"></div>
				</div>

				<!-- Center Crosshairs / Reticle -->
				<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
					<!-- Central Reticle -->
					<div class="relative flex items-center justify-center">
						<div class="size-12 rounded-full border-2 border-[#00FF88]/60"></div>
						<div class="absolute w-8 h-0.5 bg-[#00FF88]"></div>
						<div class="absolute h-8 w-0.5 bg-[#00FF88]"></div>
						<div class="size-1 rounded-full bg-[#00FF88]"></div>
					</div>
				</div>

				<!-- TOP HUD BAR: Phase Badge & Telemetry Header -->
				<div class="relative z-10 flex items-center justify-between bg-black/80 backdrop-blur-md rounded-2xl p-3 border border-white/10 shadow-lg pointer-events-auto">
					<div class="flex items-center gap-3">
						<span class="badge badge-success font-black text-xs tracking-wider uppercase py-3 px-3">
							NOM-151
						</span>
						<div>
							<h3 class="text-sm font-black text-white leading-tight">
								{phaseLabel}
							</h3>
							<span class="text-[10px] font-mono text-white/70 block">
								ORD: {jobCode} {isSimulated ? `• ${SCENE_NAMES[simulationScene]}` : '• Cámara 1080p'}
							</span>
						</div>
					</div>

					<!-- 56px Touch Target: Close Viewfinder Button -->
					<button
						type="button"
						class="btn btn-circle btn-neutral min-h-[56px] min-w-[56px] text-white border-2 border-white/20 hover:bg-neutral-800 text-xl font-bold shadow-md cursor-pointer"
						onclick={onClose}
						aria-label="Cerrar Cámara"
					>
						✕
					</button>
				</div>

				<!-- BOTTOM HUD READOUT: GPS, Heading, CDMX Time & SHA-256 Guard -->
				<div class="relative z-10 flex flex-col gap-2 pointer-events-auto">
					<div class="bg-black/80 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-xs font-mono space-y-1 shadow-lg">
						<div class="flex flex-wrap items-center justify-between text-[11px] text-white/90">
							<span class="text-[#00FF88] font-bold">
								📍 GPS: {latitude.toFixed(4)}°, {longitude.toFixed(4)}° (±3m)
							</span>
							<span class="text-sky-300 font-bold">
								⛰️ ALT: {altitude}m  |  🧭 HDG: {heading}°
							</span>
						</div>
						<div class="flex items-center justify-between text-[10px] text-white/60 pt-0.5 border-t border-white/10">
							<span>🕒 {liveTimestamp}</span>
							<span class="text-[#00FF88] font-bold">🛡️ SHA-256 ON-DEVICE GUARANTEE</span>
						</div>
					</div>

					<!-- CONTROLS ROW: Gloved Ergonomics 56px / 72px Buttons -->
					<div class="flex items-center justify-around py-3 bg-black/70 backdrop-blur-md rounded-3xl border border-white/10 px-4">
						
						<!-- 56px Touch Target: Flashlight / Procedural Scene Switch -->
						{#if isSimulated}
							<button
								type="button"
								class="btn btn-neutral min-h-[56px] min-w-[56px] px-4 rounded-2xl border-2 border-white/20 text-white flex items-center justify-center gap-2 cursor-pointer hover:border-primary"
								onclick={cycleSimulatedScene}
								aria-label="Cambiar Escena Simulada"
							>
								<span class="text-xl">🔄</span>
								<span class="text-xs font-bold font-mono">Escena</span>
							</button>
						{:else}
							<button
								type="button"
								class="btn btn-circle btn-neutral min-h-[56px] min-w-[56px] border-2 border-white/20 text-white text-xl cursor-pointer hover:border-primary {torchOn ? 'btn-warning text-black' : ''}"
								onclick={toggleTorch}
								disabled={!hasTorchSupport}
								aria-label="Linterna / Flash"
							>
								🔦
							</button>
						{/if}

						<!-- 72px Tactile Shutter Button with Pulsing Concentric Green Ring -->
						<div class="relative flex items-center justify-center p-2">
							<button
								type="button"
								class="size-[72px] rounded-full bg-white hover:bg-white/90 active:scale-95 transition-transform shadow-2xl relative flex items-center justify-center cursor-pointer border-4 border-black/80 ring-4 ring-primary focus:outline-none disabled:opacity-50"
								onclick={capturePhoto}
								disabled={isCapturing}
								aria-label="Disparar Foto QA"
							>
								<!-- Concentric pulsing neon green ring -->
								<span class="absolute -inset-2.5 rounded-full border-2 border-[#00FF88] animate-pulse pointer-events-none"></span>
								<!-- Center tactile dot -->
								<span class="size-6 rounded-full bg-neutral-900 shadow-inner"></span>
							</button>
						</div>

						<!-- 56px Touch Target: Flip Camera (or Fallback Toggle) -->
						<button
							type="button"
							class="btn btn-circle btn-neutral min-h-[56px] min-w-[56px] border-2 border-white/20 text-white text-xl cursor-pointer hover:border-primary"
							onclick={switchCamera}
							aria-label="Voltear Cámara"
						>
							📷
						</button>
					</div>
				</div>
			</div>

			<!-- White Shutter Flash Layer -->
			{#if isFlashing}
				<div class="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-150"></div>
			{/if}
		</div>
	</div>
{/if}



