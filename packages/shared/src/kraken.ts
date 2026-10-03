// ── Kraken Simulation (Shared, Deterministic & Mathematical IK/Posing) ────

export type TentacleState =
    | "SUBMERGED"
    | "RISING"
    | "IDLE_SWAY"
    | "TELEGRAPH"
    | "SLAM"
    | "SWEEP"
    | "GRAB"
    | "RECOVER"
    | "WOUNDED"
    | "SEVERED"
    | "RETREATING";

export interface TentacleSegmentPose {
    x: number;
    y: number;
    z: number;
    radius: number;
    isWeakPoint: boolean;
}

export interface TentacleSimState {
    id: number;
    state: TentacleState;
    angleOffset: number; // angle around ship in radians
    distance: number;    // distance from ship center
    hp: number;
    maxHp: number;
    stateTimer: number;
    telegraphProgress: number; // 0 to 1
    slamTarget?: { x: number; y: number; z: number };
}

export interface KrakenBossState {
    phase: 1 | 2 | 3;
    active: boolean;
    tentacles: TentacleSimState[];
    severedCount: number;
    targetSevered: number;
    inkWaterRadius: number; // blackened ocean water radius
}

export const TENTACLE_SEGMENT_COUNT = 10;
export const TENTACLE_HEIGHT = 28.0;

export function createDefaultKrakenBoss(phase: 1 | 2 | 3 = 1): KrakenBossState {
    const tentacleCount = phase === 1 ? 3 : phase === 2 ? 4 : 2;
    const hp = phase === 1 ? 120 : phase === 2 ? 160 : 400;

    const tentacles: TentacleSimState[] = [];
    for (let i = 0; i < tentacleCount; i++) {
        const angle = (i / tentacleCount) * Math.PI * 2 + 0.3;
        tentacles.push({
            id: i,
            state: "RISING",
            angleOffset: angle,
            distance: 32 + (i % 2) * 8, // 32m to 40m out
            hp,
            maxHp: hp,
            stateTimer: 0,
            telegraphProgress: 0
        });
    }

    return {
        phase,
        active: true,
        tentacles,
        severedCount: 0,
        targetSevered: tentacleCount,
        inkWaterRadius: 75.0
    };
}

/**
 * Computes deterministic bone/segment positions for a tentacle given its state and animation timer.
 * Mimics organic Sea of Thieves style serpentine curling, waving, sucker joint flex, and heavy whip-slams.
 */
export function calculateTentaclePose(
    tentacle: TentacleSimState,
    shipPos: { x: number; y: number; z: number },
    time: number
): TentacleSegmentPose[] {
    const segments: TentacleSegmentPose[] = [];

    // Base root anchor position in world coordinates (just below waterline)
    const rootX = shipPos.x + Math.cos(tentacle.angleOffset) * tentacle.distance;
    const rootZ = shipPos.z + Math.sin(tentacle.angleOffset) * tentacle.distance;
    const rootY = -4.0;

    // Elevation factor based on state
    let elevation = 1.0;
    if (tentacle.state === "SUBMERGED" || tentacle.state === "RETREATING") {
        elevation = Math.max(0, 1.0 - tentacle.stateTimer * 0.4);
    } else if (tentacle.state === "RISING") {
        elevation = Math.min(1.0, tentacle.stateTimer * 0.5);
    }

    // Curvature & sway wave parameters
    const swaySpeed = tentacle.state === "TELEGRAPH" ? 4.5 : 1.2;
    const swayPhase = time * swaySpeed + tentacle.id * 1.5;

    for (let i = 0; i < TENTACLE_SEGMENT_COUNT; i++) {
        const segFrac = i / (TENTACLE_SEGMENT_COUNT - 1); // 0 at base, 1 at tip
        const baseRadius = 1.8 * (1.0 - segFrac * 0.75); // tapering from 1.8m to 0.45m

        // S-curve sinusoidal spine deflection
        let swayX = Math.sin(swayPhase + segFrac * 2.8) * (segFrac * 4.5);
        let swayZ = Math.cos(swayPhase * 0.8 + segFrac * 2.2) * (segFrac * 3.5);
        let curY = rootY + (segFrac * TENTACLE_HEIGHT * elevation);

        // State-specific procedural animation curves (inspired by Sea of Thieves tentacle rigs)
        if (tentacle.state === "TELEGRAPH") {
            // Rears back high overhead, coiling tip menacingly toward ship
            const recoil = Math.sin(tentacle.stateTimer * 8.0) * 0.8;
            curY += Math.sin(segFrac * Math.PI) * 4.0;
            swayX += (shipPos.x - rootX) * 0.15 * segFrac + recoil;
            swayZ += (shipPos.z - rootZ) * 0.15 * segFrac;
        } else if (tentacle.state === "SLAM") {
            // Whip downwards violently toward deck
            const slamFrac = Math.min(1.0, tentacle.stateTimer * 1.5);
            const reach = (shipPos.x - rootX) * segFrac * slamFrac;
            const reachZ = (shipPos.z - rootZ) * segFrac * slamFrac;
            swayX += reach;
            swayZ += reachZ;
            curY = rootY + (segFrac * TENTACLE_HEIGHT * (1.0 - slamFrac * 0.65));
        } else if (tentacle.state === "WOUNDED") {
            // Violent flinch / thrash
            const thrash = Math.sin(tentacle.stateTimer * 16.0) * (1.0 - segFrac) * 3.0;
            swayX += thrash;
            swayZ -= thrash;
        }

        // Segments 3, 6, and 8 have glowing weak point sucker joints
        const isWeakPoint = i === 3 || i === 6 || i === 8;

        segments.push({
            x: rootX + swayX,
            y: curY,
            z: rootZ + swayZ,
            radius: baseRadius,
            isWeakPoint
        });
    }

    return segments;
}

