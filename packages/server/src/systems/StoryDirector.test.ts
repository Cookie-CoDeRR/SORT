import { describe, it, expect } from "vitest";
import { StoryDirector } from "./StoryDirector.js";
import chapterBeatsData from "@corsair/shared/src/content/chapter1.beats.json" with { type: "json" };

describe("StoryDirector (Server State Machine)", () => {
    it("loads chapter 1 beats and enters initial cold open beat", () => {
        const director = new StoryDirector(chapterBeatsData);
        expect(director.state.currentBeatId).toBe("s0_cold_open");
        expect(director.state.currentWeatherIntensity).toBe(0.8);
    });

    it("evaluates time elapsed and transitions beats", () => {
        const director = new StoryDirector(chapterBeatsData);
        director.jumpToBeat("s1_the_wheel");
        expect(director.state.currentBeatId).toBe("s1_the_wheel");
        expect(director.state.activeObjective).toContain("Take the helm");

        // Step time by 26 seconds to trigger transition to s2
        director.step(26.0);
        expect(director.state.currentBeatId).toBe("s2_loose_iron");
        expect(director.state.activeObjective).toContain("wreckage");
    });

    it("evaluates distance zone triggers", () => {
        const director = new StoryDirector(chapterBeatsData);
        director.jumpToBeat("s5_the_quiet");
        expect(director.state.currentBeatId).toBe("s5_the_quiet");

        // Ship far away does not trigger
        director.step(1.0, { shipX: 0, shipZ: 0 });
        expect(director.state.currentBeatId).toBe("s5_the_quiet");

        // Ship inside zone triggers s6_rising
        director.step(1.0, { shipX: 0, shipZ: 850 });
        expect(director.state.currentBeatId).toBe("s6_rising");
    });

    it("records player votes and updates story flags", () => {
        const director = new StoryDirector(chapterBeatsData);
        director.jumpToBeat("s4_lightning_chart");
        expect(director.state.activeVote).not.toBeNull();

        director.castVote("client1", "opt_island");
        expect(director.state.flags.chose_island).toBe(true);

        director.step(1.0);
        expect(director.state.currentBeatId).toBe("s5_the_quiet");
    });
});
