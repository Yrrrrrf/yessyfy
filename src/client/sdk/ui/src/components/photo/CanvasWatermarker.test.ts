import { describe, expect, it } from "vite-plus/test";
import {
	calculateSha256,
	calculateTargetDimensions,
	formatNom151Timestamp,
	getPhaseLabel,
} from "./CanvasWatermarker.ts";

describe("CanvasWatermarker NOM-151 & SHA-256 Engine", () => {
	describe("calculateSha256", () => {
		it("generates a 64-character lowercase hex string", async () => {
			const hash = await calculateSha256("YESSYFY-NOM-151-QA-TEST");
			expect(hash).toHaveLength(64);
			expect(hash).toMatch(/^[0-9a-f]{64}$/);
		});

		it("matches known cryptographic test vector for empty string", async () => {
			const emptyHash = await calculateSha256("");
			expect(emptyHash).toBe(
				"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			);
		});

		it("matches known cryptographic test vector for 'hello world'", async () => {
			const helloHash = await calculateSha256("hello world");
			expect(helloHash).toBe(
				"b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
			);
		});

		it("hashes binary Uint8Array data identically to string encoding", async () => {
			const text = "YESSYFY_ESCROW_PROTECTED_DATA";
			const strHash = await calculateSha256(text);
			const binHash = await calculateSha256(new TextEncoder().encode(text));
			expect(binHash).toBe(strHash);
		});
	});

	describe("Memory downsampling (calculateTargetDimensions)", () => {
		it("scales 4000x3000 landscape images down to 1920x1440", () => {
			const dims = calculateTargetDimensions(4000, 3000, 1920);
			expect(dims.width).toBe(1920);
			expect(dims.height).toBe(1440);
		});

		it("scales 3000x4000 portrait images down to 1440x1920", () => {
			const dims = calculateTargetDimensions(3000, 4000, 1920);
			expect(dims.width).toBe(1440);
			expect(dims.height).toBe(1920);
		});

		it("scales 2500x2500 square images down to 1920x1920", () => {
			const dims = calculateTargetDimensions(2500, 2500, 1920);
			expect(dims.width).toBe(1920);
			expect(dims.height).toBe(1920);
		});

		it("does not upscale images smaller than the 1920px bound", () => {
			const dims = calculateTargetDimensions(1280, 720, 1920);
			expect(dims.width).toBe(1280);
			expect(dims.height).toBe(720);
		});
	});

	describe("NOM-151 CDMX UTC-6 timestamp formatting", () => {
		it("formats timestamps strictly matching the UTC-6 ISO-8601 pattern", () => {
			const formatted = formatNom151Timestamp();
			expect(formatted).toMatch(
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}-06:00$/,
			);
		});

		it("accurately converts UTC 19:00:00 to CDMX UTC-6 13:00:00", () => {
			const testDate = new Date("2026-09-05T19:00:00.123Z");
			const formatted = formatNom151Timestamp(testDate);
			expect(formatted).toBe("2026-09-05T13:00:00.123-06:00");
		});

		it("handles day-boundary rollbacks when converting to UTC-6", () => {
			// Midnight UTC on Sept 6 should be 18:00 on Sept 5 in CDMX
			const testDate = new Date("2026-09-06T00:00:00.000Z");
			const formatted = formatNom151Timestamp(testDate);
			expect(formatted).toBe("2026-09-05T18:00:00.000-06:00");
		});
	});

	describe("Official QA phase labels", () => {
		it("maps all three core QA phases to Mexican trade legal labels", () => {
			expect(getPhaseLabel("diagnostic_before")).toBe(
				"Diagnóstico Inicial (Antes)",
			);
			expect(getPhaseLabel("work_progress")).toBe("Avance en Sitio (Durante)");
			expect(getPhaseLabel("proof_finished")).toBe(
				"Trabajo Concluido (Después)",
			);
		});

		it("gracefully falls back for custom or undefined phases", () => {
			expect(getPhaseLabel("custom_inspection")).toBe("custom_inspection");
			expect(getPhaseLabel(undefined)).toBe("Evidencia Fotográfica QA");
		});
	});
});
