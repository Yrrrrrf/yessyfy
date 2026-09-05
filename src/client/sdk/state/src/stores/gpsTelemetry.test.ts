import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
	calculateBearingDegrees,
	calculateHaversineDistanceMeters,
	calculateRouteDistance,
	CDMX_POLANCO_WAYPOINTS,
	GpsTelemetryEngine,
	gpsTelemetryStore,
} from "./gpsTelemetry.svelte.ts";

describe("GPS Telemetry & Geofence Engine", () => {
	beforeEach(() => {
		gpsTelemetryStore.reset();
	});

	it("calculates Haversine distance correctly for CDMX Polanco route", () => {
		const start = CDMX_POLANCO_WAYPOINTS[0];
		const destination =
			CDMX_POLANCO_WAYPOINTS[CDMX_POLANCO_WAYPOINTS.length - 1];

		// Great-circle distance between Reforma Auditorio and Horacio 1420 is ~1.05 km
		const directDistance = calculateHaversineDistanceMeters(start, destination);
		expect(directDistance).toBeGreaterThan(1000);
		expect(directDistance).toBeLessThan(1200);

		// Full road route cumulative distance is approximately ~1.85 - 2.1 km
		const totalRouteDistance = calculateRouteDistance(CDMX_POLANCO_WAYPOINTS);
		expect(totalRouteDistance).toBeGreaterThan(1700);
		expect(totalRouteDistance).toBeLessThan(2300);
	});

	it("calculates bearing angle within [0, 360) degrees", () => {
		// Due North
		const bearingNorth = calculateBearingDegrees(
			[19.4, -99.15],
			[19.45, -99.15],
		);
		expect(bearingNorth).toBeGreaterThanOrEqual(0);
		expect(bearingNorth).toBeLessThan(360);
		expect(Math.round(bearingNorth)).toBe(0);

		// Due East
		const bearingEast = calculateBearingDegrees([19.4, -99.2], [19.4, -99.15]);
		expect(bearingEast).toBeGreaterThanOrEqual(0);
		expect(bearingEast).toBeLessThan(360);
		expect(Math.round(bearingEast)).toBe(90);

		// Real route segment bearing
		const segmentBearing = calculateBearingDegrees(
			CDMX_POLANCO_WAYPOINTS[0],
			CDMX_POLANCO_WAYPOINTS[1],
		);
		expect(segmentBearing).toBeGreaterThanOrEqual(0);
		expect(segmentBearing).toBeLessThan(360);
	});

	it("manages GpsTelemetryEngine lifecycle across 0%, 50%, 100%, and reset", () => {
		const engine = new GpsTelemetryEngine();
		const arriveCallback = vi.fn();
		engine.setOnArriveCallback(arriveCallback);

		// 1. Initial state (0% progress)
		expect(engine.progress).toBe(0);
		expect(engine.isInsideGeofence).toBe(false);
		expect(engine.hasBreachedGeofence).toBe(false);
		expect(engine.distanceRemainingMeters).toBeGreaterThan(1500);
		expect(engine.distanceTraveledMeters).toBe(0);
		expect(engine.currentCoords[0]).toBeCloseTo(
			CDMX_POLANCO_WAYPOINTS[0][0],
			4,
		);
		expect(engine.currentCoords[1]).toBeCloseTo(
			CDMX_POLANCO_WAYPOINTS[0][1],
			4,
		);
		expect(engine.traveledPath.length).toBe(1);
		expect(engine.remainingPath.length).toBe(CDMX_POLANCO_WAYPOINTS.length);
		expect(arriveCallback).not.toHaveBeenCalled();

		// 2. 50% scrub
		engine.setProgress(50);
		expect(engine.progress).toBe(50);
		expect(engine.distanceTraveledMeters).toBeGreaterThan(0);
		expect(engine.distanceRemainingMeters).toBeGreaterThan(0);
		expect(
			engine.distanceTraveledMeters + engine.distanceRemainingMeters,
		).toBeCloseTo(engine.totalDistanceMeters, 1);
		expect(engine.traveledPath.length).toBeGreaterThan(1);
		expect(engine.remainingPath.length).toBeGreaterThan(1);
		// Traveled path ends at currentCoords, remaining path starts at currentCoords
		const lastTraveled = engine.traveledPath[engine.traveledPath.length - 1];
		const firstRemaining = engine.remainingPath[0];
		expect(lastTraveled[0]).toBeCloseTo(engine.currentCoords[0], 5);
		expect(lastTraveled[1]).toBeCloseTo(engine.currentCoords[1], 5);
		expect(firstRemaining[0]).toBeCloseTo(engine.currentCoords[0], 5);
		expect(firstRemaining[1]).toBeCloseTo(engine.currentCoords[1], 5);
		expect(arriveCallback).not.toHaveBeenCalled();

		// 3. 100% progress
		engine.setProgress(100);
		expect(engine.progress).toBe(100);
		expect(engine.isInsideGeofence).toBe(true);
		expect(engine.hasBreachedGeofence).toBe(true);
		expect(engine.distanceRemainingMeters).toBe(0);
		expect(engine.distanceToDestinationMeters).toBeLessThanOrEqual(150);
		expect(engine.etaMinutes).toBe(0);
		expect(arriveCallback).toHaveBeenCalledTimes(1);

		// Setting progress again at 100% should not re-trigger callback
		engine.setProgress(100);
		expect(arriveCallback).toHaveBeenCalledTimes(1);

		// 4. Reset restores progress to 0% and resets geofence flags
		engine.reset();
		expect(engine.progress).toBe(0);
		expect(engine.isInsideGeofence).toBe(false);
		expect(engine.hasBreachedGeofence).toBe(false);
		expect(engine.distanceRemainingMeters).toBeGreaterThan(1500);
	});
});
