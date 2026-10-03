import { describe, it, expect } from "vitest";
import { createDefaultWeatherState, stepWeather, getScaledWaveParams } from "../src/weather.js";
import { heightAt, gerstnerDisplacement } from "../src/waves.js";

describe("Weather & Storm System", () => {
    it("initializes with default stormy intensity", () => {
        const weather = createDefaultWeatherState();
        expect(weather.stormIntensity).toBe(1.0);
        expect(weather.targetIntensity).toBe(1.0);
    });

    it("smoothly transitions weather intensity", () => {
        let weather = createDefaultWeatherState();
        weather.targetIntensity = 0.2; // Transitioning into 'The Quiet'
        weather.transitionSpeed = 0.1; // 0.1 per second

        // Step 2 seconds
        weather = stepWeather(weather, 2.0);
        expect(weather.stormIntensity).toBeCloseTo(0.8, 2);

        // Step 10 seconds (should clamp to target 0.2)
        weather = stepWeather(weather, 10.0);
        expect(weather.stormIntensity).toBeCloseTo(0.2, 2);
    });

    it("scales wave amplitude and displacement with storm intensity", () => {
        const calmWaves = getScaledWaveParams(0.0);
        const stormWaves = getScaledWaveParams(1.0);

        expect(calmWaves[0].amplitude).toBeLessThan(stormWaves[0].amplitude);

        const calmDisp = gerstnerDisplacement(10, 10, 5, 0.0);
        const stormDisp = gerstnerDisplacement(10, 10, 5, 1.0);

        // Storm displacement should be higher magnitude than calm
        expect(Math.abs(stormDisp.dy)).toBeGreaterThanOrEqual(Math.abs(calmDisp.dy));

        const calmHeight = heightAt(25, 30, 2, 0.0);
        const stormHeight = heightAt(25, 30, 2, 1.0);
        expect(typeof calmHeight).toBe("number");
        expect(typeof stormHeight).toBe("number");
    });

    it("schedules lightning strikes when storm intensity is high", () => {
        let weather = createDefaultWeatherState();
        weather.lightningTimer = 0.1; // trigger strike immediately
        weather.stormIntensity = 1.0;

        weather = stepWeather(weather, 0.2, 100, 100, () => 0.5);
        expect(weather.isLightningStriking).toBe(true);
        expect(weather.lightningIntensity).toBe(1.0);
        expect(weather.lightningTimer).toBeGreaterThan(0);
    });
});
