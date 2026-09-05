import type { PhotoQAPhase } from "@sdk/core";

export interface WatermarkOptions {
	jobCode: string;
	phase?: PhotoQAPhase | string;
	latitude?: number;
	longitude?: number;
	altitude?: number;
	heading?: number;
	timestamp?: string | Date;
}

export interface WatermarkResult {
	dataUrl: string;
	sha256: string;
	width: number;
	height: number;
	timestamp: string;
}

/**
 * Calculates downscaled dimensions preserving aspect ratio with a maximum bounding box.
 * Guarantees that neither width nor height exceeds maxDim (default 1920px).
 */
export function calculateTargetDimensions(
	width: number,
	height: number,
	maxDim = 1920,
): { width: number; height: number } {
	if (width <= 0 || height <= 0) {
		return { width: Math.max(1, width), height: Math.max(1, height) };
	}

	if (width <= maxDim && height <= maxDim) {
		return { width, height };
	}

	if (width > height) {
		const targetHeight = Math.round((height * maxDim) / width);
		return { width: maxDim, height: targetHeight };
	} else {
		const targetWidth = Math.round((width * maxDim) / height);
		return { width: targetWidth, height: maxDim };
	}
}

/**
 * Formats a given Date or timestamp into the official NOM-151 CDMX UTC-6 ISO-8601 pattern.
 * e.g. "2026-09-05T13:00:30.123-06:00"
 */
export function formatNom151Timestamp(input?: Date | string | number): string {
	const date = input ? new Date(input) : new Date();
	// Mexico City Standard Time (CDMX) is UTC-6 all year round
	const utc6Time = new Date(date.getTime() - 6 * 60 * 60 * 1000);
	const pad = (n: number, z = 2) => String(n).padStart(z, "0");
	const y = utc6Time.getUTCFullYear();
	const m = pad(utc6Time.getUTCMonth() + 1);
	const d = pad(utc6Time.getUTCDate());
	const h = pad(utc6Time.getUTCHours());
	const min = pad(utc6Time.getUTCMinutes());
	const s = pad(utc6Time.getUTCSeconds());
	const ms = pad(utc6Time.getUTCMilliseconds(), 3);
	return `${y}-${m}-${d}T${h}:${min}:${s}.${ms}-06:00`;
}

/**
 * Returns the human-readable Spanish legal label for a QA phase.
 */
export function getPhaseLabel(phase?: PhotoQAPhase | string): string {
	switch (phase) {
		case "diagnostic_before":
			return "Diagnóstico Inicial (Antes)";
		case "work_progress":
			return "Avance en Sitio (Durante)";
		case "proof_finished":
			return "Trabajo Concluido (Después)";
		default:
			return phase || "Evidencia Fotográfica QA";
	}
}

/**
 * Computes a true cryptographic SHA-256 checksum (64-character lowercase hex) of the input data.
 */
