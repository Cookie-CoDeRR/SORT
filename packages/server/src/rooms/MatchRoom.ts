import { Room, Client } from "@colyseus/core";

export class MatchRoom extends Room {
  maxClients = 9;

  onCreate(options: unknown) {
    console.log("MatchRoom created!", options);
  }

  onJoin(client: Client) {
    console.log(client.sessionId, "joined!");
  }

  onLeave(client: Client) {
    console.log(client.sessionId, "left!");
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
