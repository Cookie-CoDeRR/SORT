import { z } from "zod";

// ── TRIGGER SCHEMAS ────────────────────────────────────────────────────────
export const StoryTriggerSchema = z.discriminatedUnion("when", [
    z.object({
        when: z.literal("timeElapsed"),
        s: z.number(),
        then: z.string(),
        once: z.boolean().optional(),
    }),
    z.object({
        when: z.literal("shipInZone"),
        x: z.number(),
        z: z.number(),
        r: z.number(),
        then: z.string(),
    }),
    z.object({
        when: z.literal("flagSet"),
        key: z.string(),
        value: z.union([z.boolean(), z.string(), z.number()]),
        then: z.string(),
    }),
    z.object({
        when: z.literal("allEnemiesDead"),
        group: z.string(),
        then: z.string(),
    }),
    z.object({
        when: z.literal("objectiveDone"),
        id: z.string(),
        then: z.string(),
    }),
    z.object({
        when: z.literal("voteResult"),
        id: z.string(),
        then: z.string(),
    }),
    z.object({
        when: z.literal("cutsceneFinished"),
        id: z.string(),
        then: z.string(),
    }),
    z.object({
        when: z.literal("hpBelow"),
        entity: z.string(),
        pct: z.number(),
        then: z.string(),
    }),
]);

export type StoryTrigger = z.infer<typeof StoryTriggerSchema>;

// ── ACTION SCHEMAS ─────────────────────────────────────────────────────────
export const StoryActionSchema = z.discriminatedUnion("do", [
    z.object({
        do: z.literal("say"),
        line: z.string(),
    }),
    z.object({
        do: z.literal("playCutscene"),
        id: z.string(),
    }),
    z.object({
        do: z.literal("setObjective"),
        text: z.string(),
    }),
    z.object({
        do: z.literal("setWeather"),
        intensity: z.number(),
        seconds: z.number(),
    }),
    z.object({
        do: z.literal("spawn"),
        type: z.string(),
        params: z.record(z.string(), z.any()).optional(),
    }),
    z.object({
        do: z.literal("setFlag"),
        key: z.string(),
        value: z.union([z.boolean(), z.string(), z.number()]),
    }),
    z.object({
        do: z.literal("autopilot"),
        on: z.boolean(),
        heading: z.number().optional(),
    }),
    z.object({
        do: z.literal("startVote"),
        id: z.string(),
        options: z.array(z.object({ id: z.string(), label: z.string(), flagKey: z.string(), flagValue: z.union([z.boolean(), z.string(), z.number()]) })),
    }),
    z.object({
        do: z.literal("startBoss"),
        phase: z.number(),
    }),
    z.object({
        do: z.literal("checkpoint"),
    }),
    z.object({
        do: z.literal("fade"),
        black: z.boolean(),
        seconds: z.number(),
    }),
    z.object({
        do: z.literal("teleportToMap"),
        mapId: z.string(),
    }),
]);

export type StoryAction = z.infer<typeof StoryActionSchema>;

// ── BEAT SCHEMA ────────────────────────────────────────────────────────────
export const StoryBeatSchema = z.object({
    id: z.string(),
    enter: z.array(StoryActionSchema).default([]),
    triggers: z.array(StoryTriggerSchema).default([]),
    exit: z.array(StoryActionSchema).default([]),
    next: z.string().optional(),
});

export type StoryBeat = z.infer<typeof StoryBeatSchema>;

export const ChapterBeatsSchema = z.object({
    chapterId: z.string(),
    title: z.string(),
    initialBeat: z.string(),
    beats: z.array(StoryBeatSchema),
});

export type ChapterBeats = z.infer<typeof ChapterBeatsSchema>;
