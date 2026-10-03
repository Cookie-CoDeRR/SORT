import { Room, Client } from "@colyseus/core";
import { StoryDirector } from "../systems/StoryDirector.js";
import chapterBeatsData from "@corsair/shared/src/content/chapter1.beats.json" with { type: "json" };

export class CampaignRoom extends Room {
    maxClients = 3; // 1 to 3 human crew slots
    public storyDirector!: StoryDirector;

    onCreate() {
        console.log("CampaignRoom created for The Night of the Widow's Lantern");

        this.storyDirector = new StoryDirector(chapterBeatsData);

        // Forward story actions to clients
        this.storyDirector.onAction = (action) => {
            this.broadcast("storyAction", action);
        };

        // Listen for client player inputs & votes
        this.onMessage("castVote", (client: Client, message: { optionId: string }) => {
            this.storyDirector.castVote(client.sessionId, message.optionId);
            this.broadcast("voteUpdate", this.storyDirector.state.activeVote);
        });

        this.onMessage("debugJumpBeat", (client: Client, message: { beatId: string }) => {
            console.log(`[Debug] Client ${client.sessionId} jumping beat to ${message.beatId}`);
            this.storyDirector.jumpToBeat(message.beatId);
            this.broadcast("storyBeatUpdate", {
                currentBeatId: this.storyDirector.state.currentBeatId,
                activeObjective: this.storyDirector.state.activeObjective,
                flags: this.storyDirector.state.flags,
            });
        });

        // 20hz tick simulation
        this.setSimulationInterval((dtMs) => {
            this.storyDirector.step(dtMs / 1000);
        }, 50);
    }

    onJoin(client: Client) {
        console.log(`Player ${client.sessionId} joined Campaign co-op!`);
        client.send("storySync", {
            currentBeatId: this.storyDirector.state.currentBeatId,
            activeObjective: this.storyDirector.state.activeObjective,
            flags: this.storyDirector.state.flags,
        });
    }

    onLeave(client: Client) {
        console.log(`Player ${client.sessionId} left Campaign`);
    }
}
