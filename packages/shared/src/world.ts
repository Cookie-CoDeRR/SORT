/**
 * Pure simulation deterministic world & island generator.
 * Zero DOM, zero Babylon, zero Node-only APIs.
 * Runs identically on server and client using a 32-bit deterministic LCG PRNG.
 */

import {
    MAP_RADIUS,
    MAP_CENTER_X,
    MAP_CENTER_Z,
    DEFAULT_MAP_SEED,
    ISLAND_COUNT_DEFAULT,
    ROCK_HAZARD_COUNT_DEFAULT,
    SHIP_COLLISION_RADIUS,
} from "./constants.js";
import { ShipState } from "./shipPhysics.js";

export type IslandType = "fortress" | "tropical" | "atoll" | "rock_needle" | "crag" | "archipelago_hub";

export interface IslandResources {
    woodPlanks: number;
    bananas: number;
    cannonballs: number;
    ancientGold: number;
}

export interface IslandMission {
    id: string;
    title: string;
    description: string;
    rewardGold: number;
    difficulty: "Easy" | "Medium" | "Hard" | "Legendary";
}

export interface IslandEntity {
    id: number;
    type: IslandType;
    name: string;
    x: number;
    z: number;
    radius: number;       // Base radius for collision / land boundary
    height: number;       // Peak terrain elevation above sea level
    seed: number;         // Individual seed for procedural mesh detailing
    hasLootCache: boolean;// Center fort or pirate hideout
    resources: IslandResources;
    mission?: IslandMission;
}

export interface WorldMap {
    seed: number;
    radius: number;
    islands: IslandEntity[];
}

/**
 * Deterministic 32-bit LCG random number generator.
 */
export class SeededRng {
    private s: number;

    constructor(seed: number) {
        this.s = (seed >>> 0) || 123456789;
    }

    /** Returns float in range [0, 1) */
    next(): number {
        // Numerical Recipes LCG
        this.s = (Math.imul(1664525, this.s) + 1013904223) >>> 0;
        return this.s / 4294967296;
    }

    /** Returns float in range [min, max) */
    range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    /** Returns integer in range [min, max] */
    intRange(min: number, max: number): number {
        return Math.floor(this.range(min, max + 1));
    }
}

const ISLAND_NAMES = [
    "Smuggler's Bay",
    "Kraken's Fall",
    "Plunder Outpost",
    "Devil's Ridge",
    "Thieves' Haven",
    "Shark Bait Cove",
    "Shipwreck Bay",
    "Crescent Isle",
    "Cannon Cove",
    "Marauder's Arch",
    "Wanderers Refuge",
    "Cutthroat Cay",
    "Golden Sands Haven",
    "Ancient Spire Outpost",
    "Galleon's Grave",
    "Dagger Tooth Hub",
    "Black Sand Atoll",
    "Skeleton's Roost",
];

const MISSION_POOL: Array<{ title: string; desc: string; diff: "Easy" | "Medium" | "Hard" | "Legendary"; baseReward: number }> = [
    { title: "Bounty on Captain Bloodbeard", desc: "Defeat skeleton captains guarding the ancient ruins.", diff: "Medium", baseReward: 450 },
    { title: "Recover Lost Castaway Chest", desc: "Retrieve a buried chest sealed in the sea cave.", diff: "Easy", baseReward: 250 },
    { title: "Defend Supply Depot", desc: "Protect the provisions stock from invading marauders.", diff: "Hard", baseReward: 800 },
    { title: "Ghost Ship Armada Ambush", desc: "Confront phantom ships sighted off the reef shores.", diff: "Legendary", baseReward: 1600 },
    { title: "Trade Shipment Escort", desc: "Collect ripe bananas and deliver safely across sea lanes.", diff: "Easy", baseReward: 200 },
    { title: "Cursed Skull of Thieves Haven", desc: "Excavate a glowing cursed relic hidden high on the cliffs.", diff: "Hard", baseReward: 950 },
];

/**
 * Generates an archipelago of islands and sea crags deterministically from a numeric seed.
 */
