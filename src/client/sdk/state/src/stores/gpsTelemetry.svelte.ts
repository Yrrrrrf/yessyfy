/**
 * Real-Time GPS Telemetry Simulation & 150m Geofence Engine (Leaflet 1.9.4 & Svelte 5)
 * Reference: docs/plans/PLAN_2_GPS_GEOFENCE.md
 */

/**
 * High-fidelity CDMX Polanco motorcycle route waypoints.
 * From Auditorio Nacional / Paseo de la Reforma to Av. Horacio 1420.
 */
export const CDMX_POLANCO_WAYPOINTS: Array<[number, number]> = [
	[19.4258, -99.1862], // Auditorio Nacional / Reforma
	[19.428, -99.189], // Gandhi y Reforma
	[19.4305, -99.1915], // Calzada Chivatito
	[19.4322, -99.1935], // Campos Elíseos
	[19.4348, -99.1912], // Arquímedes y Campos Elíseos
	[19.434, -99.192], // Horacio y Arquímedes
	[19.4332, -99.1926], // Horacio y Lope de Vega
	[19.4326, -99.1932], // Horacio 1420 Polanco V Sección (Destino)
];

/** Realistic CDMX urban motorcycle speed: 25 km/h ≈ 6.944 m/s */
export const CDMX_MOTO_SPEED_MPS = 25 / 3.6;

/** Standard arrival geofence perimeter radius in meters */
export const GEOFENCE_RADIUS_METERS = 150;

/** Cross-application telemetry broadcast channel */
export const TELEMETRY_BROADCAST_CHANNEL = "yessyfy_telemetry_broadcast_v1";

export interface TelemetryBroadcastPayload {
	type: "GEOFENCE_BREACH_ARRIVAL";
	distanceMeters: number;
	coords: [number, number];
	timestamp: number;
}

/**
 * Calculates sub-meter Great-Circle distance between two WGS84 coordinates using Haversine formula.
 */
export function calculateHaversineDistanceMeters(
	coord1: [number, number],
	coord2: [number, number],
): number {
	const R = 6371000; // Mean Earth radius in meters
	const dLat = ((coord2[0] - coord1[0]) * Math.PI) / 180;
	const dLng = ((coord2[1] - coord1[1]) * Math.PI) / 180;
	const lat1 = (coord1[0] * Math.PI) / 180;
	const lat2 = (coord2[0] * Math.PI) / 180;

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

/**
 * Calculates bearing angle (azimuth) in degrees [0, 360) from start to end coordinates.
 */
export function calculateBearingDegrees(
	start: [number, number],
	end: [number, number],
): number {
	const lat1 = (start[0] * Math.PI) / 180;
	const lat2 = (end[0] * Math.PI) / 180;
	const dLng = ((end[1] - start[1]) * Math.PI) / 180;

	const y = Math.sin(dLng) * Math.cos(lat2);
	const x =
		Math.cos(lat1) * Math.sin(lat2) -
		Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
	const brng = (Math.atan2(y, x) * 180) / Math.PI;
	return (brng + 360) % 360;
}

/**
 * Builds cumulative distance array along a sequence of waypoints.
 */
export function calculateCumulativeDistances(
	waypoints: Array<[number, number]>,
): number[] {
	const cumulative = [0];
	for (let i = 0; i < waypoints.length - 1; i++) {
		const dist = calculateHaversineDistanceMeters(
			waypoints[i],
			waypoints[i + 1],
		);
		cumulative.push(cumulative[i] + dist);
	}
	return cumulative;
}

/**
 * Calculates total route path distance in meters.
 */
export function calculateRouteDistance(
	waypoints: Array<[number, number]>,
): number {
	const cumulative = calculateCumulativeDistances(waypoints);
	return cumulative[cumulative.length - 1] ?? 0;
}

/**
 * Synthesizes 3-note arrival fanfare (D5 -> A5 -> D6) via Web Audio API.
 * D5: 587.33 Hz, A5: 880.00 Hz, D6: 1174.66 Hz.
 */
export function playArrivalFanfareAudio(): void {
	if (typeof window === "undefined") return;

	try {
		const AudioContextClass =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext })
				.webkitAudioContext;
		if (!AudioContextClass) return;

		const ctx = new AudioContextClass();
		if (ctx.state === "suspended") {
			ctx.resume().catch(() => {});
		}

		const notes = [
			{ freq: 587.33, start: 0.0, dur: 0.14 }, // D5
			{ freq: 880.0, start: 0.15, dur: 0.14 }, // A5
			{ freq: 1174.66, start: 0.3, dur: 0.38 }, // D6
		];

		const now = ctx.currentTime;
		for (const note of notes) {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = "sine";
			osc.frequency.setValueAtTime(note.freq, now + note.start);

			gain.gain.setValueAtTime(0.001, now + note.start);
			gain.gain.linearRampToValueAtTime(0.25, now + note.start + 0.015);
			gain.gain.exponentialRampToValueAtTime(
				0.0001,
				now + note.start + note.dur,
			);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now + note.start);
			osc.stop(now + note.start + note.dur + 0.01);
		}
	} catch {
		// Non-fatal if audio context is blocked by browser autoplay policies
	}
}

