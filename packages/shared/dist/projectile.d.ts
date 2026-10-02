/**
 * Projectile simulation and swept OBB hit detection.
 * Pure math only — no Babylon, no DOM, no Node APIs.
 */
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
export interface ProjectileState {
    /** World-space position */
    x: number;
    y: number;
    z: number;
    /** World-space velocity */
    vx: number;
    vy: number;
    vz: number;
    /** Whether the ball has already hit something or the water */
    dead: boolean;
    /** Owner ship id (won't self-collide) */
    ownerShipId: number;
}
/** Axis-aligned orientation of a ship in world space for hit testing */
export interface ShipBox {
    /** World-space centre of the ship hull */
    cx: number;
    cy: number;
    cz: number;
    /** Ship heading in radians */
    heading: number;
    /** Half-extents — use constants by default */
    hl: number;
    hw: number;
    hh: number;
}
/**
 * Advance the projectile one fixed timestep.
 * Returns true if the ball hit water this step (waveHeight approximated as 0).
 */
export declare function stepProjectile(p: ProjectileState, dt: number): boolean;
/**
 * Swept-sphere vs OBB test.
 *
 * Tests whether the line segment [prevPos → currPos] (inflated by CANNONBALL_RADIUS)
 * intersects the ship's oriented bounding box.
 *
 * Returns the parametric hit time t ∈ [0,1] along the segment, or null if no hit.
 * This prevents tunneling even at high velocities.
 */
export declare function sweptHit(prev: Vec3, curr: Vec3, box: ShipBox, ownerId: number, shipId: number): number | null;
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
export declare function createProjectile(shipX: number, shipY: number, shipZ: number, shipHeading: number, shipSpeedX: number, shipSpeedZ: number, cannonLocalX: number, cannonLocalZ: number, cannonLocalY: number, aimYaw: number, aimPitch: number, muzzleSpeed: number, ownerShipId: number): ProjectileState;
/** Default ship box from constants */
export declare function makeShipBox(cx: number, cy: number, cz: number, heading: number): ShipBox;
