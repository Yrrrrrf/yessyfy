import { toastStore, type ToastPriority } from "@sdk/state";

export class SoundEngine {
	#ctx: AudioContext | null = null;
	#masterGain: GainNode | null = null;
	#volume = 0.22; // calibrated default volume (non-jarring)
	#isMuted = false;

	constructor() {
		// Auto-bind to toastStore on client instantiation
		if (typeof window !== "undefined") {
			toastStore.registerAudioDelegates(
				(priority) => this.playPriorityCue(priority),
				() => this.playWarmTick(),
			);
		}
	}

	#ensureContext(): AudioContext | null {
		if (typeof window === "undefined") return null;

		if (!this.#ctx) {
			const AudioContextClass =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext })
					.webkitAudioContext;
			if (!AudioContextClass) return null;

			this.#ctx = new AudioContextClass();
			this.#masterGain = this.#ctx.createGain();
			this.#masterGain.gain.setValueAtTime(
				this.#isMuted ? 0 : this.#volume,
				this.#ctx.currentTime,
			);
			this.#masterGain.connect(this.#ctx.destination);
		}

		if (this.#ctx.state === "suspended") {
			this.#ctx.resume().catch(() => {});
		}

		return this.#ctx;
	}

	setVolume(volume: number) {
		this.#volume = Math.max(0, Math.min(1, volume));
		if (this.#masterGain && this.#ctx && !this.#isMuted) {
			this.#masterGain.gain.setValueAtTime(this.#volume, this.#ctx.currentTime);
		}
	}

	setMuted(muted: boolean) {
		this.#isMuted = muted;
		toastStore.setMuted(muted);
		if (this.#masterGain && this.#ctx) {
			this.#masterGain.gain.setValueAtTime(
				muted ? 0 : this.#volume,
				this.#ctx.currentTime,
			);
		}
	}

	isMuted(): boolean {
		return this.#isMuted;
	}

	resetForTesting() {
		this.#ctx = null;
		this.#masterGain = null;
	}

	/**
	 * 440Hz Pop for Chat messages.
	 * Clean sine wave, rapid downward pitch bend (440Hz -> 310Hz), tight 90ms decay.
	 */
	playChatPop() {
		const ctx = this.#ensureContext();
		if (!ctx || !this.#masterGain || this.#isMuted) return;

		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = "sine";
		osc.frequency.setValueAtTime(440, now); // A4
		osc.frequency.exponentialRampToValueAtTime(310, now + 0.08);

		gain.gain.setValueAtTime(0.001, now);
		gain.gain.linearRampToValueAtTime(0.24, now + 0.008);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

		osc.connect(gain);
		gain.connect(this.#masterGain);

		osc.start(now);
		osc.stop(now + 0.095);
	}

	/**
	 * 880Hz Two-Tone for Emergency Dispatch / Technician Arrival.
	 * High-priority two-pulse alert: 880Hz (A5) then 1174.66Hz (D6).
	 */
	playDispatchAlert() {
		const ctx = this.#ensureContext();
		if (!ctx || !this.#masterGain || this.#isMuted) return;

		const now = ctx.currentTime;

		// Tone 1: 880 Hz (A5)
		const osc1 = ctx.createOscillator();
		const gain1 = ctx.createGain();
		osc1.type = "sine";
		osc1.frequency.setValueAtTime(880, now);

		gain1.gain.setValueAtTime(0.001, now);
		gain1.gain.linearRampToValueAtTime(0.3, now + 0.01);
		gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

		osc1.connect(gain1);
		gain1.connect(this.#masterGain);
		osc1.start(now);
		osc1.stop(now + 0.125);

		// Tone 2: 1174.66 Hz (D6) - delayed 130ms
		const osc2 = ctx.createOscillator();
		const gain2 = ctx.createGain();
		osc2.type = "sine";
		osc2.frequency.setValueAtTime(1174.66, now + 0.13);

		gain2.gain.setValueAtTime(0.001, now + 0.13);
		gain2.gain.linearRampToValueAtTime(0.32, now + 0.14);
		gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

		osc2.connect(gain2);
		gain2.connect(this.#masterGain);
		osc2.start(now + 0.13);
		osc2.stop(now + 0.39);
	}

	/**
	 * Gentle Triad Chime for Success (Escrow settled, payment verified, QA approved).
	 * Smooth ascending triad: C6 (1046.5Hz) -> E6 (1318.5Hz) -> G6 (1567.98Hz).
	 */
	playSuccessChime() {
		const ctx = this.#ensureContext();
		if (!ctx || !this.#masterGain || this.#isMuted) return;

		const now = ctx.currentTime;
		const triad = [1046.5, 1318.51, 1567.98];

		triad.forEach((freq, idx) => {
			if (!ctx || !this.#masterGain) return;
			const startTime = now + idx * 0.07;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = "sine";
			osc.frequency.setValueAtTime(freq, startTime);

			gain.gain.setValueAtTime(0.001, startTime);
			gain.gain.linearRampToValueAtTime(0.18, startTime + 0.01);
			gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.42);

			osc.connect(gain);
			gain.connect(this.#masterGain);

			osc.start(startTime);
			osc.stop(startTime + 0.43);
		});
	}

	/**
	 * Warm Mechanical Tick for Countdown (Auto-dismiss countdown & radar pulses).
	 * Gentle 1050Hz transient click with 18ms envelope.
	 */
	playWarmTick() {
		const ctx = this.#ensureContext();
		if (!ctx || !this.#masterGain || this.#isMuted) return;

		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = "triangle";
		osc.frequency.setValueAtTime(1050, now);
		osc.frequency.exponentialRampToValueAtTime(500, now + 0.016);

		gain.gain.setValueAtTime(0.001, now);
		gain.gain.linearRampToValueAtTime(0.12, now + 0.002);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

		osc.connect(gain);
		gain.connect(this.#masterGain);

		osc.start(now);
		osc.stop(now + 0.02);
	}

	/**
	 * Warning Tone (Escrow dispute, verification timeout).
	 * Descending interval: 620Hz -> 490Hz.
	 */
	playWarningTone() {
		const ctx = this.#ensureContext();
		if (!ctx || !this.#masterGain || this.#isMuted) return;

		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = "sine";
		osc.frequency.setValueAtTime(620, now);
		osc.frequency.exponentialRampToValueAtTime(490, now + 0.22);

		gain.gain.setValueAtTime(0.001, now);
		gain.gain.linearRampToValueAtTime(0.22, now + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

		osc.connect(gain);
		gain.connect(this.#masterGain);

		osc.start(now);
		osc.stop(now + 0.25);
	}

	/**
	 * Error Buzzer (SAT failure, invalid signature).
	 * Low 190Hz sawtooth tone with soft damping.
	 */
	playErrorBuzzer() {
		const ctx = this.#ensureContext();
		if (!ctx || !this.#masterGain || this.#isMuted) return;

		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = "sawtooth";
		osc.frequency.setValueAtTime(190, now);

		gain.gain.setValueAtTime(0.001, now);
		gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

		osc.connect(gain);
		gain.connect(this.#masterGain);

		osc.start(now);
		osc.stop(now + 0.29);
	}

	/**
	 * Synthesizes a 2-stage mechanical camera shutter sound:
	 * Stage 1: Front curtain snap (fast downward sweep ~1400Hz -> 180Hz, 30ms).
	 * Stage 2: Rear latch re-engagement (~65ms later: ~750Hz -> 110Hz, 40ms).
	 * 0 external MP3 dependencies.
	 */
	playCameraShutter() {
		const ctx = this.#ensureContext();
		if (!ctx || !this.#masterGain || this.#isMuted) return;

		const now = ctx.currentTime;

		// Stage 1: Front curtain snap
		const osc1 = ctx.createOscillator();
		const gain1 = ctx.createGain();
		osc1.type = "triangle";
		osc1.frequency.setValueAtTime(1400, now);
		osc1.frequency.exponentialRampToValueAtTime(180, now + 0.03);

		gain1.gain.setValueAtTime(0.001, now);
		gain1.gain.linearRampToValueAtTime(0.35, now + 0.003);
		gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

		osc1.connect(gain1);
		gain1.connect(this.#masterGain);
		osc1.start(now);
		osc1.stop(now + 0.04);

		// Stage 2: Rear latch re-engagement (~65ms later)
		const latchTime = now + 0.065;
		const osc2 = ctx.createOscillator();
		const gain2 = ctx.createGain();
		osc2.type = "square";
		osc2.frequency.setValueAtTime(750, latchTime);
		osc2.frequency.exponentialRampToValueAtTime(110, latchTime + 0.035);

		gain2.gain.setValueAtTime(0.001, latchTime);
		gain2.gain.linearRampToValueAtTime(0.28, latchTime + 0.003);
		gain2.gain.exponentialRampToValueAtTime(0.0001, latchTime + 0.045);

		osc2.connect(gain2);
		gain2.connect(this.#masterGain);
		osc2.start(latchTime);
		osc2.stop(latchTime + 0.05);
	}

	playPriorityCue(priority: ToastPriority) {
		switch (priority) {
			case "chat":
				this.playChatPop();
				break;
			case "dispatch":
				this.playDispatchAlert();
				break;
			case "success":
				this.playSuccessChime();
				break;
			case "warning":
				this.playWarningTone();
				break;
			case "error":
				this.playErrorBuzzer();
				break;
			default:
				this.playChatPop();
				break;
		}
	}
}

export const soundEngine = new SoundEngine();