/**
 * Dispatches tactile haptic pulse: [200ms, 100ms, 200ms, 100ms, 400ms].
 */
export function triggerArrivalHaptic(): void {
	if (
		typeof navigator !== "undefined" &&
		typeof navigator.vibrate === "function"
	) {
		try {
			navigator.vibrate([200, 100, 200, 100, 400]);
		} catch {
			// Ignored if unsupported or restricted
		}
	}
}

/**
 * Broadcasts geofence breach arrival event across application instances.
 */
export function broadcastGeofenceBreach(
	distanceMeters: number,
	coords: [number, number],
): void {
	if (typeof window !== "undefined" && "BroadcastChannel" in window) {
		try {
			const channel = new BroadcastChannel(TELEMETRY_BROADCAST_CHANNEL);
			const payload: TelemetryBroadcastPayload = {
				type: "GEOFENCE_BREACH_ARRIVAL",
				distanceMeters,
				coords,
				timestamp: Date.now(),
			};
			channel.postMessage(payload);
			channel.close();
		} catch {
			// Ignored
		}
	}
}

/**
 * Svelte 5 Reactive GPS Telemetry Engine.
 */
export class GpsTelemetryEngine {
	readonly waypoints: Array<[number, number]>;
	readonly destination: [number, number];
	readonly cumulativeDistances: number[];
	readonly totalDistanceMeters: number;

	progress = $state(0);
	isPlaying = $state(false);
	playbackSpeed = $state<1 | 2 | 4>(1);
	hasBreachedGeofence = $state(false);

	#timerId: number | null = null;
	#onArriveCallback: ((distance: number) => void) | null = null;

	constructor(
		waypoints: Array<[number, number]> = CDMX_POLANCO_WAYPOINTS,
		destination?: [number, number],
	) {
		this.waypoints = waypoints;
		this.destination = destination ?? waypoints[waypoints.length - 1];
		this.cumulativeDistances = calculateCumulativeDistances(this.waypoints);
		this.totalDistanceMeters =
			this.cumulativeDistances[this.cumulativeDistances.length - 1] ?? 0;
	}

	/**
	 * Distance traveled in meters along the path.
	 */
	get distanceTraveledMeters(): number {
		return (this.totalDistanceMeters * this.progress) / 100;
	}

	/**
	 * Distance remaining to destination along the path.
	 */
	get distanceRemainingMeters(): number {
		return Math.max(0, this.totalDistanceMeters - this.distanceTraveledMeters);
	}

	/**
	 * Current interpolated [latitude, longitude].
	 */
	get currentCoords(): [number, number] {
		if (this.progress <= 0 || this.totalDistanceMeters === 0) {
			return this.waypoints[0];
		}
		if (this.progress >= 100) {
			return this.waypoints[this.waypoints.length - 1];
		}

		const targetDistance = this.distanceTraveledMeters;
		for (let i = 0; i < this.cumulativeDistances.length - 1; i++) {
			const dStart = this.cumulativeDistances[i];
			const dEnd = this.cumulativeDistances[i + 1];

			if (targetDistance >= dStart && targetDistance <= dEnd) {
				const segLen = dEnd - dStart;
				const t = segLen > 0 ? (targetDistance - dStart) / segLen : 0;
				const start = this.waypoints[i];
				const end = this.waypoints[i + 1];

				const lat = start[0] + t * (end[0] - start[0]);
				const lng = start[1] + t * (end[1] - start[1]);
				return [lat, lng];
			}
		}

		return this.waypoints[this.waypoints.length - 1];
	}

	/**
	 * Current heading bearing in degrees [0, 360).
	 */
	get heading(): number {
		if (this.progress <= 0) {
			return calculateBearingDegrees(this.waypoints[0], this.waypoints[1]);
		}
		if (this.progress >= 100) {
			const len = this.waypoints.length;
			return calculateBearingDegrees(
				this.waypoints[len - 2],
				this.waypoints[len - 1],
			);
		}

		const targetDistance = this.distanceTraveledMeters;
		for (let i = 0; i < this.cumulativeDistances.length - 1; i++) {
			const dStart = this.cumulativeDistances[i];
			const dEnd = this.cumulativeDistances[i + 1];

			if (targetDistance >= dStart && targetDistance <= dEnd) {
				return calculateBearingDegrees(
					this.waypoints[i],
					this.waypoints[i + 1],
				);
			}
		}

		const len = this.waypoints.length;
		return calculateBearingDegrees(
			this.waypoints[len - 2],
			this.waypoints[len - 1],
		);
	}

