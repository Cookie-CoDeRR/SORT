import { z } from "zod";

export const DialogueChoiceSchema = z.object({
    id: z.string(),
    label: z.string(),
    flagKey: z.string(),
    flagValue: z.union([z.boolean(), z.string(), z.number()]),
    next: z.string().optional(),
});

export type DialogueChoice = z.infer<typeof DialogueChoiceSchema>;

export const DialogueLineSchema = z.object({
    id: z.string(),
    speaker: z.enum(["PIP", "VANCE", "TOBIN", "ISMENE", "KAEL", "NARRATOR"]),
    text: z.string(),
    duration: z.number().optional(), // Auto-computed if omitted (~15 chars/sec)
    portrait: z.string().optional(),
    voice: z.string().optional(),
    choices: z.array(DialogueChoiceSchema).optional(),
    next: z.string().optional(),
    isBark: z.boolean().default(false), // true: bottom non-blocking bark; false: blocking scene dialogue
});

export type DialogueLine = z.infer<typeof DialogueLineSchema>;

export const ChapterDialogueSchema = z.object({
    chapterId: z.string(),
    lines: z.record(z.string(), DialogueLineSchema),
});

export type ChapterDialogue = z.infer<typeof ChapterDialogueSchema>;
