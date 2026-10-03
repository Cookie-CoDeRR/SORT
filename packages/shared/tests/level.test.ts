import { describe, it, expect } from "vitest";
import levelJson from "../src/content/chapter1.level.json" with { type: "json" };
import { ChapterLevelSchema, getLevelColliders } from "../src/story/level.js";

describe("Chapter 1 Level & Scenery Schema", () => {
    it("validates chapter1.level.json with Zod schema", () => {
        const parsed = ChapterLevelSchema.safeParse(levelJson);
        expect(parsed.success).toBe(true);
        if (!parsed.success) {
            console.error(parsed.error);
        }
    });

    it("verifies spawn location and route length", () => {
        const level = ChapterLevelSchema.parse(levelJson);
        expect(level.spawn.pos).toEqual([-1400, -1300]);
        expect(level.spawn.headingDeg).toBe(40);
        expect(level.route.length).toBe(10);
        expect(level.route[0].id).toBe("r0");
        expect(level.route[9].id).toBe("r9");
    });

    it("extracts colliders for landmarks and tooth ring with Maw Gate opening", () => {
        const level = ChapterLevelSchema.parse(levelJson);
        const colliders = getLevelColliders(level);
        expect(colliders.length).toBeGreaterThan(5);

        // Maw teeth colliders should skip the entrance gap around 225 deg
        const mawColliders = colliders.filter(c => c.id.startsWith("maw_teeth"));
        expect(mawColliders.length).toBeGreaterThan(0);
        expect(mawColliders.length).toBeLessThan(10); // at least 1-2 skipped due to gap
    });
});