export function generateWorldMap(
    seed: number = DEFAULT_MAP_SEED,
    islandCount: number = ISLAND_COUNT_DEFAULT,
    rockCount: number = ROCK_HAZARD_COUNT_DEFAULT,
): WorldMap {
    const rng = new SeededRng(seed);
    const islands: IslandEntity[] = [];

    // 1. Grand Ancient Fortress Island (Off-center to keep sea open and avoid ships getting stuck at spawn)
    islands.push({
        id: 0,
        type: "fortress",
        name: "Fortress of the Damned",
        x: 480,
        z: -480,
        radius: 175,
        height: 38,
        seed: rng.intRange(1, 100000),
        hasLootCache: true,
        resources: {
            woodPlanks: 24,
            bananas: 20,
            cannonballs: 48,
            ancientGold: 1200,
        },
        mission: {
            id: "m_fortress_core",
            title: "Siege of the Damned Fortress",
            description: "Breach the central fortress bastion and claim the ancient treasury.",
            rewardGold: 2500,
            difficulty: "Legendary",
        },
    });

    // 2. Outlying Archipelago Islands (Inner, Mid, and Outer oceanic rings)
    // Radii up to 130m - 220m for truly massive islands with coves, bays & cliffs
    for (let i = 0; i < islandCount; i++) {
        const ringSector = i % 3; // 0: inner ring, 1: mid ring, 2: outer deep ocean
        let ringDist: number;
        if (ringSector === 0) {
            ringDist = rng.range(450, 1100);
        } else if (ringSector === 1) {
            ringDist = rng.range(1200, 2200);
        } else {
            ringDist = rng.range(2300, MAP_RADIUS - 300);
        }

        const ringAngle = (i / islandCount) * Math.PI * 2 + rng.range(-0.35, 0.35);
        const ix = MAP_CENTER_X + Math.sin(ringAngle) * ringDist;
        const iz = MAP_CENTER_Z + Math.cos(ringAngle) * ringDist;

        // Island typology: large hub, tropical paradise, or crescent atoll
        const typeRoll = rng.next();
        let itype: IslandType = "tropical";
        let radius = rng.range(110, 190);
        let height = rng.range(22, 36);

        if (typeRoll < 0.25) {
            itype = "archipelago_hub";
            radius = rng.range(160, 240); // Massive hub island
            height = rng.range(28, 44);
        } else if (typeRoll < 0.65) {
            itype = "atoll";
            radius = rng.range(120, 180);
            height = rng.range(18, 28);
        }

        const nameIdx = i % ISLAND_NAMES.length;
        const mTemplate = MISSION_POOL[i % MISSION_POOL.length];

        islands.push({
            id: i + 1,
            type: itype,
            name: ISLAND_NAMES[nameIdx],
            x: Math.round(ix),
            z: Math.round(iz),
            radius: Math.round(radius),
            height: Math.round(height),
            seed: rng.intRange(1, 100000),
            hasLootCache: rng.next() > 0.30,
            resources: {
                woodPlanks: rng.intRange(6, 18),
                bananas: rng.intRange(8, 22),
                cannonballs: rng.intRange(12, 36),
                ancientGold: rng.intRange(150, 850),
            },
            mission: {
                id: `mis_${i + 1}`,
                title: mTemplate.title,
                description: mTemplate.desc,
                rewardGold: mTemplate.baseReward + rng.intRange(50, 250),
                difficulty: mTemplate.diff,
            },
        });
    }

    // 3. Sea Crags & Rock Needle Hazards (scattered across navigation channels)
    for (let j = 0; j < rockCount; j++) {
        const rockAngle = rng.range(0, Math.PI * 2);
        const rockDist = rng.range(250, MAP_RADIUS - 150);
        const rx = MAP_CENTER_X + Math.sin(rockAngle) * rockDist;
        const rz = MAP_CENTER_Z + Math.cos(rockAngle) * rockDist;

        // Ensure not overlapping existing islands, and preserve a 200m clear start navigable channel around (0,0)
        let overlaps = (rx * rx + rz * rz < 200 * 200);
        for (const isl of islands) {
            const dx = rx - isl.x;
            const dz = rz - isl.z;
            if (dx * dx + dz * dz < (isl.radius + 80) * (isl.radius + 80)) {
                overlaps = true;
                break;
            }
        }
        if (overlaps) continue;

        const isNeedle = rng.next() > 0.5;
        islands.push({
            id: islandCount + 1 + j,
            type: isNeedle ? "rock_needle" : "crag",
            name: `Crag #${j + 1}`,
            x: Math.round(rx),
            z: Math.round(rz),
            radius: Math.round(rng.range(24, 45)),
            height: Math.round(rng.range(18, 30)),
            seed: rng.intRange(1, 100000),
            hasLootCache: false,
            resources: {
                woodPlanks: rng.intRange(0, 4),
                bananas: 0,
                cannonballs: rng.intRange(0, 8),
                ancientGold: rng.intRange(0, 80),
            },
        });
    }

    return {
        seed,
        radius: MAP_RADIUS,
        islands,
    };
}

