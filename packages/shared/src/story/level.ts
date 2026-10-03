import { z } from "zod";

export const RoutePointSchema = z.object({
    id: z.string(),
    pos: z.tuple([z.number(), z.number()]),
    note: z.string().optional()
});

export const LandmarkSchema = z.object({
    id: z.string(),
    type: z.string(),
    pos: z.tuple([z.number(), z.number()]).optional(),
    center: z.tuple([z.number(), z.number()]).optional(),
    radius: z.number().optional(),
    ringRadius: z.number().optional(),
    count: z.number().optional(),
    gapCenterDeg: z.number().optional(),
    gapHalfWidthDeg: z.number().optional(),
    height: z.number().optional(),
    props: z.array(z.string()).default([]),
    collider: z.boolean().optional()
});

export const LevelTriggerSchema = z.object({
    id: z.string(),
    pos: z.tuple([z.number(), z.number()]),
    r: z.number(),
    beat: z.string()
});

export const LevelLightSchema = z.object({
    id: z.string(),
    pos: z.tuple([z.number(), z.number()]),
    height: z.number(),
    color: z.string(),
    states: z.array(z.string())
});

export const NpcShipSpawnSchema = z.object({
    id: z.string(),
    spawn: z.tuple([z.number(), z.number()]),
    headingDeg: z.number(),
    state: z.string()
});

export const ChapterLevelSchema = z.object({
    id: z.string(),
    units: z.string(),
    axes: z.string(),
    bounds: z.object({
        playRadius: z.number(),
        stormWallRadius: z.number()
    }),
    spawn: z.object({
        pos: z.tuple([z.number(), z.number()]),
        headingDeg: z.number()
    }),
    route: z.array(RoutePointSchema),
    landmarks: z.array(LandmarkSchema),
    lights: z.array(LevelLightSchema),
    triggers: z.array(LevelTriggerSchema),
    npcShips: z.array(NpcShipSpawnSchema),
    reaverFleeHeadingDeg: z.number(),
    reaverFleeDespawnDistance: z.number()
});

export type RoutePoint = z.infer<typeof RoutePointSchema>;
export type Landmark = z.infer<typeof LandmarkSchema>;
export type LevelTrigger = z.infer<typeof LevelTriggerSchema>;
export type ChapterLevel = z.infer<typeof ChapterLevelSchema>;

/**
 * Returns circular colliders from the level definition for ship collision detection.
 */
export function getLevelColliders(level: ChapterLevel): Array<{ id: string; x: number; z: number; radius: number }> {
    const colliders: Array<{ id: string; x: number; z: number; radius: number }> = [];

    for (const lm of level.landmarks) {
        if (!lm.collider) continue;

        if (lm.pos && lm.radius) {
            colliders.push({
                id: lm.id,
                x: lm.pos[0],
                z: lm.pos[1],
                radius: lm.radius
            });
        } else if (lm.type === "rock_ring" && lm.center && lm.ringRadius && lm.count && lm.gapCenterDeg !== undefined && lm.gapHalfWidthDeg !== undefined) {
            // Generate circular colliders for individual tooth pillars around the ring except the gap
            const count = lm.count;
            const stepDeg = 360 / count;
            const toothRadius = 24; // radius of individual jagged tooth pillar

            for (let i = 0; i < count; i++) {
                const deg = i * stepDeg;
                let diff = Math.abs(deg - lm.gapCenterDeg);
                if (diff > 180) diff = 360 - diff;
                if (diff <= lm.gapHalfWidthDeg) {
                    continue; // Entrance gap!
                }
                const rad = (deg * Math.PI) / 180;
                colliders.push({
                    id: `${lm.id}_tooth_${i}`,
                    x: lm.center[0] + Math.sin(rad) * lm.ringRadius,
                    z: lm.center[1] + Math.cos(rad) * lm.ringRadius,
                    radius: toothRadius
                });
            }
        }
    }

    return colliders;
}
