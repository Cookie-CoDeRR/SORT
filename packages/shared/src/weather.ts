// ── Weather & Storm Simulation (Deterministic & Shared) ───────────────────
import { WAVE_PARAMS } from "./constants.js";

export interface WeatherState {
    stormIntensity: number;   // 0.0 (calm) to 1.0 (screaming gale)
    targetIntensity: number;
    transitionSpeed: number;  // intensity change per second
    lightningTimer: number;   // seconds until next scheduled lightning
    isLightningStriking: boolean;
    lightningIntensity: number; // 0 to 1 brightness
    lightningCoord: { x: number; z: number };
}

export interface RogueWaveState {
    active: boolean;
    progress: number;         // 0 to 1
    direction: { x: number; z: number };
    amplitude: number;
    peakTime: number;
}

export function createDefaultWeatherState(): WeatherState {
    return {
        stormIntensity: 1.0,  // Chapter 1 opens in a severe storm
        targetIntensity: 1.0,
        transitionSpeed: 0.1,
        lightningTimer: 5.0,
        isLightningStriking: false,
        lightningIntensity: 0.0,
        lightningCoord: { x: 0, z: 0 }
    };
}

/**
 * Updates weather state deterministically with a fixed dt.
 */
export function stepWeather(
    state: WeatherState,
    dt: number,
    shipX: number = 0,
    shipZ: number = 0,
    rand: () => number = Math.random
): WeatherState {
    const next = { ...state };

    // Smoothly transition intensity toward target
    if (next.stormIntensity < next.targetIntensity) {
        next.stormIntensity = Math.min(next.targetIntensity, next.stormIntensity + next.transitionSpeed * dt);
    } else if (next.stormIntensity > next.targetIntensity) {
        next.stormIntensity = Math.max(next.targetIntensity, next.stormIntensity - next.transitionSpeed * dt);
    }

    // Flash decay
    if (next.isLightningStriking) {
        next.lightningIntensity -= dt * 3.5;
        if (next.lightningIntensity <= 0) {
            next.lightningIntensity = 0;
            next.isLightningStriking = false;
        }
    }

    // Lightning scheduling based on storm intensity
    if (next.stormIntensity > 0.15) {
        next.lightningTimer -= dt;
        if (next.lightningTimer <= 0) {
            // Trigger lightning flash
            next.isLightningStriking = true;
            next.lightningIntensity = 1.0;
            // Lightning strikes in the vicinity of the ship or forward
            const angle = rand() * Math.PI * 2;
            const dist = 300 + rand() * 1200;
            next.lightningCoord = {
                x: shipX + Math.cos(angle) * dist,
                z: shipZ + Math.sin(angle) * dist
            };
            // Next interval: shorter for higher intensity (4s - 14s at storm 1.0, 15s - 35s at storm 0.3)
            const minTime = 3.0 / Math.max(0.2, next.stormIntensity);
            const varTime = 8.0 / Math.max(0.2, next.stormIntensity);
            next.lightningTimer = minTime + rand() * varTime;
        }
    } else {
        next.isLightningStriking = false;
        next.lightningIntensity = 0;
    }

    return next;
}

/**
 * Calculates dynamic wave parameters based on storm intensity (0..1)
 */
export function getScaledWaveParams(stormIntensity: number) {
    // At intensity 0.0 (calm): low height, gentle swell
    // At intensity 1.0 (full storm): huge cresting waves
    const mult = 0.25 + 0.75 * Math.max(0, Math.min(1.0, stormIntensity));
    return WAVE_PARAMS.map(w => ({
        ...w,
        amplitude: w.amplitude * mult,
        steepness: w.steepness * (0.6 + 0.4 * mult)
    }));
}
