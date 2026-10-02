/**
 * Autonomous AI Ship Sailing Simulation.
 * Pure math only — no Babylon, no DOM, no Node APIs.
 * Runs identically on server and client.
 */
import { ShipState, ShipInput } from "./shipPhysics.js";
export interface PatrolCenter {
    x: number;
    z: number;
}
/**
 * Computes autonomous sailing inputs for an AI ship to cruise in a smooth circle
 * around a designated patrol center point.
 *
 * Automatically:
 * - Steers along the orbit circle tangent
 * - Smoothly corrects inward if drifting outside the patrol radius
 * - Corrects outward if too close to the center
 * - Eases sails during tight maneuvers
 * - Strikes sails when sinking
 */
export declare function stepCirclePatrolAi(ship: ShipState, center?: PatrolCenter, targetRadius?: number): ShipInput;
