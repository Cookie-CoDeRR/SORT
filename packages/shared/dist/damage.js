/**
 * Damage and Flooding simulation for Corsair Arena.
 * Pure math/sim logic - runs identically on client and server.
 *
 * Each ship has SLOTS_PER_SIDE damage slots on port and starboard.
 * Cannonball hits activate the nearest slot with a leak severity (1..3).
 * Inflow fills the bilge waterLevel over time.
 * Planks can be consumed to patch leaks, and players can bail bilge water.
 */
import { SLOTS_PER_SIDE, DAMAGE_SLOT_RADIUS, LEAK_RATE_PER_SEVERITY, BAIL_RATE, SINK_THRESHOLD, PATCH_TIME, START_PLANKS, SINK_TIME, MAX_BUOYANCY_OFFSET, SHIP_HALF_WIDTH, } from "./constants.js";
/**
 * Creates an initialized ship damage state with 10 slots per side.
 */
export function createShipDamageState(startingPlanks = START_PLANKS) {
    const slots = [];
    let id = 0;
    for (const side of ["L", "R"]) {
        const sign = side === "L" ? -1 : 1;
        const x = sign * SHIP_HALF_WIDTH;
        for (let i = 0; i < SLOTS_PER_SIDE; i++) {
            // Distribute slots evenly along the lower hull waterline (Z in [-13.5, 13.5])
            const z = -13.5 + (i / (SLOTS_PER_SIDE - 1)) * 27.0;
            const y = 1.8; // Lower hull waterline height
            slots.push({
                id: id++,
                side,
                index: i,
                localPos: { x, y, z },
                active: false,
                severity: 0,
                patchProgress: 0,
            });
        }
    }
    return {
        slots,
        waterLevel: 0,
        isSinking: false,
        sinkTimer: 0,
        isSunk: false,
        planks: startingPlanks,
        structuralDamage: 0,
    };
}
/**
 * Calculates distance between two 3D points.
 */
function distSq(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
}
/**
 * Maps a projectile hit on the hull to a damage slot on the impacted side.
 * - Activates nearest inactive slot within DAMAGE_SLOT_RADIUS.
 * - If already active, upgrades severity up to 3.
 * - If all slots are full, applies bonus structural damage.
 */
export function applyDamageHit(state, localHitPos, hitSeverity = 1) {
    const side = localHitPos.x < 0 ? "L" : "R";
    const sideSlots = state.slots.filter(s => s.side === side);
    const radiusSq = DAMAGE_SLOT_RADIUS * DAMAGE_SLOT_RADIUS;
    // 1. Find the closest slot on the impacted side
    let closestSlot = null;
    let closestDist = Infinity;
    for (const slot of sideSlots) {
        const d = distSq(slot.localPos, localHitPos);
        if (d < closestDist) {
            closestDist = d;
            closestSlot = slot;
        }
    }
    if (!closestSlot || closestDist > radiusSq) {
        // Outside any slot radius -> structural damage
        state.structuralDamage += 10;
        state.waterLevel = Math.min(SINK_THRESHOLD, state.waterLevel + 0.05);
        return { slotActivated: null, upgraded: false, structuralBonus: true };
    }
    // If the closest slot is inactive, activate it
    if (!closestSlot.active) {
        closestSlot.active = true;
        closestSlot.severity = Math.min(3, Math.max(1, hitSeverity));
        closestSlot.patchProgress = 0;
        return { slotActivated: closestSlot, upgraded: false, structuralBonus: false };
    }
    // If the closest slot is already active and severity < 3, upgrade severity
    if (closestSlot.severity < 3) {
        closestSlot.severity += 1;
        return { slotActivated: closestSlot, upgraded: true, structuralBonus: false };
    }
    // If closest slot is at max severity (3), check if there is an alternate inactive slot within radius
    let altInactive = null;
    let altInactiveDist = Infinity;
    for (const slot of sideSlots) {
        if (!slot.active) {
            const d = distSq(slot.localPos, localHitPos);
            if (d < altInactiveDist && d <= radiusSq) {
                altInactiveDist = d;
                altInactive = slot;
            }
        }
    }
    if (altInactive) {
        altInactive.active = true;
        altInactive.severity = Math.min(3, Math.max(1, hitSeverity));
        altInactive.patchProgress = 0;
        return { slotActivated: altInactive, upgraded: false, structuralBonus: false };
    }
    // All slots in radius are active and maxed -> structural bonus
    state.structuralDamage += 10;
    state.waterLevel = Math.min(SINK_THRESHOLD, state.waterLevel + 0.05);
    return { slotActivated: null, upgraded: false, structuralBonus: true };
}
/**
 * Calculates current total water inflow rate (% per second).
 */
export function calcInflowRate(state) {
    let totalSeverity = 0;
    for (const slot of state.slots) {
        if (slot.active) {
            totalSeverity += slot.severity;
        }
    }
    return totalSeverity * LEAK_RATE_PER_SEVERITY;
}
/**
 * Steps the ship damage and bilge water simulation.
 */
export function stepShipDamage(state, dt, isBailing = false) {
    if (state.isSunk)
        return;
    const inflow = calcInflowRate(state);
    const bail = isBailing ? BAIL_RATE : 0;
    const netRate = inflow - bail;
    state.waterLevel = Math.max(0, Math.min(SINK_THRESHOLD, state.waterLevel + netRate * dt));
    if (state.waterLevel >= SINK_THRESHOLD) {
        state.isSinking = true;
        state.sinkTimer += dt;
        if (state.sinkTimer >= SINK_TIME) {
            state.isSunk = true;
        }
    }
    else {
        // If water drops below threshold, reset sinking timer
        state.isSinking = false;
        state.sinkTimer = 0;
    }
}
/**
 * Advances patching work on a specific damage slot.
 * Consumes 1 plank upon completion and deactivates the leak.
 */
export function patchDamageSlot(state, slotId, dt) {
    const slot = state.slots.find(s => s.id === slotId);
    if (!slot || !slot.active) {
        return { completed: false, progress: 0 };
    }
    if (state.planks <= 0) {
        return { completed: false, progress: slot.patchProgress };
    }
    slot.patchProgress += dt / PATCH_TIME;
    if (slot.patchProgress >= 1.0) {
        slot.active = false;
        slot.severity = 0;
        slot.patchProgress = 0;
        state.planks = Math.max(0, state.planks - 1);
        return { completed: true, progress: 1.0 };
    }
    return { completed: false, progress: slot.patchProgress };
}
/**
 * Buoyancy vertical offset (meters) based on bilge waterLevel.
 * Negative number lowers the ship deeper into the sea.
 */
export function calcBuoyancyOffset(waterLevel) {
    const clamped = Math.max(0, Math.min(1.0, waterLevel));
    return clamped === 0 ? 0 : -clamped * MAX_BUOYANCY_OFFSET;
}
/**
 * Speed multiplier penalty as the ship takes on water.
 */
export function calcSpeedMultiplier(waterLevel) {
    return Math.max(0.3, 1.0 - Math.min(1.0, waterLevel) * 0.6);
}
/**
 * Turn rate multiplier penalty as the ship becomes sluggish.
 */
export function calcTurnMultiplier(waterLevel) {
    return Math.max(0.4, 1.0 - Math.min(1.0, waterLevel) * 0.5);
}
