import { z } from "zod";

export const StoryFlagsSchema = z.object({
    chose_island: z.boolean().default(false),
    tobin_alive: z.boolean().default(true),
    ismene_alive: z.boolean().default(true),
    vance_status: z.enum(["active", "unknown", "survived", "lost"]).default("active"),
    pip_status: z.enum(["active", "unknown", "survived", "lost"]).default("active"),
    pip_has_compass: z.boolean().default(false),
    blamed: z.enum(["vance", "self", "ismene"]).nullable().default(null),
    saw: z.enum(["kraken", "face", "nothing"]).nullable().default(null),
    mentioned_case: z.boolean().nullable().default(null),
    trust_kael: z.number().nullable().default(null), // -1, 0, 1
    stats: z.object({
        tentaclesSevered: z.number().default(0),
        planksUsed: z.number().default(0),
        timeSeconds: z.number().default(0),
    }).default({ tentaclesSevered: 0, planksUsed: 0, timeSeconds: 0 }),
    custom: z.record(z.string(), z.union([z.boolean(), z.string(), z.number()])).default({}),
});

export type StoryFlags = z.infer<typeof StoryFlagsSchema>;

export function createDefaultStoryFlags(): StoryFlags {
    return StoryFlagsSchema.parse({});
}
