/**
 * Pure simulation deterministic world & island generator.
 * Zero DOM, zero Babylon, zero Node-only APIs.
 * Runs identically on server and client using a 32-bit deterministic LCG PRNG.
 */
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
    radius: number;
    height: number;
    seed: number;
    hasLootCache: boolean;
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
export declare class SeededRng {
    private s;
    constructor(seed: number);
    /** Returns float in range [0, 1) */
    next(): number;
    /** Returns float in range [min, max) */
    range(min: number, max: number): number;
    /** Returns integer in range [min, max] */
    intRange(min: number, max: number): number;
}
/**
 * Generates an archipelago of islands and sea crags deterministically from a numeric seed.
 */
export declare function generateWorldMap(seed?: number, islandCount?: number, rockCount?: number): WorldMap;
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
export declare function resolveShipIslandCollisions(ship: ShipState, world: WorldMap, shipRadius?: number): IslandCollisionResult;
/**
 * Computes terrain elevation at world coordinates (wx, wz) given an island.
 * Returns elevation above sea level (0.0 if in ocean water).
 */
export declare function getIslandElevation(wx: number, wz: number, island: IslandEntity): number;
/**
 * Queries the world map for the nearest island and terrain surface height at (wx, wz).
 */
export declare function getTerrainHeight(wx: number, wz: number, world: WorldMap): {
    elevation: number;
    island: IslandEntity | null;
};
