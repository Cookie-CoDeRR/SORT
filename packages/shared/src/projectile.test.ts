/**
 * Projectile tests:
 *  1. A ball fired at a stationary target hits it.
 *  2. No tunneling — a very fast ball still registers a hit.
 *  3. A ball fired wide misses.
 *  4. An owner-ship hit returns null (self-collision guard).
 */

import { describe, it, expect } from "vitest";
import { stepProjectile, sweptHit, createProjectile, makeShipBox, ProjectileState, Vec3 } from "./projectile.js";
import { CANNON_MUZZLE_SPEED } from "./constants.js";

const TARGET: import("./projectile.js").ShipBox = makeShipBox(100, 3, 0, 0);

describe("stepProjectile", () => {
    it("applies gravity and moves forward", () => {
        const p: ProjectileState = { x:0, y:5, z:0, vx:10, vy:0, vz:0, dead:false, ownerShipId:0 };
        stepProjectile(p, 1);
        expect(p.x).toBeCloseTo(10);
        expect(p.vy).toBeLessThan(0); // gravity pulled down
    });

    it("marks dead when y <= 0", () => {
        const p: ProjectileState = { x:0, y:0.1, z:0, vx:0, vy:-10, vz:0, dead:false, ownerShipId:0 };
        const splashed = stepProjectile(p, 1);
        expect(splashed).toBe(true);
        expect(p.dead).toBe(true);
    });
});

describe("sweptHit", () => {
    it("hits a stationary target head-on", () => {
        const prev: Vec3 = { x: 80, y: 3, z: 0 };
        const curr: Vec3 = { x: 105, y: 3, z: 0 };
        const t = sweptHit(prev, curr, TARGET, 1, 2);
        expect(t).not.toBeNull();
        expect(t!).toBeGreaterThanOrEqual(0);
        expect(t!).toBeLessThanOrEqual(1);
    });

    it("misses when shot is wide", () => {
        const prev: Vec3 = { x: 80, y: 3, z: 20 };
        const curr: Vec3 = { x: 105, y: 3, z: 20 };
        const t = sweptHit(prev, curr, TARGET, 1, 2);
        expect(t).toBeNull();
    });

    it("no tunneling at extreme speed (segment crosses full box in one step)", () => {
        // Ball travels from z=200 to z=-200 in one step, crossing the target at z=0
        const box = makeShipBox(0, 3, 0, 0);
        const prev: Vec3 = { x: 0, y: 3, z: 200 };
        const curr: Vec3 = { x: 0, y: 3, z: -200 };
        const t = sweptHit(prev, curr, box, 1, 2);
        expect(t).not.toBeNull();
    });

    it("self-collision guard: returns null for owner ship", () => {
        const prev: Vec3 = { x: 80, y: 3, z: 0 };
        const curr: Vec3 = { x: 105, y: 3, z: 0 };
        const t = sweptHit(prev, curr, TARGET, 2, 2); // same owner
        expect(t).toBeNull();
    });
});

describe("createProjectile", () => {
    it("produces non-zero velocity", () => {
        const p = createProjectile(0, 5, 0, 0, 0, 0, 3.2, 0, 1.2, Math.PI/2, 0.1, CANNON_MUZZLE_SPEED, 1);
        const totalV = Math.sqrt(p.vx**2 + p.vy**2 + p.vz**2);
        expect(totalV).toBeGreaterThan(0);
    });

    it("ship velocity is added to muzzle velocity", () => {
        const pStill  = createProjectile(0,5,0,0, 0, 0, 3.2,0,1.2, 0, 0, CANNON_MUZZLE_SPEED, 1);
        const pMoving = createProjectile(0,5,0,0, 5, 0, 3.2,0,1.2, 0, 0, CANNON_MUZZLE_SPEED, 1);
        expect(pMoving.vx).toBeGreaterThan(pStill.vx);
    });
});
