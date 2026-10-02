/**
 * Projectile simulation and swept OBB hit detection.
 * Pure math only — no Babylon, no DOM, no Node APIs.
 */

import {
    CANNON_GRAVITY,
    CANNONBALL_RADIUS,
    SHIP_HALF_LENGTH,
    SHIP_HALF_WIDTH,
    SHIP_HALF_HEIGHT,
} from "./constants.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Vec3 { x: number; y: number; z: number; }

export interface ProjectileState {
    /** World-space position */
    x: number; y: number; z: number;
    /** World-space velocity */
    vx: number; vy: number; vz: number;
    /** Whether the ball has already hit something or the water */
    dead: boolean;
    /** Owner ship id (won't self-collide) */
    ownerShipId: number;
}

/** Axis-aligned orientation of a ship in world space for hit testing */
export interface ShipBox {
    /** World-space centre of the ship hull */
    cx: number; cy: number; cz: number;
    /** Ship heading in radians */
    heading: number;
    /** Half-extents — use constants by default */
    hl: number; hw: number; hh: number;
}

// ── Vector helpers (shared, no import needed) ─────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v;
}

// ── Ballistic step ────────────────────────────────────────────────────────────

/**
 * Advance the projectile one fixed timestep.
 * Returns true if the ball hit water this step (waveHeight approximated as 0).
 */
export function stepProjectile(p: ProjectileState, dt: number): boolean {
    if (p.dead) return false;
    p.vy -= CANNON_GRAVITY * dt;
    p.x  += p.vx * dt;
    p.y  += p.vy * dt;
    p.z  += p.vz * dt;
    if (p.y <= 0) {
        p.dead = true;
        return true; // splashed
    }
    return false;
}

// ── Swept OBB hit test ────────────────────────────────────────────────────────

/**
 * Swept-sphere vs OBB test.
 *
 * Tests whether the line segment [prevPos → currPos] (inflated by CANNONBALL_RADIUS)
 * intersects the ship's oriented bounding box.
 *
 * Returns the parametric hit time t ∈ [0,1] along the segment, or null if no hit.
 * This prevents tunneling even at high velocities.
 */
export function sweptHit(
    prev: Vec3,
    curr: Vec3,
    box: ShipBox,
    ownerId: number,
    shipId: number,
): number | null {
    if (ownerId === shipId) return null; // can't hit own ship

    const cosH = Math.cos(-box.heading);
    const sinH = Math.sin(-box.heading);

    // Transform segment start and end into OBB local space
    function toLocal(wx: number, wy: number, wz: number): Vec3 {
        const dx = wx - box.cx;
        const dz = wz - box.cz;
        return {
            x: dx * cosH - dz * sinH,
            y: wy - box.cy,
            z: dx * sinH + dz * cosH,
        };
    }

    const A = toLocal(prev.x, prev.y, prev.z);
    const B = toLocal(curr.x, curr.y, curr.z);

    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const dz = B.z - A.z;

    const R = CANNONBALL_RADIUS;
    const hl = box.hl + R;
    const hw = box.hw + R;
    const hh = box.hh + R;

    // Slab intersection along each axis
    // In OBB local space: X = ship WIDTH direction, Z = ship LENGTH direction
    let tMin = 0, tMax = 1;

    function slab(o: number, d: number, lo: number, hi: number): boolean {
        if (Math.abs(d) < 1e-9) return o >= lo && o <= hi;
        const t1 = (lo - o) / d;
        const t2 = (hi - o) / d;
        const tA = Math.min(t1, t2);
        const tB = Math.max(t1, t2);
        tMin = Math.max(tMin, tA);
        tMax = Math.min(tMax, tB);
        return tMin <= tMax;
    }

    if (!slab(A.x, dx, -hw, hw)) return null;  // width  (port/starboard)
    if (!slab(A.y, dy, -hh, hh)) return null;  // height (above/below waterline)
    if (!slab(A.z, dz, -hl, hl)) return null;  // length (bow/stern)

    return tMin <= tMax ? clamp(tMin, 0, 1) : null;
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Create a new projectile from a cannon fire event.
 * @param shipX   Ship world X
 * @param shipY   Ship world Y (deck height)
 * @param shipZ   Ship world Z
 * @param shipHeading  Ship heading in radians
 * @param shipSpeedX  Ship velocity X component (added to muzzle)
 * @param shipSpeedZ  Ship velocity Z component
 * @param cannonLocalX  Cannon position in ship-local space
 * @param cannonLocalZ
 * @param aimYaw  Absolute aim yaw in radians (world)
 * @param aimPitch  Pitch in radians (up is positive)
 * @param muzzleSpeed  m/s
 * @param ownerShipId
 */
export function createProjectile(
    shipX: number, shipY: number, shipZ: number,
    shipHeading: number,
    shipSpeedX: number, shipSpeedZ: number,
    cannonLocalX: number, cannonLocalZ: number, cannonLocalY: number,
    aimYaw: number, aimPitch: number,
    muzzleSpeed: number,
    ownerShipId: number,
): ProjectileState {
    const cosH = Math.cos(shipHeading);
    const sinH = Math.sin(shipHeading);

    // Cannon world position
    const wx = shipX + cannonLocalX * cosH + cannonLocalZ * sinH;
    const wz = shipZ - cannonLocalX * sinH + cannonLocalZ * cosH;
    const wy = shipY + cannonLocalY;

    const cosP = Math.cos(aimPitch);
    const sinP = Math.sin(aimPitch);
    const cosY = Math.cos(aimYaw);
    const sinY = Math.sin(aimYaw);

    const vx = muzzleSpeed * cosP * sinY + shipSpeedX;
    const vy = muzzleSpeed * sinP;
    const vz = muzzleSpeed * cosP * cosY + shipSpeedZ;

    return { x: wx, y: wy, z: wz, vx, vy, vz, dead: false, ownerShipId };
}

/** Default ship box from constants */
export function makeShipBox(cx: number, cy: number, cz: number, heading: number): ShipBox {
    return { cx, cy, cz, heading, hl: SHIP_HALF_LENGTH, hw: SHIP_HALF_WIDTH, hh: SHIP_HALF_HEIGHT };
}