	/**
	 * Great-circle sub-meter distance from current position to client destination.
	 */
	get distanceToDestinationMeters(): number {
		return calculateHaversineDistanceMeters(
			this.currentCoords,
			this.destination,
		);
	}

	/**
	 * Boolean flag indicating whether the vehicle is inside the 150m geofence.
	 */
	get isInsideGeofence(): boolean {
		return this.distanceToDestinationMeters <= GEOFENCE_RADIUS_METERS;
	}

	/**
	 * Estimated time of arrival in dynamic minutes (0 when inside geofence).
	 */
	get etaMinutes(): number {
		if (this.isInsideGeofence) return 0;
		const seconds = this.distanceRemainingMeters / CDMX_MOTO_SPEED_MPS;
		return Math.max(1, Math.round(seconds / 60));
	}

	/**
	 * Polyline coordinate array of traveled route.
	 */
	get traveledPath(): Array<[number, number]> {
		if (this.progress <= 0) {
			return [this.waypoints[0]];
		}
		if (this.progress >= 100) {
			return [...this.waypoints];
		}

		const targetDistance = this.distanceTraveledMeters;
		const path: Array<[number, number]> = [];

		for (let i = 0; i < this.cumulativeDistances.length - 1; i++) {
			path.push(this.waypoints[i]);
			if (
				targetDistance >= this.cumulativeDistances[i] &&
				targetDistance <= this.cumulativeDistances[i + 1]
			) {
				path.push(this.currentCoords);
				return path;
			}
		}

		path.push(this.currentCoords);
		return path;
	}

	/**
	 * Polyline coordinate array of remaining route.
	 */
	get remainingPath(): Array<[number, number]> {
		if (this.progress >= 100) {
			return [this.waypoints[this.waypoints.length - 1]];
		}
		if (this.progress <= 0) {
			return [...this.waypoints];
		}

		const targetDistance = this.distanceTraveledMeters;
		const path: Array<[number, number]> = [this.currentCoords];

		for (let i = 0; i < this.cumulativeDistances.length - 1; i++) {
			if (
				targetDistance >= this.cumulativeDistances[i] &&
				targetDistance <= this.cumulativeDistances[i + 1]
			) {
				for (let j = i + 1; j < this.waypoints.length; j++) {
					path.push(this.waypoints[j]);
				}
				return path;
			}
		}

		return path;
	}

	/**
	 * Sets scrub progress [0, 100] and triggers geofence event when entering perimeter.
	 */
	setProgress(percent: number): void {
		const clamped = Math.max(0, Math.min(100, percent));
		this.progress = clamped;

		if (this.isInsideGeofence && !this.hasBreachedGeofence) {
			this.hasBreachedGeofence = true;
			playArrivalFanfareAudio();
			triggerArrivalHaptic();
			broadcastGeofenceBreach(
				this.distanceToDestinationMeters,
				this.currentCoords,
			);
			this.#onArriveCallback?.(this.distanceToDestinationMeters);
		}
	}

	/**
	 * Starts or resumes telemetry playback.
	 */
	play(): void {
		if (this.isPlaying) return;
		if (this.progress >= 100) {
			this.reset();
		}
		this.isPlaying = true;

		const intervalMs = 50;
		// Standard full route simulation duration at 1x is 30 seconds
		const percentPerInterval = (intervalMs / (30 * 1000)) * 100;

		this.#timerId = (globalThis as unknown as Window).setInterval(() => {
			const nextProgress =
				this.progress + percentPerInterval * this.playbackSpeed;
			if (nextProgress >= 100) {
				this.setProgress(100);
				this.pause();
			} else {
				this.setProgress(nextProgress);
			}
		}, intervalMs);
	}

	/**
	 * Pauses telemetry playback.
	 */
	pause(): void {
		this.isPlaying = false;
		if (this.#timerId !== null) {
			clearInterval(this.#timerId);
			this.#timerId = null;
		}
	}

	/**
	 * Toggles playback between play and pause.
	 */
	togglePlay(): void {
		if (this.isPlaying) {
			this.pause();
		} else {
			this.play();
		}
	}

	/**
	 * Resets simulation to starting state.
	 */
	reset(): void {
		this.pause();
		this.progress = 0;
		this.hasBreachedGeofence = false;
	}

	/**
	 * Sets playback simulation multiplier (1x, 2x, 4x).
	 */
	setPlaybackSpeed(speed: 1 | 2 | 4): void {
		this.playbackSpeed = speed;
	}

	/**
	 * Registers a callback executed when entering the 150m geofence.
	 */
	setOnArriveCallback(cb: (distance: number) => void): void {
		this.#onArriveCallback = cb;
	}
}

/** Default singleton instance for app-wide reactive binding */
export const gpsTelemetryStore: GpsTelemetryEngine = new GpsTelemetryEngine();
