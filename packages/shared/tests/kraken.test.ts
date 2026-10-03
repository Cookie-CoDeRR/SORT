import { describe, it, expect } from "vitest";
import {
    createDefaultKrakenBoss,
    stepKrakenBoss,
    calculateTentaclePose,
    testCannonballTentacleHit,
    TENTACLE_SEGMENT_COUNT
} from "../src/kraken.js";

describe("Kraken Boss Simulation", () => {
    it("initializes Phase 1 with 3 tentacles and 120 HP each", () => {
        const boss = createDefaultKrakenBoss(1);
        expect(boss.phase).toBe(1);
        expect(boss.tentacles.length).toBe(3);
        expect(boss.tentacles[0].hp).toBe(120);
        expect(boss.tentacles[0].state).toBe("RISING");
    });

    it("generates 10 segment poses with tapering radii and weak points", () => {
        const boss = createDefaultKrakenBoss(1);
        const tentacle = boss.tentacles[0];
        const poses = calculateTentaclePose(tentacle, { x: 0, y: 0, z: 0 }, 1.0);

        expect(poses.length).toBe(TENTACLE_SEGMENT_COUNT);
        // Base is thicker than tip
        expect(poses[0].radius).toBeGreaterThan(poses[9].radius);

        // Segments 3, 6, 8 are designated weak point sucker joints
        expect(poses[3].isWeakPoint).toBe(true);
        expect(poses[6].isWeakPoint).toBe(true);
        expect(poses[8].isWeakPoint).toBe(true);
        expect(poses[0].isWeakPoint).toBe(false);
    });

    it("advances tentacle state from RISING to IDLE_SWAY to TELEGRAPH", () => {
        const boss = createDefaultKrakenBoss(1);
        // Step 2.5 seconds to finish rising
        let res = stepKrakenBoss(boss, 2.5, { x: 0, y: 0, z: 0 });
        expect(res.boss.tentacles[0].state).toBe("IDLE_SWAY");

        // Step past sway duration (6s)
        res = stepKrakenBoss(res.boss, 7.0, { x: 0, y: 0, z: 0 });
        expect(res.boss.tentacles[0].state).toBe("TELEGRAPH");
    });

    it("multiplies cannonball damage by 3x on weak point joint hits", () => {
        const boss = createDefaultKrakenBoss(1);
        boss.tentacles[0].state = "IDLE_SWAY";
        const poses = calculateTentaclePose(boss.tentacles[0], { x: 0, y: 0, z: 0 }, 1.0);

        const weakJoint = poses[3];
        const hitWeak = testCannonballTentacleHit(
            { x: weakJoint.x, y: weakJoint.y, z: weakJoint.z },
            0.5,
            boss.tentacles[0],
            { x: 0, y: 0, z: 0 },
            1.0
        );

        expect(hitWeak.hit).toBe(true);
        expect(hitWeak.isWeakPoint).toBe(true);
        expect(hitWeak.damage).toBe(120); // 40 * 3
    });
});
