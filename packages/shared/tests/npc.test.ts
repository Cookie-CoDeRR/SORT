import { describe, it, expect } from "vitest";
import { createDefaultNpcCrew, stepNpcCrew } from "../src/npc.js";

describe("NPC Crew & Station Filling System", () => {
    it("initializes four crew members with default stations", () => {
        const crew = createDefaultNpcCrew();
        expect(crew.vance.name).toBe("Captain Vance");
        expect(crew.vance.station).toBe("wheel");
        expect(crew.tobin.station).toBe("cannons_port");
        expect(crew.pip.role).toBe("Cabin Hand");
        expect(crew.ismene.role).toBe("Navigator");
    });

    it("yields helm when human player occupies wheel", () => {
        let crew = createDefaultNpcCrew();
        const occupied = new Set<string>(["wheel"]);

        crew = stepNpcCrew(crew, occupied, 0.0, 1.0);
        expect(crew.vance.station).toBe("idle");
        expect(crew.vance.animState).toBe("idle");

        // Player leaves wheel
        occupied.delete("wheel");
        crew = stepNpcCrew(crew, occupied, 0.0, 1.0);
        expect(crew.vance.station).toBe("wheel");
        expect(crew.vance.animState).toBe("steering");
    });

    it("auto-tasks Pip to repair when ship takes on water", () => {
        let crew = createDefaultNpcCrew();
        const occupied = new Set<string>();

        // Ship takes 15% water
        crew = stepNpcCrew(crew, occupied, 0.15, 1.0);
        expect(crew.pip.station).toBe("repairs");
        expect(crew.pip.animState).toBe("repairing");

        // Player steps up to do repairs
        occupied.add("repairs");
        crew = stepNpcCrew(crew, occupied, 0.15, 1.0);
        expect(crew.pip.station).toBe("idle");
    });
});
