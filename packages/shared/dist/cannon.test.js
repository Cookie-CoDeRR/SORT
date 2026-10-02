import { describe, it, expect } from "vitest";
import { createCannonShipState, createPlayerAmmo, pickupFromBarrel, depositToBarrel, loadCannonFromPlayer, aimCannon, fireCannon, recordCannonHit, stepCannons, cannonLocalPos, DEG, } from "./cannon.js";
import { CANNON_STACK_SIZE, BARREL_STACK_CAPACITY, BARREL_START_STACKS, PLAYER_MAX_STACKS, CANNON_START_AMMO, CANNON_YAW_ARC, CANNON_PITCH_MIN, CANNON_PITCH_MAX, CANNON_MAX_LEVEL, } from "./constants.js";
describe("Cannon System", () => {
    it("initializes ship cannons and central barrel correctly", () => {
        const cs = createCannonShipState();
        expect(cs.cannons.length).toBe(6);
        expect(cs.barrelStacks).toBe(BARREL_START_STACKS);
        for (const c of cs.cannons) {
            expect(c.ammoLoaded).toBe(CANNON_START_AMMO);
            expect(c.level).toBe(1);
            expect(c.xp).toBe(0);
            expect(c.reloadTimer).toBe(0);
            expect(c.occupied).toBe(false);
        }
        const pa = createPlayerAmmo();
        expect(pa.stacks).toBe(0);
        expect(pa.loose).toBe(0);
    });
    it("calculates symmetric cannon local positions", () => {
        const left = cannonLocalPos("L", 0);
        const right = cannonLocalPos("R", 0);
        expect(left.x).toBeLessThan(0);
        expect(right.x).toBeGreaterThan(0);
        expect(left.x).toBe(-right.x);
        expect(left.y).toBe(right.y);
        expect(left.z).toBe(right.z);
    });
    it("positions 3 cannons at Z = -4.5, 0.5, 5.5 and X = ±4.3 matching ship gunports", () => {
        const c0 = cannonLocalPos("R", 0);
        const c1 = cannonLocalPos("R", 1);
        const c2 = cannonLocalPos("R", 2);
        expect(c0.z).toBeCloseTo(-4.5);
        expect(c1.z).toBeCloseTo(0.5);
        expect(c2.z).toBeCloseTo(5.5);
        expect(c0.x).toBeCloseTo(4.3);
        const left0 = cannonLocalPos("L", 0);
        expect(left0.x).toBeCloseTo(-4.3);
    });
    it("picks up and deposits stacks from/to the central barrel", () => {
        const cs = createCannonShipState();
        const player = { stacks: 0, loose: 0 };
        // Pick up 1st stack
        expect(pickupFromBarrel(player, cs)).toBe(true);
        expect(player.stacks).toBe(1);
        expect(cs.barrelStacks).toBe(BARREL_START_STACKS - 1);
        // Pick up 2nd stack (reaches max 2)
        expect(pickupFromBarrel(player, cs)).toBe(true);
        expect(player.stacks).toBe(PLAYER_MAX_STACKS);
        // 3rd attempt fails (player at max)
        expect(pickupFromBarrel(player, cs)).toBe(false);
        expect(player.stacks).toBe(PLAYER_MAX_STACKS);
        // Deposit 1 stack back
        expect(depositToBarrel(player, cs)).toBe(true);
        expect(player.stacks).toBe(1);
        expect(cs.barrelStacks).toBe(BARREL_START_STACKS - 1);
        // Empty player cannot deposit
        player.stacks = 0;
        expect(depositToBarrel(player, cs)).toBe(false);
        // Cannot deposit into full barrel
        cs.barrelStacks = BARREL_STACK_CAPACITY;
        player.stacks = 1;
        expect(depositToBarrel(player, cs)).toBe(false);
        // Cannot pick up from empty barrel
        cs.barrelStacks = 0;
        expect(pickupFromBarrel(player, cs)).toBe(false);
    });
    it("loads cannon from player carried ammo and stacks", () => {
        const cs = createCannonShipState();
        const cannon = cs.cannons[0];
        cannon.ammoLoaded = 10; // needs 6 more to reach 16
        const player = { stacks: 1, loose: 0 };
        const loaded = loadCannonFromPlayer(cannon, player);
        expect(loaded).toBe(6);
        expect(cannon.ammoLoaded).toBe(CANNON_STACK_SIZE);
        expect(player.stacks).toBe(0);
        expect(player.loose).toBe(10); // 16 - 6 = 10 loose remaining
        // Loading an already full cannon transfers 0
        expect(loadCannonFromPlayer(cannon, player)).toBe(0);
        expect(player.loose).toBe(10);
    });
    it("clamps aim within yaw arc and pitch limits", () => {
        const cs = createCannonShipState();
        const cannon = cs.cannons[0];
        // Extreme yaw right
        aimCannon(cannon, 100, 0);
        expect(cannon.aimYaw).toBeCloseTo(CANNON_YAW_ARC * DEG, 4);
        // Extreme yaw left
        aimCannon(cannon, -200, 0);
        expect(cannon.aimYaw).toBeCloseTo(-CANNON_YAW_ARC * DEG, 4);
        // Extreme pitch up
        aimCannon(cannon, 0, 100);
        expect(cannon.aimPitch).toBeCloseTo(CANNON_PITCH_MAX * DEG, 4);
        // Extreme pitch down
        aimCannon(cannon, 0, -200);
        expect(cannon.aimPitch).toBeCloseTo(CANNON_PITCH_MIN * DEG, 4);
    });
    it("fires cannon, consumes ammo, and sets reload timer", () => {
        const cs = createCannonShipState();
        const cannon = cs.cannons[0]; // Starboard side "R"
        cannon.ammoLoaded = 1;
        const result = fireCannon(cannon, cs, 0);
        expect(result.fired).toBe(true);
        if (result.fired) {
            expect(result.aimPitch).toBe(cannon.aimPitch);
            expect(result.muzzleSpeed).toBeGreaterThan(0);
        }
        expect(cannon.ammoLoaded).toBe(0);
        expect(cannon.reloadTimer).toBeGreaterThan(0);
        // Cannot fire while reloading
        const second = fireCannon(cannon, cs, 0);
        expect(second.fired).toBe(false);
        // Step time to finish reload
        stepCannons(cs, 10);
        expect(cannon.reloadTimer).toBe(0);
        // Cannot fire when empty
        const emptyFire = fireCannon(cannon, cs, 0);
        expect(emptyFire.fired).toBe(false);
    });
    it("records hits and levels up cannon progression", () => {
        const cs = createCannonShipState();
        const cannon = cs.cannons[0];
        expect(cannon.level).toBe(1);
        // Score hits until level 2
        recordCannonHit(cannon);
        recordCannonHit(cannon);
        const hit3 = recordCannonHit(cannon);
        expect(hit3.leveledUp).toBe(true);
        expect(cannon.level).toBe(2);
        // Score hits until level 3 (max level)
        recordCannonHit(cannon);
        recordCannonHit(cannon);
        recordCannonHit(cannon);
        recordCannonHit(cannon);
        expect(cannon.level).toBe(CANNON_MAX_LEVEL);
    });
});