/**
 * Steps the Kraken boss state machine (server authoritative).
 */
export function stepKrakenBoss(
    boss: KrakenBossState,
    dt: number,
    shipPos: { x: number; y: number; z: number }
): { boss: KrakenBossState; slamEvents: Array<{ x: number; z: number; power: number }> } {
    const next: KrakenBossState = {
        ...boss,
        tentacles: boss.tentacles.map(t => ({ ...t }))
    };

    const slamEvents: Array<{ x: number; z: number; power: number }> = [];

    for (const t of next.tentacles) {
        t.stateTimer += dt;

        switch (t.state) {
            case "RISING":
                if (t.stateTimer >= 2.0) {
                    t.state = "IDLE_SWAY";
                    t.stateTimer = 0;
                }
                break;

            case "IDLE_SWAY":
                // After 6-10s of swaying, telegraph an attack
                if (t.stateTimer >= 6.0 + (t.id * 2.0)) {
                    t.state = "TELEGRAPH";
                    t.stateTimer = 0;
                    t.telegraphProgress = 0;
                }
                break;

            case "TELEGRAPH":
                t.telegraphProgress = Math.min(1.0, t.stateTimer / 1.5);
                if (t.stateTimer >= 1.5) {
                    t.state = "SLAM";
                    t.stateTimer = 0;
                }
                break;

            case "SLAM":
                if (t.stateTimer >= 1.2) {
                    // Slam impacts near ship
                    slamEvents.push({
                        x: shipPos.x,
                        z: shipPos.z,
                        power: 1.0
                    });
                    t.state = "RECOVER";
                    t.stateTimer = 0;
                }
                break;

            case "RECOVER":
                if (t.stateTimer >= 3.0) {
                    t.state = "IDLE_SWAY";
                    t.stateTimer = 0;
                }
                break;

            case "WOUNDED":
                if (t.stateTimer >= 1.0) {
                    t.state = "IDLE_SWAY";
                    t.stateTimer = 0;
                }
                break;

            case "SEVERED":
                if (t.stateTimer >= 2.5) {
                    t.state = "SUBMERGED";
                }
                break;
        }
    }

    return { boss: next, slamEvents };
}

/**
 * Checks cannonball intersection against tentacle segment capsules.
 * Returns damage dealt (multiplied 3x if hitting a weak point sucker joint).
 */
export function testCannonballTentacleHit(
    ballPos: { x: number; y: number; z: number },
    ballRadius: number,
    tentacle: TentacleSimState,
    shipPos: { x: number; y: number; z: number },
    time: number
): { hit: boolean; damage: number; isWeakPoint: boolean } {
    if (tentacle.state === "SUBMERGED" || tentacle.state === "SEVERED") {
        return { hit: false, damage: 0, isWeakPoint: false };
    }

    const poses = calculateTentaclePose(tentacle, shipPos, time);

    for (let i = 0; i < poses.length; i++) {
        const seg = poses[i];
        const dx = ballPos.x - seg.x;
        const dy = ballPos.y - seg.y;
        const dz = ballPos.z - seg.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const hitRadius = seg.radius + ballRadius;

        if (distSq <= hitRadius * hitRadius) {
            const isWeak = seg.isWeakPoint;
            const baseDamage = 40;
            const finalDamage = isWeak ? baseDamage * 3 : baseDamage;
            return { hit: true, damage: finalDamage, isWeakPoint: isWeak };
        }
    }

    return { hit: false, damage: 0, isWeakPoint: false };
}
