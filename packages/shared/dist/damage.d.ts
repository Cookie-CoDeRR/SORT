/**
 * Damage and Flooding simulation for Corsair Arena.
 * Pure math/sim logic - runs identically on client and server.
 *
 * Each ship has SLOTS_PER_SIDE damage slots on port and starboard.
 * Cannonball hits activate the nearest slot with a leak severity (1..3).
 * Inflow fills the bilge waterLevel over time.
 * Planks can be consumed to patch leaks, and players can bail bilge water.
 */
export type HullSide = "L" | "R";
export interface DamageSlot {
    id: number;
    side: HullSide;
    index: number;
    localPos: {
        x: number;
        y: number;
        z: number;
    };
    active: boolean;
    severity: number;
    patchProgress: number;
}
export interface ShipDamageState {
    slots: DamageSlot[];
    /** Normalized bilge water level: 0.0 (bone dry) to 1.0 (fully flooded / sinking) */
    waterLevel: number;
    isSinking: boolean;
    sinkTimer: number;
    isSunk: boolean;
    planks: number;
    structuralDamage: number;
}
/**
 * Creates an initialized ship damage state with 10 slots per side.
 */
export declare function createShipDamageState(startingPlanks?: number): ShipDamageState;
/**
 * Maps a projectile hit on the hull to a damage slot on the impacted side.
 * - Activates nearest inactive slot within DAMAGE_SLOT_RADIUS.
 * - If already active, upgrades severity up to 3.
 * - If all slots are full, applies bonus structural damage.
 */
export declare function applyDamageHit(state: ShipDamageState, localHitPos: {
    x: number;
    y: number;
    z: number;
}, hitSeverity?: number): {
    slotActivated: DamageSlot | null;
    upgraded: boolean;
    structuralBonus: boolean;
};
/**
 * Calculates current total water inflow rate (% per second).
 */
export declare function calcInflowRate(state: ShipDamageState): number;
/**
 * Steps the ship damage and bilge water simulation.
 */
export declare function stepShipDamage(state: ShipDamageState, dt: number, isBailing?: boolean): void;
/**
 * Advances patching work on a specific damage slot.
 * Consumes 1 plank upon completion and deactivates the leak.
 */
export declare function patchDamageSlot(state: ShipDamageState, slotId: number, dt: number): {
    completed: boolean;
    progress: number;
};
/**
 * Buoyancy vertical offset (meters) based on bilge waterLevel.
 * Negative number lowers the ship deeper into the sea.
 */
export declare function calcBuoyancyOffset(waterLevel: number): number;
/**
 * Speed multiplier penalty as the ship takes on water.
 */
export declare function calcSpeedMultiplier(waterLevel: number): number;
/**
 * Turn rate multiplier penalty as the ship becomes sluggish.
 */
export declare function calcTurnMultiplier(waterLevel: number): number;
