import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { soundEngine } from "./soundEngine.ts";

describe("SoundEngine Web Audio Synthesizer", () => {
	let mockOsc: {
		type: string;
		frequency: {
			setValueAtTime: ReturnType<typeof vi.fn>;
			exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
		};
		connect: ReturnType<typeof vi.fn>;
		start: ReturnType<typeof vi.fn>;
		stop: ReturnType<typeof vi.fn>;
	};
	let mockGain: {
		gain: {
			setValueAtTime: ReturnType<typeof vi.fn>;
			linearRampToValueAtTime: ReturnType<typeof vi.fn>;
			exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
		};
		connect: ReturnType<typeof vi.fn>;
	};
	let mockCtx: {
		currentTime: number;
		state: string;
		createOscillator: ReturnType<typeof vi.fn>;
		createGain: ReturnType<typeof vi.fn>;
		destination: Record<string, unknown>;
		resume: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		mockOsc = {
			type: "sine",
			frequency: {
				setValueAtTime: vi.fn(),
				exponentialRampToValueAtTime: vi.fn(),
			},
			connect: vi.fn(),
			start: vi.fn(),
			stop: vi.fn(),
		};

		mockGain = {
			gain: {
				setValueAtTime: vi.fn(),
				linearRampToValueAtTime: vi.fn(),
				exponentialRampToValueAtTime: vi.fn(),
			},
			connect: vi.fn(),
		};

		mockCtx = {
			currentTime: 10,
			state: "running",
			createOscillator: vi.fn(() => mockOsc),
			createGain: vi.fn(() => mockGain),
			destination: {},
			resume: vi.fn().mockResolvedValue(undefined),
		};

		class MockAudioContext {
			constructor() {
				Object.assign(this, mockCtx);
			}
		}
		if (typeof window === "undefined") {
			(globalThis as unknown as { window: unknown }).window = globalThis;
		} else {
			(window as unknown as { AudioContext: unknown }).AudioContext =
				MockAudioContext;
		}
		(globalThis as unknown as { AudioContext: unknown }).AudioContext =
			MockAudioContext;
		soundEngine.resetForTesting();
		soundEngine.setMuted(false);
	});

	it("synthesizes 440Hz pop for chat with pitch bend and decay", () => {
		soundEngine.playChatPop();

		expect(mockCtx.createOscillator).toHaveBeenCalled();
		expect(mockOsc.frequency.setValueAtTime).toHaveBeenCalledWith(440, 10);
		expect(mockOsc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
			310,
			10.08,
		);
		expect(mockOsc.start).toHaveBeenCalledWith(10);
		expect(mockOsc.stop).toHaveBeenCalledWith(10.095);
	});

	it("synthesizes 880Hz two-tone alert for emergency dispatch", () => {
		soundEngine.playDispatchAlert();

		expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
		expect(mockOsc.frequency.setValueAtTime).toHaveBeenCalledWith(880, 10);
		expect(mockOsc.frequency.setValueAtTime).toHaveBeenCalledWith(
			1174.66,
			10.13,
		);
	});

	it("synthesizes ascending triad chime for success", () => {
		soundEngine.playSuccessChime();

		expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3);
		expect(mockOsc.frequency.setValueAtTime).toHaveBeenCalledWith(1046.5, 10);
		expect(mockOsc.frequency.setValueAtTime).toHaveBeenCalledWith(
			1318.51,
			10.07,
		);
		expect(mockOsc.frequency.setValueAtTime).toHaveBeenCalledWith(
			1567.98,
			10.14,
		);
	});

	it("synthesizes 2-stage mechanical shutter click with curtain snap and rear latch", () => {
		soundEngine.playCameraShutter();

		expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
		expect(mockOsc.frequency.setValueAtTime).toHaveBeenCalledWith(1400, 10);
		expect(mockOsc.frequency.setValueAtTime).toHaveBeenCalledWith(750, 10.065);
	});

	it("does not synthesize when muted", () => {
		soundEngine.setMuted(true);
		soundEngine.playDispatchAlert();
		expect(mockCtx.createOscillator).not.toHaveBeenCalled();
	});

	it("synthesizes 1050Hz warm mechanical tick with triangle wave", () => {
		soundEngine.playWarmTick();

		expect(mockCtx.createOscillator).toHaveBeenCalledTimes(1);
		expect(mockOsc.type).toBe("triangle");
		expect(mockOsc.frequency.setValueAtTime).toHaveBeenCalledWith(1050, 10);
		expect(mockOsc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
			500,
			10.016,
		);
		expect(mockOsc.start).toHaveBeenCalledWith(10);
		expect(mockOsc.stop).toHaveBeenCalledWith(10.02);
	});

	it("synthesizes 620Hz descending warning tone", () => {
		soundEngine.playWarningTone();

		expect(mockCtx.createOscillator).toHaveBeenCalledTimes(1);
		expect(mockOsc.type).toBe("sine");
		expect(mockOsc.frequency.setValueAtTime).toHaveBeenCalledWith(620, 10);
		expect(mockOsc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
			490,
			10.22,
		);
		expect(mockOsc.start).toHaveBeenCalledWith(10);
		expect(mockOsc.stop).toHaveBeenCalledWith(10.25);
	});

	it("synthesizes 190Hz error buzzer with sawtooth wave", () => {
		soundEngine.playErrorBuzzer();

		expect(mockCtx.createOscillator).toHaveBeenCalledTimes(1);
		expect(mockOsc.type).toBe("sawtooth");
		expect(mockOsc.frequency.setValueAtTime).toHaveBeenCalledWith(190, 10);
		expect(mockOsc.start).toHaveBeenCalledWith(10);
		expect(mockOsc.stop).toHaveBeenCalledWith(10.29);
	});

	it("delegates priority cues appropriately", () => {
		const popSpy = vi.spyOn(soundEngine, "playChatPop");
		const dispatchSpy = vi.spyOn(soundEngine, "playDispatchAlert");
		const successSpy = vi.spyOn(soundEngine, "playSuccessChime");
		const warningSpy = vi.spyOn(soundEngine, "playWarningTone");
		const errorSpy = vi.spyOn(soundEngine, "playErrorBuzzer");

		soundEngine.playPriorityCue("chat");
		expect(popSpy).toHaveBeenCalledTimes(1);

		soundEngine.playPriorityCue("dispatch");
		expect(dispatchSpy).toHaveBeenCalledTimes(1);

		soundEngine.playPriorityCue("success");
		expect(successSpy).toHaveBeenCalledTimes(1);

		soundEngine.playPriorityCue("warning");
		expect(warningSpy).toHaveBeenCalledTimes(1);

		soundEngine.playPriorityCue("error");
		expect(errorSpy).toHaveBeenCalledTimes(1);

		soundEngine.playPriorityCue("info");
		expect(popSpy).toHaveBeenCalledTimes(2);
	});

	it("adjusts volume within clamped [0, 1] range", () => {
		soundEngine.setVolume(0.5);
		soundEngine.playChatPop();
		expect(mockGain.gain.setValueAtTime).toHaveBeenCalled();

		soundEngine.setVolume(1.5); // should clamp to 1
		soundEngine.setVolume(-0.5); // should clamp to 0
	});
});
