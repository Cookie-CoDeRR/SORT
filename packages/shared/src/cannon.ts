/**
 * Cannon station state machine.
 * Pure sim logic — no Babylon, no DOM, no Node-only APIs.
 */

import {
    CANNON_RELOAD_TIME,
    CANNON_YAW_ARC,
    CANNON_PITCH_MIN,
    CANNON_PITCH_MAX,
    CANNON_MUZZLE_SPEED,
    CANNON_COUNT_PER_SIDE,
    CANNON_LOCAL_X,
    CANNON_LOCAL_Y,
    CANNON_STACK_SIZE,
    BARREL_STACK_CAPACITY,
    BARREL_START_STACKS,
    PLAYER_MAX_STACKS,
    CANNON_START_AMMO,
    CANNON_MAX_LEVEL,
    CANNON_XP_PER_LEVEL,
} from "./constants.js";

export const DEG = Math.PI / 180;

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Cannon local positions relative to ship centre ───────────────────────────

/**
 * Returns the local (x, y, z) offset of each cannon barrel on a side.
 * Uses CANNON_LOCAL_X / CANNON_LOCAL_Y from constants (match shipBuilder.ts).
 */
export function cannonLocalPos(
    side: CannonSide,
    index: number,
    count: number = CANNON_COUNT_PER_SIDE,
): { x: number; y: number; z: number } {
    const sign = side === "L" ? -1 : 1;
    const spacing = 1.0 / (count + 1);
    const localZ = ((index + 1) * spacing - 0.5) * 20 + 0.5;
    return { x: sign * CANNON_LOCAL_X, y: CANNON_LOCAL_Y, z: localZ };
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createCannonShipState(): CannonShipState {
    const cannons: CannonState[] = [];
    for (const side of ["L", "R"] as CannonSide[]) {
        for (let i = 0; i < CANNON_COUNT_PER_SIDE; i++) {
            cannons.push({
                side,
                index: i,
                level: 1,
                xp: 0,
                aimYaw:      0,
                aimPitch:    5 * DEG,
                reloadTimer: 0,
                occupied:    false,
                ammoLoaded:  CANNON_START_AMMO,   // starts empty — player must fetch and load
            });
        }
    }
    return { cannons, barrelStacks: BARREL_START_STACKS };
}

export function createPlayerAmmo(): PlayerAmmo {
    return { stacks: 0, loose: 0 };
}

// ── Step ──────────────────────────────────────────────────────────────────────

export function stepCannons(state: CannonShipState, dt: number): void {
    for (const c of state.cannons) {
        if (c.reloadTimer > 0) c.reloadTimer = Math.max(0, c.reloadTimer - dt);
    }
}

// ── Aim ───────────────────────────────────────────────────────────────────────

const YAW_ARC_RAD   = CANNON_YAW_ARC   * DEG;
const PITCH_MIN_RAD = CANNON_PITCH_MIN  * DEG;
const PITCH_MAX_RAD = CANNON_PITCH_MAX  * DEG;

export function aimCannon(
    c: CannonState,
    deltaYaw: number,
    deltaPitch: number,
): void {
    c.aimYaw   = Math.max(-YAW_ARC_RAD,   Math.min(YAW_ARC_RAD,   c.aimYaw   + deltaYaw));
    c.aimPitch = Math.max(PITCH_MIN_RAD,   Math.min(PITCH_MAX_RAD, c.aimPitch + deltaPitch));
}

// ── Ammo logistics ────────────────────────────────────────────────────

/** Player picks up a stack from the central barrel. Returns true if successful. */
export function pickupFromBarrel(player: PlayerAmmo, cs: CannonShipState): boolean {
    if (player.stacks >= PLAYER_MAX_STACKS) return false;
    if (cs.barrelStacks <= 0) return false;
    cs.barrelStacks -= 1;
    player.stacks += 1;
    return true;
}

/** Player deposits a stack back into the central barrel. Returns true if successful. */
export function depositToBarrel(player: PlayerAmmo, cs: CannonShipState): boolean {
    if (cs.barrelStacks >= BARREL_STACK_CAPACITY) return false;
    if (player.stacks > 0) {
        player.stacks -= 1;
        cs.barrelStacks += 1;
        return true;
    }
    if (player.loose > 0) {
        player.loose = 0;
        cs.barrelStacks = Math.min(BARREL_STACK_CAPACITY, cs.barrelStacks + 1);
        return true;
    }
    return false;
}

/** Player loads their carried balls into a cannon. Returns balls loaded or 0. */
export function loadCannonFromPlayer(c: CannonState, player: PlayerAmmo): number {
    if (c.ammoLoaded >= CANNON_STACK_SIZE) return 0; // already full
    const needed = CANNON_STACK_SIZE - c.ammoLoaded;

    // Use loose balls first, then break open a stack
    let available = player.loose;
    if (available === 0 && player.stacks > 0) {
        player.stacks -= 1;
        player.loose = CANNON_STACK_SIZE;
        available = player.loose;
    }
    if (available === 0) return 0;

    const transferred = Math.min(needed, available);
    c.ammoLoaded += transferred;
    player.loose -= transferred;
    return transferred;
}

// ── Cannon Progression & Leveling ─────────────────────────────────────────────

export interface CannonHitResult {
    hit: boolean;
    leveledUp: boolean;
    newLevel: number;
    currentXp: number;
}

/** Records a successful hit scored by a cannon, awarding XP and leveling up if threshold met. */
export function recordCannonHit(c: CannonState): CannonHitResult {
    c.xp += 1;
    const needed = c.level * CANNON_XP_PER_LEVEL;
    if (c.level < CANNON_MAX_LEVEL && c.xp >= needed) {
        c.level += 1;
        return { hit: true, leveledUp: true, newLevel: c.level, currentXp: c.xp };
    }
    return { hit: true, leveledUp: false, newLevel: c.level, currentXp: c.xp };
}

// ── Fire ──────────────────────────────────────────────────────────────────────

/**
 * Attempt to fire a cannon.
 * Returns the fire data or { fired: false } if not ready / no ammo.
 * Higher level cannons reload slightly faster (Level 1: 7s, Level 2: 5.5s, Level 3: 4.5s).
 */
export function fireCannon(
    c: CannonState,
    cs: CannonShipState,
    shipHeading: number,
): { fired: true; worldAimYaw: number; aimPitch: number; muzzleSpeed: number } | { fired: false; reason: string } {
    if (c.reloadTimer > 0)   return { fired: false, reason: "reloading" };
    if (c.ammoLoaded <= 0)   return { fired: false, reason: "empty" };

    const reloadMultiplier = c.level === 3 ? 0.65 : c.level === 2 ? 0.8 : 1.0;
    c.reloadTimer = CANNON_RELOAD_TIME * reloadMultiplier;
    c.ammoLoaded -= 1;

    const beamOffset = c.side === "L" ? -Math.PI / 2 : Math.PI / 2;
    const worldAimYaw = shipHeading + beamOffset + c.aimYaw;

    return { fired: true, worldAimYaw, aimPitch: c.aimPitch, muzzleSpeed: CANNON_MUZZLE_SPEED };
}