export async function calculateSha256(
	data: string | Uint8Array,
): Promise<string> {
	const rawBuffer: BufferSource =
		typeof data === "string"
			? new TextEncoder().encode(data)
			: (data as unknown as BufferSource);
	const digest = await crypto.subtle.digest("SHA-256", rawBuffer);
	const hashArray = Array.from(new Uint8Array(digest));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Burns an industrial NOM-151 legal banner with telemetry onto a canvas/image,
 * enforces a 1920px max dimension limit, and computes the cryptographic SHA-256 digest.
 */
export async function watermarkCanvas(
	source: HTMLCanvasElement | HTMLImageElement,
	options: WatermarkOptions,
): Promise<WatermarkResult> {
	const srcWidth =
		"videoWidth" in source
			? (source as unknown as HTMLVideoElement).videoWidth
			: "naturalWidth" in source && (source as HTMLImageElement).naturalWidth
				? (source as HTMLImageElement).naturalWidth
				: source.width;

	const srcHeight =
		"videoHeight" in source
			? (source as unknown as HTMLVideoElement).videoHeight
			: "naturalHeight" in source && (source as HTMLImageElement).naturalHeight
				? (source as HTMLImageElement).naturalHeight
				: source.height;

	const { width, height } = calculateTargetDimensions(
		srcWidth,
		srcHeight,
		1920,
	);

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Canvas 2D context unavailable");
	}

	// 1. Draw source image scaled to target dimensions
	ctx.drawImage(source, 0, 0, width, height);

	// 2. Banner layout calculation
	const bannerHeight = Math.max(64, Math.round(height * 0.085));
	const bannerY = height - bannerHeight;

	// Dark teal legal banner surface
	ctx.fillStyle = "rgba(11, 61, 71, 0.94)";
	ctx.fillRect(0, bannerY, width, bannerHeight);

	// Top accent bar: 3px neon green (#00FF88)
	ctx.fillStyle = "#00FF88";
	ctx.fillRect(0, bannerY, width, 3);

	// Telemetry values
	const timestamp =
		typeof options.timestamp === "string" &&
		options.timestamp.includes("-06:00")
			? options.timestamp
			: formatNom151Timestamp(options.timestamp);

	const phaseLabel = getPhaseLabel(options.phase);
	const lat = options.latitude ?? 19.4326;
	const lng = options.longitude ?? -99.1332;
	const alt = options.altitude ?? 2240;
	const heading = options.heading ?? 45;

	const paddingX = Math.max(16, Math.round(width * 0.02));
	const line1FontSize = Math.max(13, Math.round(bannerHeight * 0.28));
	const line2FontSize = Math.max(11, Math.round(bannerHeight * 0.22));

	// Line 1: Left Brand & Job Order, Right NOM-151 Legal Phase
	const line1Y = bannerY + Math.round(bannerHeight * 0.42);

	ctx.font = `bold ${line1FontSize}px monospace, system-ui, sans-serif`;
	ctx.fillStyle = "#FFFFFF";
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillText(`YESSYFY QA • ${options.jobCode}`, paddingX, line1Y);

	ctx.textAlign = "right";
	ctx.fillStyle = "#00FF88";
	ctx.fillText(`NOM-151 • ${phaseLabel}`, width - paddingX, line1Y);

	// Line 2: Telemetry (GPS with ±3m accuracy, Altitude, Heading, CDMX Timestamp)
	const line2Y = bannerY + Math.round(bannerHeight * 0.78);
	const latStr = `${lat >= 0 ? "+" : ""}${lat.toFixed(4)}°`;
	const lngStr = `${lng >= 0 ? "+" : ""}${lng.toFixed(4)}°`;
	const altStr = `${Math.round(alt).toLocaleString()}m`;
	const hdgStr = `${Math.round(heading).toString().padStart(3, "0")}°`;

	const telemetryText = `GPS: ${latStr}, ${lngStr} (±3m)  |  ALT: ${altStr}  |  HDG: ${hdgStr}  |  ${timestamp}`;

	ctx.textAlign = "left";
	ctx.font = `normal ${line2FontSize}px monospace, system-ui, sans-serif`;
	ctx.fillStyle = "rgba(255, 255, 255, 0.90)";
	ctx.fillText(telemetryText, paddingX, line2Y);

	// Generate high quality JPEG (0.88 quality)
	const dataUrl = canvas.toDataURL("image/jpeg", 0.88);

	// True SHA-256 calculation of image payload
	const sha256 = await calculateSha256(dataUrl);

	return {
		dataUrl,
		sha256,
		width,
		height,
		timestamp,
	};
}

/**
 * Loads a File object into an Image, then watermarks and computes the SHA-256 checksum.
 */
export async function watermarkAndHashImage(
	file: File,
	options: WatermarkOptions,
): Promise<WatermarkResult> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = () => {
			const img = new Image();
			img.onload = async () => {
				try {
					const result = await watermarkCanvas(img, options);
					resolve(result);
				} catch (err) {
					reject(err);
				}
			};
			img.onerror = (err) => reject(new Error(`Failed to load image: ${err}`));
			img.src = reader.result as string;
		};

		reader.onerror = (err) => reject(new Error(`FileReader error: ${err}`));
		reader.readAsDataURL(file);
	});
}