export interface IslandCollisionResult {
    collided: boolean;
    island?: IslandEntity;
    penetration: number;
    normalX: number;
    normalZ: number;
}

/**
 * Checks and resolves collision between a ship and all islands in the world map.
 * Pushes the ship out along the collision normal and dampens ship speed.
 */
export function resolveShipIslandCollisions(
    ship: ShipState,
    world: WorldMap,
    shipRadius: number = SHIP_COLLISION_RADIUS,
): IslandCollisionResult {
    let bestResult: IslandCollisionResult = {
        collided: false,
        penetration: 0,
        normalX: 0,
        normalZ: 0,
    };

    for (const island of world.islands) {
        const dx = ship.x - island.x;
        const dz = ship.z - island.z;
        const distSq = dx * dx + dz * dz;
        const minDist = island.radius + shipRadius;

        if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.001;
            const penetration = minDist - dist;
            const nx = dx / dist;
            const nz = dz / dist;

            // Push ship out onto shoreline water
            ship.x += nx * penetration;
            ship.z += nz * penetration;

            // Dampen speed on impact (running aground)
            ship.speed = Math.max(0, ship.speed * 0.45 - 1.2);

            bestResult = {
                collided: true,
                island,
                penetration,
                normalX: nx,
                normalZ: nz,
            };
        }
    }

    return bestResult;
}

/**
 * Computes terrain elevation at world coordinates (wx, wz) given an island.
 * Returns elevation above sea level (0.0 if in ocean water).
 */
export function getIslandElevation(wx: number, wz: number, island: IslandEntity): number {
    const dx = wx - island.x;
    const dz = wz - island.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist >= island.radius) return 0.0;

    // Smooth cosine dome profile with beach shelf
    const t = 1.0 - (dist / island.radius);
    if (island.type === "rock_needle" || island.type === "crag") {
        return Math.pow(t, 0.7) * island.height;
    }
    // Sandy beach extends at low elevation (+1.2m to +2.5m) then rises into cliffs/plateau
    if (t < 0.25) {
        return 0.5 + (t / 0.25) * 2.0; // gentle beach slope from water to dry sand
    }
    const innerT = (t - 0.25) / 0.75;
    return 2.5 + Math.sin(innerT * (Math.PI / 2)) * (island.height - 2.5);
}

/**
 * Queries the world map for the nearest island and terrain surface height at (wx, wz).
 */
export function getTerrainHeight(wx: number, wz: number, world: WorldMap): { elevation: number; island: IslandEntity | null } {
    let maxElevation = 0.0;
    let foundIsland: IslandEntity | null = null;

    for (const island of world.islands) {
        const dx = wx - island.x;
        const dz = wz - island.z;
        if (Math.abs(dx) > island.radius || Math.abs(dz) > island.radius) continue;

        const elev = getIslandElevation(wx, wz, island);
        if (elev > maxElevation) {
            maxElevation = elev;
            foundIsland = island;
        }
    }

    return { elevation: maxElevation, island: foundIsland };
}
