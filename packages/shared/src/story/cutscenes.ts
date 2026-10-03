import { z } from "zod";

export const CutsceneCameraKeySchema = z.object({
    t: z.number(), // timestamp in seconds
    pos: z.tuple([z.number(), z.number(), z.number()]),
    look: z.tuple([z.number(), z.number(), z.number()]).or(z.string()), // coordinate or target entity
    fov: z.number().optional(),
    ease: z.enum(["linear", "inOut", "smooth"]).optional()
});

export const CutsceneTrackSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("camera"),
        keys: z.array(CutsceneCameraKeySchema)
    }),
    z.object({
        type: z.literal("dialogue"),
        line: z.string(),
        t: z.number()
    }),
    z.object({
        type: z.literal("fx"),
        name: z.string(),
        t: z.number()
    }),
    z.object({
        type: z.literal("timescale"),
        keys: z.array(z.object({ t: z.number(), v: z.number() }))
    })
]);

export const CutsceneTimelineSchema = z.object({
    id: z.string(),
    duration: z.number(), // in seconds
    skippable: z.boolean().default(true),
    tracks: z.array(CutsceneTrackSchema)
});

export const ChapterCutscenesSchema = z.object({
    cutscenes: z.record(z.string(), CutsceneTimelineSchema)
});

export type CutsceneCameraKey = z.infer<typeof CutsceneCameraKeySchema>;
export type CutsceneTrack = z.infer<typeof CutsceneTrackSchema>;
export type CutsceneTimeline = z.infer<typeof CutsceneTimelineSchema>;
export type ChapterCutscenes = z.infer<typeof ChapterCutscenesSchema>;
