import { describe, it, expect } from "vitest";
import { generateWorldMap, resolveShipIslandCollisions, SeededRng, getIslandElevation, getTerrainHeight } from "./world.js";
import { ShipState } from "./shipPhysics.js";
import { MAP_RADIUS, DEFAULT_MAP_SEED } from "./constants.js";

describe("Deterministic World Generator", () => {
    it("generates identical worlds when given the same seed", () => {
        const worldA = generateWorldMap(12345, 6, 10);
        const worldB = generateWorldMap(12345, 6, 10);

        expect(worldA.islands.length).toBe(worldB.islands.length);
        expect(worldA.islands[0].x).toBe(worldB.islands[0].x);
        expect(worldA.islands[0].z).toBe(worldB.islands[0].z);
        expect(worldA.islands[1].radius).toBe(worldB.islands[1].radius);
    });

    it("generates differing worlds with different seeds", () => {
        const worldA = generateWorldMap(1001);
        const worldB = generateWorldMap(9999);

        // Island positions should differ
        expect(worldA.islands[1].x).not.toBe(worldB.islands[1].x);
    });

    it("places the grand fortress with loot cache off-center to preserve clear spawn channel", () => {
        const world = generateWorldMap(DEFAULT_MAP_SEED);
        const fortress = world.islands[0];

        expect(fortress.type).toBe("fortress");
        expect(fortress.x).toBe(480);
        expect(fortress.z).toBe(-480);
        expect(fortress.hasLootCache).toBe(true);
        expect(fortress.radius).toBeGreaterThan(80);
    });

    it("keeps all generated islands within the arena boundary", () => {
        const world = generateWorldMap(DEFAULT_MAP_SEED, 10, 20);

        for (const island of world.islands) {
            const dist = Math.sqrt(island.x * island.x + island.z * island.z);
            expect(dist + island.radius).toBeLessThanOrEqual(MAP_RADIUS + 50);
        }
    });

    it("detects and resolves ship-to-island collision", () => {
        const world = generateWorldMap(DEFAULT_MAP_SEED);
        const fortress = world.islands[0]; // at (0, 0), radius 110

        // Place ship penetrating into the fortress boundary
        const ship: ShipState = {
            x: fortress.x + 80, // distance 80, while minDist is 110 + 14 = 124
            z: fortress.z,
            heading: 0,
            speed: 8.0,
            yawRate: 0,
            waterLevel: 0,
        };

        const res = resolveShipIslandCollisions(ship, world);

        expect(res.collided).toBe(true);
        expect(res.island?.name).toBe(fortress.name);
        expect(res.penetration).toBeGreaterThan(0);
        // Ship should be pushed outward
        expect(ship.x).toBeGreaterThanOrEqual(fortress.x + fortress.radius + 14);
        // Speed should be heavily dampened
        expect(ship.speed).toBeLessThan(4.0);
    });

    it("does not affect ship when sailing in open water", () => {
        const world = generateWorldMap(DEFAULT_MAP_SEED);

        // Find a location with no islands nearby
        let clearX = 100, clearZ = 100;
        for (let cand = 150; cand < 800; cand += 50) {
            let hits = false;
            for (const isl of world.islands) {
                const dist = Math.sqrt((cand - isl.x)**2 + (cand - isl.z)**2);
                if (dist < isl.radius + 50) {
                    hits = true;
                    break;
                }
            }
            if (!hits) {
                clearX = cand;
                clearZ = cand;
                break;
            }
        }

        const ship: ShipState = {
            x: clearX,
            z: clearZ,
            heading: 0,
            speed: 7.5,
            yawRate: 0,
            waterLevel: 0,
        };

        const res = resolveShipIslandCollisions(ship, world);

        expect(res.collided).toBe(false);
        expect(ship.speed).toBe(7.5);
    });


    it("generates resources and missions for archipelago islands", () => {
        const world = generateWorldMap(DEFAULT_MAP_SEED);
        const fortress = world.islands[0];
        expect(fortress.resources.woodPlanks).toBeGreaterThan(0);
        expect(fortress.resources.cannonballs).toBeGreaterThan(0);
        expect(fortress.mission).toBeDefined();
        expect(fortress.mission?.rewardGold).toBeGreaterThan(1000);

        const regularIsland = world.islands[1];
        expect(regularIsland.resources.ancientGold).toBeGreaterThanOrEqual(150);
        expect(regularIsland.mission).toBeDefined();
        expect(regularIsland.mission?.title).toBeTruthy();
    });

    it("calculates terrain elevation correctly for land and sea", () => {
        const world = generateWorldMap(DEFAULT_MAP_SEED);
        const fortress = world.islands[0]; // center (480, -480), radius 175, height 38

        // Peak/center elevation
        const centerElev = getIslandElevation(480, -480, fortress);
        expect(centerElev).toBeCloseTo(fortress.height, 0);

        // Outside island radius (open sea)
        const seaElev = getIslandElevation(1500, 1500, fortress);
        expect(seaElev).toBe(0.0);

        // getTerrainHeight query
        const queryCenter = getTerrainHeight(480, -480, world);
        expect(queryCenter.island?.name).toBe(fortress.name);
        expect(queryCenter.elevation).toBeGreaterThan(20);

        const querySea = getTerrainHeight(0, 0, world); // (0,0) is now open navigable sea channel!
        expect(querySea.elevation).toBe(0.0);
    });

    it("SeededRng produces consistent pseudo-random sequences", () => {
        const rng1 = new SeededRng(42);
        const rng2 = new SeededRng(42);

        for (let i = 0; i < 10; i++) {
            expect(rng1.next()).toBe(rng2.next());
        }
    });
});
