/**
 * Cannon station state machine.
 * Pure sim logic — no Babylon, no DOM, no Node-only APIs.
 */
export declare const DEG: number;
export type CannonSide = "L" | "R";
export interface CannonState {
    side: CannonSide;
    /** Index on the side (0, 1, 2 ...) */
    index: number;
    /** Cannon progression level (1 = Bronze, 2 = Silver, 3 = Gold) */
    level: number;
    /** Total hits scored with this cannon */
    xp: number;
    /** Aim yaw offset from ship-beam direction, radians */
    aimYaw: number;
    /** Aim pitch, radians */
    aimPitch: number;
    /** Remaining reload time; 0 = ready */
    reloadTimer: number;
    /** Whether a player is currently occupying this station */
    occupied: boolean;
    /** Cannonballs currently loaded in this cannon (0 – CANNON_STACK_SIZE) */
    ammoLoaded: number;
}
export interface CannonShipState {
    cannons: CannonState[];
    /** Stacks remaining in the central ammo barrel on deck */
    barrelStacks: number;
}
/** Ammo the player is carrying — client-side for now (not yet authoritative on server) */
export interface PlayerAmmo {
    /** Complete stacks the player holds (each stack = CANNON_STACK_SIZE balls) */
    stacks: number;
    /** Balls in an in-progress partial stack */
    loose: number;
}
/**
 * Returns the local (x, y, z) offset of each cannon barrel on a side.
 * Uses CANNON_LOCAL_X / CANNON_LOCAL_Y from constants (match shipBuilder.ts).
 */
export declare function cannonLocalPos(side: CannonSide, index: number, count?: number): {
    x: number;
    y: number;
    z: number;
};
export declare function createCannonShipState(): CannonShipState;
export declare function createPlayerAmmo(): PlayerAmmo;
export declare function stepCannons(state: CannonShipState, dt: number): void;
export declare function aimCannon(c: CannonState, deltaYaw: number, deltaPitch: number): void;
/** Player picks up a stack from the central barrel. Returns true if successful. */
export declare function pickupFromBarrel(player: PlayerAmmo, cs: CannonShipState): boolean;
/** Player deposits a stack back into the central barrel. Returns true if successful. */
export declare function depositToBarrel(player: PlayerAmmo, cs: CannonShipState): boolean;
/** Player loads their carried balls into a cannon. Returns balls loaded or 0. */
export declare function loadCannonFromPlayer(c: CannonState, player: PlayerAmmo): number;
export interface CannonHitResult {
    hit: boolean;
    leveledUp: boolean;
    newLevel: number;
    currentXp: number;
}
/** Records a successful hit scored by a cannon, awarding XP and leveling up if threshold met. */
export declare function recordCannonHit(c: CannonState): CannonHitResult;
/**
 * Attempt to fire a cannon.
 * Returns the fire data or { fired: false } if not ready / no ammo.
 * Higher level cannons reload slightly faster (Level 1: 7s, Level 2: 5.5s, Level 3: 4.5s).
 */
export declare function fireCannon(c: CannonState, cs: CannonShipState, shipHeading: number): {
    fired: true;
    worldAimYaw: number;
    aimPitch: number;
    muzzleSpeed: number;
} | {
    fired: false;
    reason: string;
};
