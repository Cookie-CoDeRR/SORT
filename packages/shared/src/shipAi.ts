/**
 * Autonomous AI Ship Sailing Simulation.
 * Pure math only — no Babylon, no DOM, no Node APIs.
 * Runs identically on server and client.
 */

import {
    AI_DEFAULT_PATROL_RADIUS,
    AI_PATROL_CENTER_X,
    AI_PATROL_CENTER_Z,
} from "./constants.js";
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
export function stepCirclePatrolAi(
    ship: ShipState,
    center: PatrolCenter = { x: AI_PATROL_CENTER_X, z: AI_PATROL_CENTER_Z },
    targetRadius: number = AI_DEFAULT_PATROL_RADIUS,
): ShipInput {
    // Sinking ships drop sails and drift to rest
    if (ship.waterLevel >= 0.95) {
        return { sail: 0, rudder: 0 };
    }

    const dx = ship.x - center.x;
    const dz = ship.z - center.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.001) {
        // Exactly at center: sail forward to establish an orbit
        return { sail: 1.0, rudder: 0.5 };
    }

    // World-space angle from patrol center to ship position
    const currentAngle = Math.atan2(dx, dz);

    // Tangent heading for clockwise orbit (dx/dt = cos(θ), dz/dt = -sin(θ))
    let desiredHeading = currentAngle + Math.PI / 2;

    // Radius correction: if outside the target orbit, steer inward towards center;
    // if inside the target orbit, steer outward away from center.
    const radiusError = dist - targetRadius;
    const maxCorrection = Math.PI / 3; // 60 deg max inward/outward correction
    const correction = Math.max(-maxCorrection, Math.min(maxCorrection, (radiusError / 25) * (Math.PI / 4)));
    desiredHeading += correction;

    // Normalize heading delta between desired heading and current ship heading into [-π, π]
    let headingDelta = desiredHeading - ship.heading;
    while (headingDelta > Math.PI) headingDelta -= 2 * Math.PI;
    while (headingDelta < -Math.PI) headingDelta += 2 * Math.PI;

    // Proportional rudder controller
    const rudder = Math.max(-1, Math.min(1, headingDelta * 1.8));

    // Sail speed notch: drop to half sail if turning sharply (> 90 deg off target)
    const sail = Math.abs(headingDelta) > Math.PI / 2 ? 0.5 : 1.0;

    return { sail, rudder };
}
