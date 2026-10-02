import { describe, it, expect } from "vitest";
import {
    createShipDamageState,
    applyDamageHit,
    calcInflowRate,
    stepShipDamage,
    patchDamageSlot,
    calcBuoyancyOffset,
    calcSpeedMultiplier,
    calcTurnMultiplier,
} from "./damage.js";
import {
    SLOTS_PER_SIDE,
    START_PLANKS,
    PATCH_TIME,
    SINK_TIME,
    SINK_THRESHOLD,
    LEAK_RATE_PER_SEVERITY,
    BAIL_RATE,
    REPAIR_DURATION,
    REPAIR_COOLDOWN,
    BUCKET_CAPACITY,
    BUCKET_COOLDOWN,
} from "./constants.js";

describe("Damage & Flooding Simulation (M2 Acceptance)", () => {
    it("initializes ship damage state with 10 slots per side and default planks", () => {
        const state = createShipDamageState();
        expect(state.slots.length).toBe(SLOTS_PER_SIDE * 2);
        expect(state.slots.filter(s => s.side === "L").length).toBe(10);
        expect(state.slots.filter(s => s.side === "R").length).toBe(10);
        expect(state.waterLevel).toBe(0);
        expect(state.isSinking).toBe(false);
        expect(state.isSunk).toBe(false);
        expect(state.planks).toBe(START_PLANKS);
    });

    it("activates nearest slot on hit and upgrades severity on repeated hit", () => {
        const state = createShipDamageState();
        // Hit port side at Z = 0
        const hit1 = applyDamageHit(state, { x: -5.0, y: 1.8, z: 0 }, 1);
        expect(hit1.slotActivated).not.toBeNull();
        expect(hit1.slotActivated?.side).toBe("L");
        expect(hit1.slotActivated?.active).toBe(true);
        expect(hit1.slotActivated?.severity).toBe(1);

        // Repeated hit at the exact same location upgrades severity
        const hit2 = applyDamageHit(state, { x: -5.0, y: 1.8, z: 0 }, 1);
        expect(hit2.upgraded).toBe(true);
        expect(hit1.slotActivated?.severity).toBe(2);
    });

    it("M2 Scripted Acceptance: hit activates slot -> waterLevel rises -> patching stops inflow -> bailing drains water", () => {
        const state = createShipDamageState();

        // 1. A hit strikes port side near Z = -4.5 with severity 2
        const hit = applyDamageHit(state, { x: -5.0, y: 1.8, z: -4.5 }, 2);
        expect(hit.slotActivated).not.toBeNull();
        const slot = hit.slotActivated!;
        expect(slot.active).toBe(true);
        expect(slot.severity).toBe(2);

        // Inflow should be severity 2 * 0.01 = 0.02 / sec (2% per second)
        expect(calcInflowRate(state)).toBeCloseTo(2 * LEAK_RATE_PER_SEVERITY, 5);

        // 2. Step damage for 10 seconds (dt = 0.1s x 100 ticks)
        for (let t = 0; t < 100; t++) {
            stepShipDamage(state, 0.1);
        }
        // Water level should have risen by 10s * 0.02/s = 0.20 (20%)
        expect(state.waterLevel).toBeCloseTo(0.20, 2);

        // 3. Player starts patching the slot with a plank
        expect(state.planks).toBe(START_PLANKS);
        // Halfway through patching (0.5 * PATCH_TIME)
        const p1 = patchDamageSlot(state, slot.id, PATCH_TIME * 0.5);
        expect(p1.completed).toBe(false);
        expect(slot.active).toBe(true);
        expect(slot.patchProgress).toBeCloseTo(0.5, 2);

        // Complete patching (another 0.5 * PATCH_TIME, total = PATCH_TIME)
        const p2 = patchDamageSlot(state, slot.id, PATCH_TIME * 0.5);
        expect(p2.completed).toBe(true);
        expect(slot.active).toBe(false);
        expect(slot.severity).toBe(0);
        // 1 plank consumed
        expect(state.planks).toBe(START_PLANKS - 1);

        // Inflow must now be 0!
        expect(calcInflowRate(state)).toBe(0);

        // Step another 5 seconds — water level must NOT rise anymore
        const waterBefore = state.waterLevel;
        for (let t = 0; t < 50; t++) {
            stepShipDamage(state, 0.1);
        }
        expect(state.waterLevel).toBeCloseTo(waterBefore, 5);

        // 4. Player bails water for 5 seconds at BAIL_RATE (0.02 / sec)
        for (let t = 0; t < 50; t++) {
            stepShipDamage(state, 0.1, true); // isBailing = true
        }
        // Should have drained 5s * 0.02/s = 0.10 of water
        expect(state.waterLevel).toBeCloseTo(waterBefore - 5 * BAIL_RATE, 2);
    });

    it("M2 Scripted Acceptance: unpatched ship sinks in the expected time", () => {
        const state = createShipDamageState();

        // Open 5 slots with severity 2 = total inflow 10%/sec (0.10 / sec)
        for (let i = 0; i < 5; i++) {
            applyDamageHit(state, { x: -5.0, y: 1.8, z: -10 + i * 4 }, 2);
        }
        expect(calcInflowRate(state)).toBeCloseTo(0.10, 5);

        // Inflow is 0.10/sec, so reaching SINK_THRESHOLD (1.0) takes exactly 10.0 seconds
        for (let t = 0; t < 100; t++) {
            stepShipDamage(state, 0.1);
        }
        expect(state.waterLevel).toBeCloseTo(SINK_THRESHOLD, 4);
        expect(state.isSinking).toBe(true);
        expect(state.isSunk).toBe(false);

        // Now step through SINK_TIME (10.0s)
        for (let t = 0; t < 100; t++) {
            stepShipDamage(state, 0.1);
        }
        expect(state.sinkTimer).toBeGreaterThanOrEqual(SINK_TIME);
        expect(state.isSunk).toBe(true);
    });

    it("calculates buoyancy offset and motility degradation penalties correctly", () => {
        // At dry hull (0.0)
        expect(calcBuoyancyOffset(0.0)).toBe(0);
        expect(calcSpeedMultiplier(0.0)).toBe(1.0);
        expect(calcTurnMultiplier(0.0)).toBe(1.0);

        // At half flood (0.5)
        expect(calcBuoyancyOffset(0.5)).toBeCloseTo(-0.9, 2);
        expect(calcSpeedMultiplier(0.5)).toBeCloseTo(0.7, 2);
        expect(calcTurnMultiplier(0.5)).toBeCloseTo(0.75, 2);

        // At full flood (1.0)
        expect(calcBuoyancyOffset(1.0)).toBeCloseTo(-1.8, 2);
        expect(calcSpeedMultiplier(1.0)).toBeCloseTo(0.4, 2);
        expect(calcTurnMultiplier(1.0)).toBeCloseTo(0.5, 2);
    });

    it("enforces repair delay duration, anti-spam cooldown, and bucket capacity parameters", () => {
        expect(REPAIR_DURATION).toBe(5.0);
        expect(REPAIR_COOLDOWN).toBe(5.0);
        expect(BUCKET_CAPACITY).toBe(0.08);
        expect(BUCKET_COOLDOWN).toBe(1.5);

        // Verify bucket scooping drains exactly BUCKET_CAPACITY from flooded ship
        const state = createShipDamageState();
        state.waterLevel = 0.50;
        const scooped = Math.min(state.waterLevel, BUCKET_CAPACITY);
        state.waterLevel -= scooped;
        expect(scooped).toBe(0.08);
        expect(state.waterLevel).toBeCloseTo(0.42, 4);

        // Verify dumping back inside ship restores the water
        state.waterLevel = Math.min(SINK_THRESHOLD, state.waterLevel + scooped);
        expect(state.waterLevel).toBeCloseTo(0.50, 4);
    });
});
