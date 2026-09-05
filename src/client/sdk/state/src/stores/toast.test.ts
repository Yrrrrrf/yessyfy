import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { toastStore } from "./toast.svelte.ts";

describe("ToastStore Reactive System", () => {
	beforeEach(() => {
		toastStore.clear();
		toastStore.setMuted(false);
	});

	it("enqueues toasts with priority and auto-calculated durations", () => {
		const id = toastStore.success(
			"Pago Liberado",
			"Se han transferido los fondos Escrow.",
		);
		expect(toastStore.activeCount).toBe(1);

		const item = toastStore.toasts[0];
		expect(item.id).toBe(id);
		expect(item.priority).toBe("success");
		expect(item.title).toBe("Pago Liberado");
		expect(item.duration).toBe(4000);
		expect(item.remainingTime).toBe(4000);
		expect(item.progress).toBe(100);
	});

	it("enqueues emergency dispatch alert with 8500ms duration and tick sound", () => {
		const id = toastStore.dispatchAlert(
			"Técnico en Camino",
			"Roberto Morales se dirige al destino.",
		);
		const item = toastStore.toasts.find((t) => t.id === id);

		expect(item).toBeDefined();
		expect(item?.priority).toBe("dispatch");
		expect(item?.duration).toBe(8500);
		expect(item?.tickSound).toBe(true);
	});

	it("dismisses toasts manually", () => {
		const id = toastStore.info("Prueba", "Descripción de prueba");
		expect(toastStore.activeCount).toBe(1);

		toastStore.dismiss(id);
		expect(toastStore.activeCount).toBe(0);
	});

	it("clears all toasts completely", () => {
		toastStore.info("Notificación 1");
		toastStore.warning("Notificación 2");
		expect(toastStore.activeCount).toBe(2);

		toastStore.clear();
		expect(toastStore.activeCount).toBe(0);
		expect(toastStore.toasts.length).toBe(0);
	});

	it("pauses and resumes countdown", () => {
		const id = toastStore.warning("Garantía por vencer", "Faltan 2 días");
		const item = toastStore.toasts[0];

		expect(item.paused).toBe(false);
		toastStore.pause(id);
		expect(item.paused).toBe(true);

		toastStore.resume(id);
		expect(item.paused).toBe(false);
	});

	it("respects maximum stack limit of 5 items", () => {
		for (let i = 0; i < 7; i++) {
			toastStore.info(`Notificación ${i}`);
		}
		expect(toastStore.activeCount).toBe(5);
		expect(toastStore.toasts[4].title).toBe("Notificación 6");
	});

	it("toggles mute state properly", () => {
		expect(toastStore.isMuted).toBe(false);
		toastStore.toggleMute();
		expect(toastStore.isMuted).toBe(true);
		toastStore.toggleMute();
		expect(toastStore.isMuted).toBe(false);
	});

	it("invokes audio delegates on toast creation and respects mute state", () => {
		const chimeMock = vi.fn();
		const tickMock = vi.fn();
		toastStore.registerAudioDelegates(chimeMock, tickMock);

		toastStore.info("Audio On");
		expect(chimeMock).toHaveBeenCalledWith("info");

		toastStore.setMuted(true);
		toastStore.error("Muted Alert");
		expect(chimeMock).toHaveBeenCalledTimes(1);
	});
});
