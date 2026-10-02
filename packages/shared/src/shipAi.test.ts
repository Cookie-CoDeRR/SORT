import { describe, it, expect } from "vitest";
import { stepCirclePatrolAi } from "./shipAi.js";
import { stepShip, ShipState } from "./shipPhysics.js";

describe("Ship Circle Patrol AI", () => {
    const center = { x: 80, z: 0 };
    const radius = 60;

    it("drops sail when ship is sinking", () => {
        const ship: ShipState = {
            x: 80,
            z: 60,
            heading: Math.PI / 2,
            speed: 5.0,
            yawRate: 0,
            waterLevel: 0.98,
        };
        const input = stepCirclePatrolAi(ship, center, radius);
        expect(input.sail).toBe(0);
        expect(input.rudder).toBe(0);
    });

    it("commands forward sail and steering when sailing near orbit tangent", () => {
        // Positioned at north of center (x=80, z=60).
        // Tangent heading for clockwise orbit: θ = 0 (z+), tangent = π/2 (heading east, +x).
        const ship: ShipState = {
            x: 80,
            z: 60,
            heading: Math.PI / 2, // perfectly aligned along tangent
            speed: 6.0,
            yawRate: 0,
            waterLevel: 0,
        };
        const input = stepCirclePatrolAi(ship, center, radius);
        expect(input.sail).toBe(1.0);
        expect(Math.abs(input.rudder)).toBeLessThan(0.3); // minimal rudder adjustment
    });

    it("steers inward when drifting outside target patrol radius", () => {
        // Ship is 120m away from center (way outside radius of 60m)
        const ship: ShipState = {
            x: 80,
            z: 120,
            heading: Math.PI / 2, // heading east
            speed: 6.0,
            yawRate: 0,
            waterLevel: 0,
        };
        const input = stepCirclePatrolAi(ship, center, radius);
        expect(input.sail).toBeGreaterThan(0);
        // Desired heading points inward (towards -z, south), so rudder should turn clockwise towards south
        expect(input.rudder).toBeGreaterThan(0.3);
    });

    it("steers outward when too close to patrol center", () => {
        // Ship is 20m from center (inside radius of 60m)
        const ship: ShipState = {
            x: 80,
            z: 20,
            heading: Math.PI / 2,
            speed: 6.0,
            yawRate: 0,
            waterLevel: 0,
        };
        const input = stepCirclePatrolAi(ship, center, radius);
        expect(input.sail).toBeGreaterThan(0);
        // Desired heading points outward (towards +z, north), so rudder turns counter-clockwise
        expect(input.rudder).toBeLessThan(0);
    });

    it("maintains a stable circular orbit when simulated over multiple seconds", () => {
        // Start ship roughly on orbit
        const ship: ShipState = {
            x: 80,
            z: 60,
            heading: Math.PI / 2,
            speed: 6.0,
            yawRate: 0,
            waterLevel: 0,
        };

        const dt = 1 / 30; // 30 Hz fixed timestep
        for (let tick = 0; tick < 30 * 45; tick++) { // 45 seconds of autonomous sailing
            const input = stepCirclePatrolAi(ship, center, radius);
            stepShip(ship, input, dt);
        }

        // Distance from center should remain closely bounded around radius = 60m
        const finalDist = Math.hypot(ship.x - center.x, ship.z - center.z);
        expect(finalDist).toBeGreaterThan(45);
        expect(finalDist).toBeLessThan(75);
    });
});
