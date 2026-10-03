// ── NPC Crew Simulation (Deterministic & Shared) ──────────────────────────

export type NpcId = "vance" | "tobin" | "pip" | "ismene";

export type NpcStation = "wheel" | "cannons_port" | "cannons_starboard" | "repairs" | "idle" | "lookout";

export interface NpcState {
    id: NpcId;
    name: string;
    role: string;
    station: NpcStation;
    localPos: { x: number; y: number; z: number };
    targetStation: NpcStation;
    animState: "idle" | "steering" | "repairing" | "firing" | "running";
    actionTimer: number;
    accuracy: number; // 0.0 to 1.0 (mediocre, so player input matters)
    isAlive: boolean;
}

export function createDefaultNpcCrew(): Record<NpcId, NpcState> {
    return {
        vance: {
            id: "vance",
            name: "Captain Vance",
            role: "Captain",
            station: "wheel",
            localPos: { x: 0, y: 5.4, z: -11.5 }, // quarterdeck helm
            targetStation: "wheel",
            animState: "steering",
            actionTimer: 0,
            accuracy: 0.75,
            isAlive: true
        },
        tobin: {
            id: "tobin",
            name: "Tobin",
            role: "Master Gunner",
            station: "cannons_port",
            localPos: { x: -3.2, y: 4.6, z: 2.0 }, // port cannon line
            targetStation: "cannons_port",
            animState: "idle",
            actionTimer: 0,
            accuracy: 0.65,
            isAlive: true
        },
        pip: {
            id: "pip",
            name: "Pip",
            role: "Cabin Hand",
            station: "repairs",
            localPos: { x: 0, y: 4.2, z: 0 }, // main deck / lower hatch
            targetStation: "repairs",
            animState: "idle",
            actionTimer: 0,
            accuracy: 0.5,
            isAlive: true
        },
        ismene: {
            id: "ismene",
            name: "Ismene Roque",
            role: "Navigator",
            station: "lookout",
            localPos: { x: 0, y: 5.6, z: -8.0 }, // navigation chart table
            targetStation: "lookout",
            animState: "idle",
            actionTimer: 0,
            accuracy: 0.6,
            isAlive: true
        }
    };
}

/**
 * Updates NPC actions and station fallback.
 * If a human player takes a station (wheel, cannon, repair),
 * the NPC yields the station to the player.
 */
export function stepNpcCrew(
    crew: Record<NpcId, NpcState>,
    occupiedStations: Set<string>,
    waterLevel: number,
    dt: number
): Record<NpcId, NpcState> {
    const next: Record<NpcId, NpcState> = {
        vance: { ...crew.vance },
        tobin: { ...crew.tobin },
        pip: { ...crew.pip },
        ismene: { ...crew.ismene }
    };

    for (const id of Object.keys(next) as NpcId[]) {
        const npc = next[id];
        if (!npc.isAlive) continue;

        npc.actionTimer += dt;

        // If player is at the wheel, Vance stands beside the helm observing
        if (npc.id === "vance") {
            if (occupiedStations.has("wheel")) {
                npc.station = "idle";
                npc.localPos = { x: 1.8, y: 5.4, z: -11.0 };
                npc.animState = "idle";
            } else {
                npc.station = "wheel";
                npc.localPos = { x: 0, y: 5.4, z: -11.5 };
                npc.animState = "steering";
            }
        }

        // If ship is taking water and Pip is free, Pip works on repairs
        if (npc.id === "pip") {
            if (waterLevel > 0.05 && !occupiedStations.has("repairs")) {
                npc.station = "repairs";
                npc.animState = "repairing";
                npc.localPos = { x: 0, y: 4.2, z: 2.0 };
            } else {
                npc.station = "idle";
                npc.animState = "idle";
                npc.localPos = { x: -1.2, y: 4.2, z: 1.0 };
            }
        }

        // Tobin mans cannons if unoccupied and periodically fires or preps
        if (npc.id === "tobin") {
            if (occupiedStations.has("cannons_port")) {
                npc.station = "cannons_starboard";
                npc.localPos = { x: 3.2, y: 4.6, z: 2.0 };
            } else {
                npc.station = "cannons_port";
                npc.localPos = { x: -3.2, y: 4.6, z: 2.0 };
            }
            // Cycle between aiming, firing recoil, and reloading
            const cycle = npc.actionTimer % 8.0;
            if (cycle > 6.8) {
                npc.animState = "firing";
            } else if (cycle > 3.0) {
                npc.animState = "repairing"; // swabbing / reloading cannon
            } else {
                npc.animState = "idle";
            }
        }

        // Ismene monitors navigation charts or scans the horizon with a spyglass
        if (npc.id === "ismene") {
            const cycle = npc.actionTimer % 10.0;
            if (cycle < 5.0) {
                npc.localPos = { x: 0, y: 5.6, z: -8.0 };
                npc.station = "lookout";
                npc.animState = "idle";
            } else {
                npc.localPos = { x: 2.2, y: 5.4, z: -9.5 };
                npc.station = "lookout";
                npc.animState = "steering"; // leaning over rail scanning
            }
        }
    }

    return next;
}
