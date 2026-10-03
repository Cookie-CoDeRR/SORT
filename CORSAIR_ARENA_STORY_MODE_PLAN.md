# Corsair Arena: Story Mode ("The Night of the Widow's Lantern")
A 20-minute scripted co-op chapter for the hackathon, plus the technical plan for Antigravity to build it on top of the existing stack (TypeScript, Babylon.js, Colyseus, shared sim).

---

## 0. Scope decisions

| Decision | Choice | Reason |
|---|---|---|
| Mode | **Co-op PvE campaign room**, 1 to 3 humans. NPC crew fill empty stations | Judges will often play alone, so the demo must work solo |
| PvP | Untouched. Campaign is a separate room type reusing the same sim | No risk to the existing work |
| Player count in the story | 3 human crew slots, 4 story NPCs | NPCs are story characters, not extra stations |
| Cutscenes | Real-time, in-engine, driven by a timeline JSON | No video files, easy to edit, works in browser |
| Voice | Subtitles plus short voice-like "blips", with optional AI/TTS voice lines later | Fast to ship. Voice is a stretch goal |
| Save system | None. In-memory checkpoints per beat | Hackathon scope |
| Safety | **Photosensitivity warning and a "reduce lightning" toggle** (see 6.3) | Heavy lightning flashes can harm people. Required, not optional |

All names, plot and characters below are original. They are inspired by the genre only.

---

## 1. Story bible

**Setting:** A fictional archipelago called the Hollow Reach. Ships that sail it at night are known to vanish.

**Your ship:** the *Saltwidow*, a battered merchant-privateer sloop, carrying a sealed chart case that its owner will not discuss.

**You (3 players):** the newest hands aboard, signed on two weeks ago. You are not the hero yet. You are the ones who survive.

### NPC crew
| Fate | Name | Role | Personality | Function |
|---|---|---|---|---|
| Survives (unknown) | **Captain Hesper Vance** | Captain, 50s | Dry, controlled, hides fear behind orders | Teaches helm, makes the key decisions |
| **Dies, Phase 1 end** | **Tobin Hale** | Bosun and cook, 60s | Warm, tells bad jokes, fatherly | Teaches cannons and repair, the emotional anchor |
| Survives (unknown) | **Pip Marlow** | Lamp-boy, 14 | Nervous, brave when it counts, carries Tobin's lucky compass | Gives the audience someone to protect |
| **Dies, Phase 2 end** | **Ismene Roque** | Navigator and cartographer, 30s | Rational, guilty, knows more than she says | Navigation, the island, the secret chart |
| Island | **Kael** | Castaway | Calm, too calm, asks the wrong questions | Act 4 hook and the setup for the next story |

### The secret (for the next chapter, reveal only a hint now)
Ismene's chart marks the island as a place the Kraken guards. Someone paid Captain Vance to bring something to it. The light on the island is a lure, and Kael is somehow connected to it. In this chapter the players only find out that the light was not a lighthouse.

### Themes
Trust in a crew, sacrifice, fear of the dark water.

---

## 2. The 20-minute timeline

| Time | Beat | What the player does | Type |
|---|---|---|---|
| 0:00 to 0:45 | **S0 Cold open** | Black screen, thunder, wake on deck, camera drifts to Pip shaking you awake | Cinematic |
| 0:45 to 2:30 | **S1 The wheel** | Learn helm and sails with Vance. Keep the bow into the swells | Tutorial |
| 2:30 to 4:30 | **S2 Loose iron** | Learn cannons with Tobin. Shoot drifting wreckage blocking the path | Tutorial |
| 4:30 to 6:00 | **S3 Breach** | A rogue wave opens the hull. Learn planks and bailing. Ismene and Tobin talk | Tutorial |
| 6:00 to 7:30 | **S4 Lightning chart** | Lightning shows an island about 2 km away. Crew vote: go or wait | Choice |
| 7:30 to 9:00 | **S5 The quiet** | Sail 2 km. The storm eases, water goes eerily still. Character moments | Exploration |
| 9:00 to 9:45 | **S6 Rising** | Kraken reveal, tentacles surround the ship | Cinematic |
| 9:45 to 11:45 | **S7a Phase 1** | 3 tentacles. Learn weak points | Boss |
| 11:45 to 12:30 | **S7b Tobin's death** | Cinematic and a handover of his compass | Cinematic |
| 12:30 to 14:00 | **S7c Phase 2** | 4 tentacles, grabbing and crushing | Boss |
| 14:00 to 14:45 | **S7d Ismene's death** | Cinematic | Cinematic |
| 14:45 to 16:15 | **S7e Phase 3** | 2 large tentacles. Vance on the helm. One last stand | Boss |
| 16:15 to 17:30 | **S8 The Wave** | Kraken retreats wounded, then a giant wave rises. Cinematic, black screen | Cinematic |
| 17:30 to 20:00 | **S9 The beach** | Wake on the shore. Kael wakes you and asks four questions. End card | Dialogue |

Total: 20:00. The three pure combat stretches are about 5 minutes combined, so the pacing is dialogue and cinematics heavy. If it needs trimming, shorten S5 and S9 first.

---

## 3. Scene scripts and dialogue

Format: `[SPEAKER] line`. `(action)` lines are beats for the cutscene editor. Keep each line under about 90 characters so subtitles fit on one line.

### S0 Cold open (0:00)
(Black. Thunder. Rain on wood.)
**PIP:** Wake up. Please. Wake up!
(Fade in on the deck, tilted. Pip's face, soaked. Camera rights itself.)
**PIP:** The captain wants all hands. It's getting worse.
(Lightning. Title card: THE SALTWIDOW.)

### S1 The wheel (0:45)
(Objective: Take the helm.)
**VANCE:** You. Take the wheel. Bow into the swells, never side-on.
(Player claims the helm. Tutorial prompt: A/D steer, W/S sails.)
**VANCE:** Ease her. The ship turns slower than you want, and that is not a flaw.
(If the player lets a wave hit the side:)
**VANCE:** Bow! Into the swell!
(Player holds heading for 20 seconds. Objective complete.)
**VANCE:** Good. Keep her steady. Hold this heading.

### S2 Loose iron (2:30)
(Floating wreckage ahead blocks the channel. Tobin pulls the player to a cannon.)
**TOBIN:** Come here, lad. Or lass. Whichever you are. Hands on the iron.
**TOBIN:** Aim high on the roll. The sea moves, the shot doesn't. Lead her.
(Tutorial: aim, load, fire. 3 wreck piles to clear.)
**TOBIN:** Not bad. Thirty years I've fired these, and I still miss with the wind on my side.
**PIP:** Tobin, did the cannons ever scare you?
**TOBIN:** Every day, Pip. That's how you know you're paying attention.

### S3 Breach (4:30)
(Scripted rogue wave hits the port side. Cinematic hit-stop of 1 second. Two leaks open.)
**ISMENE:** Port side! We're taking water!
**TOBIN:** Planks, there, by the mast! Hammer's on the hook!
(Tutorial: patch two holes with planks, bail until water is under 20%.)
**ISMENE:** Captain, we're too far off the chart. The currents are wrong.
**VANCE:** Then read the chart again, Roque.
**ISMENE:** (quietly) I've read it a hundred times.
(Water under 20%. Objective complete.)

### S4 Lightning chart (6:00)
(Lightning strikes close. For two seconds the horizon is lit: a dark island and a faint lantern light, about 2 km away.)
**PIP:** There! A light! A lighthouse!
**ISMENE:** There's no lighthouse on my chart.
**VANCE:** (beat) And we cannot ride this out much longer. The hull won't hold till dawn.
(Choice, each of the 3 players votes, NPC Vance breaks ties:)
- **Make for the light.** (flag `chose_island = true`)
- **Ride out the storm.** (flag `chose_island = false`)
(If "ride out", after 20 seconds a second breach and **VANCE:** "We're done waiting. Make for the light." Both paths converge. The flag only changes later dialogue.)

### S5 The quiet (7:30)
(Set heading to the island. The storm intensity fades from 1.0 to 0.2 over 90 seconds. Rain thins. The waves flatten. Lightning stops. Unnatural calm.)
**PIP:** It stopped. Why did it stop?
**TOBIN:** Storms end, Pip.
**PIP:** Not like that.
(Tobin gives a quiet moment. Optional interactive: sit next to him at the rail.)
**TOBIN:** When I was your age I sailed with a man who said the sea only goes quiet to listen.
**PIP:** Listen to what?
**TOBIN:** (forced laugh) To us, I suppose. Here. Take my compass. For luck.
(Tobin gives Pip the compass. Camera lingers on it. This item pays off later.)
**ISMENE:** (to the players) The chart says nothing lives here. I think the chart was lying to me.
(Bubbles rise around the ship. A low sound. The light on the island flickers once, as if something crossed it.)

### S6 Rising (9:00)
(Cinematic: the camera pulls up to the quarterdeck. The water boils. A tentacle breaks the surface, then another, then all around the ship. Music drops out for two seconds, then a low brass hit.)
**VANCE:** (very calm) All hands. Battle stations.
(Title card: THE KRAKEN.)

### S7a Phase 1 (9:45): "First blood"
Boss tutorial. See section 4. Dialogue barks during the fight (random, one every 12 s at most):
- **TOBIN:** Aim for the joints! The soft parts!
- **ISMENE:** Left side, it's coming around!
- **VANCE:** Don't waste shot. Count your powder.
- **PIP:** There are too many of them!
At the end of Phase 1 (3 tentacles severed or retreated), the 4th tentacle strikes the quarterdeck.

### S7b Tobin's death (11:45), cinematic (about 45 s)
(Tentacle wraps the mast rigging and starts to pull the ship over. Time slows to 30%. Camera on Tobin. He grabs an axe.)
**TOBIN:** The sheet line. If I cut it, she rights herself.
**PIP:** No! I'll do it!
**TOBIN:** Pip. Look at me. You're the only one on this ship who knows how to listen.
(He climbs the rigging. The tentacle snatches him. He cuts the line as he is lifted.)
**TOBIN:** (shouted back, almost cheerful) Keep her steady!
(The ship rights itself. Silence. Rain. Pip clutching the compass. Music: a solo violin.)
(Return to gameplay. Objective: Survive.)

### S7c Phase 2 (12:30): "The grip"
Tentacles now grab the hull. See section 4. New barks:
- **ISMENE:** It's pulling us in! Cut its grip, cut the ropes!
- **VANCE:** Hold her heading. Do not let her turn broadside.
- **PIP:** (softly, to the compass) Come on, Tobin. Come on.

### S7d Ismene's death (14:00), cinematic (about 45 s)
(A massive tentacle rises over the stern, ready to crush the helm. Ismene runs to the signal lantern.)
**ISMENE:** The light. It follows the light, Captain. That's what the chart said.
**VANCE:** Roque, what did you do?
**ISMENE:** (to the players) I told them it was a map. It was a leash. Forgive me.
(She lights the lantern, leaps into a rowboat, rows away. The tentacles all turn toward her.)
**ISMENE:** (shouting as she rows into the dark) Go! Go now!
(Tentacles pull her boat under. The lantern bobs, then goes out.)
(Return to gameplay. The tentacles have been drawn away from the ship. Objective: Finish them.)

### S7e Phase 3 (14:45): "Last stand"
Vance takes the helm herself (NPC at helm). The players only run cannons and repair. Two huge tentacles remain.
**VANCE:** I have the wheel. You two, give them everything.
**VANCE:** For Tobin. For Roque. Fire!
Final beat: when the second giant tentacle is down, the remaining ones retreat into the water.

### S8 The Wave (16:15), cinematic (about 70 s)
**PIP:** Is it over? Captain, is it over?
**VANCE:** (looks at the horizon) Not yet.
(The sea pulls back from the ship. The horizon rises. A wave taller than the mast.)
**VANCE:** Lash yourselves! All of you! Pip, to the mast!
(She lashes Pip to the mast and hands the players a rope. Camera low on the deck. The wave arrives. Sound cuts. Screen goes black. Only breathing.)

### S9 The beach (17:30)
(Fade in. Sand, grey light, wreckage on the shore. First-person on your back. A hand shakes your shoulder.)
**KAEL:** Easy. Easy. You're alive.
(Player stands. Land movement mode. Player can look around: broken planks, the *Saltwidow*'s mast on the beach, no sign of Vance or Pip. Kael follows.)
**KAEL:** I found you on the rocks. Just you three. I didn't find anyone else.
**KAEL:** Before we do anything, I need to ask some things. The tide won't wait.
(Four dialogue-choice questions. Each stores a flag for the next chapter.)

1. **KAEL:** "Who told you to sail toward the light?"
   - "The captain." (`blamed = vance`)
   - "Nobody. We chose." (`blamed = self`)
   - "The navigator warned us." (`blamed = ismene`)
2. **KAEL:** "What did you see in the water?"
   - "A creature." (`saw = kraken`)
   - "A face." (`saw = face`) (hint of a human link)
   - "I don't remember." (`saw = nothing`)
3. **KAEL:** "Did your ship carry anything it shouldn't have?"
   - "A sealed chart case." (`mentioned_case = true`)
   - "Nothing." (`mentioned_case = false`)
4. **KAEL:** "Do you trust me?"
   - "Yes." (`trust_kael = 1`)
   - "No." (`trust_kael = -1`)
   - "Not yet." (`trust_kael = 0`)

(End: Kael looks out to sea. In the distance, the lantern light flickers once.)
**KAEL:** (to himself) Then it hasn't finished.
(End card: TO BE CONTINUED. Show the flags summary for the next chapter and the stats: time, tentacles severed, planks used.)

---

## 4. Boss design: The Kraken

The Kraken is never one big mesh. It is a **boss controller** with several **tentacles** that are the actual targets. This keeps the physics, hit detection and animation manageable.

### 4.1 Boss structure
- `KrakenBoss`: phase, global aggro timer, spawn positions for tentacles in a ring around the ship (radius 25 to 45 m, adjusted if the ship moves).
- `Tentacle` (up to 4 at once): `anchor` (world position under the surface), `state`, `hp`, `tipTarget`, `segmentCount = 10`, `stateTimer`.
- The Kraken body is never fully seen. Only a dark shape and two glowing eyes at the 9:00 and 16:15 cinematics. This saves art time.

### 4.2 Tentacle states (server state machine)
`SUBMERGED` then `RISING` then `IDLE_SWAY` then `TELEGRAPH` (1.5 s warning: glow and rumble) then `SLAM` or `SWEEP` or `GRAB` then `RECOVER` then back to `IDLE_SWAY`.
Hit reactions: `WOUNDED` (flinch when it takes a large hit), `SEVERED` (when HP reaches 0), `RETREATING`.

| Attack | Telegraph | Effect | Counterplay |
|---|---|---|---|
| **Slam** | Tentacle rises overhead, shadow circle on deck | Deck damage in a radius, may knock players down, can open one hull slot | Move out of the circle, shoot it during the rise |
| **Sweep** | Tentacle lowers and coils on one side | Sweeps across the deck. Players on the line are pushed overboard | Duck behind the mast or jump | 
| **Grab** (Phase 2+) | Tentacle winds around the hull | Applies a pull force toward the Kraken and locks the rudder partially. Opens 1 slot per 3 seconds | Cut the grip: shoot the glowing grip point, or melee the "grip rope" |
| **Crush** (Phase 3) | Two tentacles grab together | Hull damage rate x2 until one is cut | Focus fire on one |

### 4.3 Damage and weak points
- Each tentacle has a base capsule chain for hit tests (swept ball segment vs capsule chain).
- Weak point: the **joint** (3 per tentacle, glowing suckers). Hit = x3 damage, otherwise x1.
- Tentacle HP: Phase 1: 120. Phase 2: 160. Phase 3: 400 (large).
- Cannonball base damage 40. A tentacle also takes 80 damage from the lightning rod trick (see 4.5).

### 4.4 Phases
| Phase | Tentacles | New mechanic | Ends when |
|---|---|---|---|
| 1 | 3 | Slam and sweep. Teach weak points | 3 severed or retreated, then Tobin cinematic |
| 2 | 4 | Grab and cut-rope. Water lashes the deck | Ismene cinematic triggers at 2 of 4 severed |
| 3 | 2 large | Crush. NPC Vance on the helm. Players only on cannons and repair | 2 severed, then Wave |

Total tentacle count severed: 3 + 3 + 2 = 8 across the fight (not all at once).

### 4.5 Optional "wow" mechanic: lightning rod
During Phase 3 the storm returns for 20 seconds. If a tentacle is touching the mast when lightning strikes (scripted timing with a visible warning), it takes massive damage and the screen flashes white. Cut this first if time is short.

### 4.6 Difficulty and soft-fail
- **The ship cannot permanently sink in story mode.** If water reaches 100% or all humans are dead, show a "She goes under..." screen and restart from the last checkpoint (start of the current phase).
- Scale tentacle HP by human count (1 player = 60%, 2 = 80%, 3 = 100%).
- NPCs fill empty stations: if the Cannons station is empty, Tobin fires; if the Repair station is empty, Pip patches. Their accuracy is deliberately mediocre, so players matter.

---

## 5. Technical integration plan

### 5.1 New modules

```
packages/shared/src/
  story/
    types.ts          # Beat, Trigger, Action, DialogueLine, Choice, CutsceneTimeline
    flags.ts          # StoryFlags (typed key-value), serialization
  weather.ts          # storm intensity -> wave params, lightning schedule (deterministic)
  kraken.ts           # tentaclePose(state, t), capsule chain, damage tables
  npc.ts              # NpcState, NpcBehavior enum, stepNpc()
  content/
    chapter1.beats.json      # the beat graph (section 6.1)
    chapter1.dialogue.json   # all lines + choices
    chapter1.cutscenes.json  # timelines
packages/server/src/
  rooms/CampaignRoom.ts      # extends MatchRoom (or composes), loads chapter data
  systems/StoryDirector.ts   # runs the beat graph
  systems/NpcSystem.ts       # NPC AI + station filling
  systems/KrakenSystem.ts    # boss state machine, attacks, hit tests
  systems/WeatherSystem.ts   # schedules
packages/client/src/
  story/DialogueUI.ts        # subtitles, portraits, choices, skip
  story/CutscenePlayer.ts    # timeline runner
  story/ObjectiveUI.ts       # objective text and markers
  story/Letterbox.ts         # bars and input lock
  render/Weather.ts          # rain, fog, lightning, sky
  render/KrakenView.ts       # tentacle meshes from pose function
  render/NpcView.ts          # NPC characters and animations
  audio/MusicDirector.ts     # stems, ducking, stings
  land/IslandScene.ts        # S9 beach map and land movement
```

### 5.2 StoryDirector (the heart of the system)
A **server-side state machine** over a list of Beats. A beat is: `id`, `enter` actions, `triggers` (conditions to leave), `exit` actions, `next`.

- **Triggers:** `timeElapsed(s)`, `shipInZone(x,z,r)`, `flagSet(key)`, `allEnemiesDead(group)`, `objectiveDone(id)`, `playersAtStation(station)`, `voteResult(id)`, `cutsceneFinished(id)`, `hpBelow(entity, pct)`.
- **Actions:** `say(lineId)`, `playCutscene(id)`, `setObjective(text)`, `setWeather(intensity, seconds)`, `spawn(type, params)`, `setFlag(k,v)`, `autopilot(on, heading)`, `startVote(id, options)`, `startBoss(phase)`, `checkpoint()`, `fade(black, seconds)`, `teleportToMap(mapId)`.
- The director is **deterministic and tick-based** so late joiners can be synced from `currentBeatId` and flags.
- Keep it data-driven. Adding a scene means editing JSON, not code.

### 5.3 Cinematic system (two layers)
1. **Server:** only sends `{cutsceneId, startTick}` and applies **gameplay locks** (players frozen at stations, autopilot holds course, invulnerability to hazards, enemy attack timers paused).
2. **Client:** `CutscenePlayer` runs the timeline from `startTick`, so all clients are in sync.

Timeline JSON (tracks run in parallel):
```json
{
  "id": "tobin_death",
  "duration": 45,
  "skippable": "vote",
  "tracks": [
    { "type": "camera", "keys": [
      { "t": 0, "pos": [2,3,-4], "look": "npc:tobin", "fov": 55 },
      { "t": 8, "pos": [1,2,-2], "look": "npc:tobin", "fov": 35, "ease": "inOut" } ] },
    { "type": "timescale", "keys": [ { "t": 2, "v": 0.3 }, { "t": 30, "v": 1 } ] },
    { "type": "anim", "target": "npc:tobin", "clip": "grab_axe", "t": 4 },
    { "type": "kraken", "tentacle": 2, "pose": "wrap_mast", "t": 1 },
    { "type": "dialogue", "line": "tobin_d1", "t": 6 },
    { "type": "fx", "name": "lightning", "t": 12 },
    { "type": "music", "stem": "violin_solo", "t": 30, "duck": 0.2 }
  ]
}
```
- Camera uses simple keyframe interpolation (position, look target, fov) with ease curves. Implement with Babylon `Animation` or a small custom lerp, **not** a heavy editor.
- Targets such as `npc:tobin` are resolved by id each frame, so cutscene cameras follow moving ship parts correctly (all positions in ship-local space).
- Letterbox bars, HUD hidden, input locked, music ducking applied automatically on cutscene start.
- **Skipping:** hold a key. In multiplayer, skip only when all humans hold it (vote). Skip jumps to `duration` and applies each track's end state.

### 5.4 Dialogue system
- Lines in JSON: `{ id, speaker, text, voice?, portrait?, duration?, next?, choices?[] }`.
- Two kinds:
  - **Bark:** short, non-blocking, bottom of the screen, auto-timed (reading speed about 15 chars per second). Used during gameplay.
  - **Scene dialogue:** blocking, shown during cutscenes and S9. Choices appear as buttons with a timer; in multiplayer, majority wins, ties go to the first player.
- Choice results are written to `StoryFlags` on the server, so they persist for the next chapter.
- Audio: if `voice` is missing, play a character-specific "blip" per syllable group (low-cost, hackathon friendly).

### 5.5 NPC system
- NPCs are server entities using the **same ship-local movement** as players, with `NpcState { id, shipId, localPos, activity, hp, alive }`.
- Behavior = tiny state machine: `IDLE_AT_POST`, `WALK_TO(target)`, `USE_STATION(id)`, `PATCH_LEAK`, `FLEE_COVER`, `SCRIPTED` (cutscenes override everything).
- **Station filling:** each tick, if a station is unclaimed by a human and the story allows it, a matching NPC takes it (Vance helm, Tobin cannons, Pip repair). Humans can displace NPCs by pressing interact.
- Death: not physics. A scripted sequence: set `SCRIPTED`, play the cutscene, then `alive = false` and remove the entity. Their barks stop and later dialogue lines check `alive`.
- Rendering: reuse the player character model with different materials and props (hat, coat colors), plus 8 to 10 animations (idle, walk, run, cannon, hammer, rope pull, climb, fall, grab-struggle, sit).

### 5.6 Weather system
- `weather.ts` exposes `stormIntensity` (0 to 1). It scales the Gerstner amplitude and wavelength in `waves.ts` through one multiplier, so ship physics (server and client) stay identical.
- Lightning is **deterministic**: strikes are scheduled from the seeded RNG per beat, so every client flashes at the same tick. Thunder delay = distance / 343 m/s (scaled down for gameplay feel).
- Visuals: rain particle system following the camera, fog density tied to intensity, sky color ramp, light intensity spike for each strike, wet-look specular boost on the deck.
- **Scripted rogue waves:** `RogueWave { startTick, heading, height, width }` added as an extra term in `waves.ts` and passed to the ship step. Used in S3 and S8. This is what makes the big wave actually lift and throw the ship, not just a visual.

### 5.7 Kraken rendering
- Build **one tentacle mesh** in Blender (skinned, about 12 bones, tapered, with sucker detail). Instance it for each tentacle.
- Server sends per tentacle: `state, anchor, tipTarget, stateTimer`. Client computes bone positions via shared `tentaclePose()` (a procedural chain using sine sway plus follow-the-leader toward `tipTarget`), so you do not need to network bones.
- Telegraph: emissive pulse on the tentacle and a decal ring on the target area.
- Severing: swap to a "stump" mesh, spawn a particle burst, and let a cut piece sink with a simple buoyancy-less fall.
- Cinematic poses (`wrap_mast`, `rise_all`) are hand-keyed poses in `tentaclePose` called with a pose name.

### 5.8 Land map for S9
- A new small scene: heightmap island (about 150 m across), beach, rocks, wreck props, a campfire.
- Add a **land movement mode** to the shared player controller: world-space walking with ground height from a heightfield function, no ship transform.
- Kael is an NPC with a short idle and talk animation, and he follows the player slowly.
- Transition: the Wave cutscene ends in black, the server switches `mapId` to `island_beach`, teleports players to the beach with the "wake up" camera animation.

### 5.9 Audio
- `MusicDirector` with 4 stems: storm bed, tension, combat, emotional. Crossfade between them by beat via `setMusic(stem, fadeSeconds)`.
- Ducking: music drops 70% during dialogue and cutscene lines.
- One-shots: thunder, wave crash, tentacle slam, rope snap, wood groan, heartbeat.
- Spatial audio for thunder and tentacles (Babylon audio engine, positional).

### 5.10 Camera and comfort
- Camera sway scaled by `stormIntensity`, capped, with the toggle.
- During cutscenes, the horizon stays level where possible.
- Subtitles: always on by default, large font option.

---

## 6. Data and configuration

### 6.1 Beat graph example
```json
{
  "id": "s5_quiet",
  "enter": [
    { "do": "setObjective", "text": "Sail to the island" },
    { "do": "setWeather", "intensity": 0.2, "seconds": 90 },
    { "do": "autopilot", "on": false }
  ],
  "triggers": [
    { "when": "shipInZone", "x": 820, "z": 1650, "r": 120, "then": "s6_rising" },
    { "when": "timeElapsed", "s": 40, "then": "say", "line": "pip_it_stopped", "once": true }
  ]
}
```

### 6.2 Story flags
```ts
interface StoryFlags {
  chose_island: boolean;
  tobin_alive: boolean; ismene_alive: boolean;
  vance_status: 'unknown'; pip_status: 'unknown';
  pip_has_compass: boolean;
  blamed: 'vance' | 'self' | 'ismene' | null;
  saw: 'kraken' | 'face' | 'nothing' | null;
  mentioned_case: boolean | null;
  trust_kael: -1 | 0 | 1 | null;
  stats: { tentaclesSevered: number; planksUsed: number; timeSeconds: number };
}
```
This object is exported at the end card and will be the input to the next chapter.

### 6.3 Photosensitivity
- Show a warning screen before the campaign.
- Setting "Reduce flashing": lightning uses a soft glow lasting at least 0.5 s instead of a full-screen flash, no strobe patterns, no more than 3 flashes per second at any time (also in the default mode).

---

## 7. Milestones (campaign track)

Priority tags: **P0** must have for the demo, **P1** should have, **P2** cut first.

### C0: Campaign room skeleton (P0)
- `CampaignRoom`, `StoryDirector` with a beat graph loader (zod-validate JSON), `StoryFlags`.
- Debug panel (dev only): jump to any beat, set flags, set the time of day.
- **Accept:** jump to any beat from the debug panel and the objective text updates. Tests for trigger evaluation.

### C1: Dialogue and objectives (P0)
- `DialogueUI` (barks, blocking scenes, choices, subtitles, blips), `ObjectiveUI`.
- Vote handling for choices across players.
- **Accept:** S1 and S2 dialogue plays on schedule. A choice written to a flag can be read by a later beat.

### C2: Weather and storm look (P0)
- `weather.ts`, rain, fog, deterministic lightning, thunder, rogue wave term in `waves.ts`.
- Photosensitivity setting.
- **Accept:** intensity 1.0 gives visibly violent waves that rock the ship more. Lightning flashes occur on the same ticks in two browser tabs.

### C3: NPC crew (P0)
- NPC model, animations, `NpcSystem`, station filling, the `SCRIPTED` state.
- **Accept:** playing solo, NPCs man the other stations without blocking the player. A human can displace an NPC.

### C4: Cutscene engine (P0)
- `CutscenePlayer`, camera/anim/dialogue/fx/music/timescale tracks, letterbox, input lock, server locks, skip vote.
- Build S0 and S3's wave hit first as test cutscenes.
- **Accept:** a cutscene starts at the same tick on all clients and ends with players in a valid state.

### C5: Tutorial beats S0 to S5 (P0)
- Implement the beats and the 3 mini-objectives (helm hold, wreck clearing, leak repair), the island choice and the calm approach.
- **Accept:** a fresh player can play S0 to S5 in about 9 minutes with no instructions outside the game.

### C6: Kraken (P0)
- Tentacle mesh and `tentaclePose`, `KrakenSystem` state machine, capsule chain hit tests, slam/sweep, then grab and rope cutting, then crush.
- Phase logic and soft-fail checkpoints.
- **Accept:** each attack is readable (telegraph visible), tentacles can be severed, a full boss run is winnable with 1 player plus NPCs.

### C7: Death cinematics and the Wave (P0)
- Tobin and Ismene cinematics, the S8 Wave (rogue wave term plus cutscene plus black screen).
- **Accept:** both cinematics trigger from the boss logic and return the game to a clean state.

### C8: Beach scene S9 (P1)
- Island scene, land movement, Kael, the 4-question dialogue, end card with flag summary.
- **Accept:** from the black screen to the end card, flags are visible in the debug panel.

### C9: Polish (P1/P2)
- Music stems, voice lines (if any), portraits, lightning rod mechanic (P2), extra barks, performance pass, a "Skip to chapter" demo menu.

### Suggested build order if time is tight
C0, C1, C2, C3 in parallel where possible, then C4, C5, C6, C7, then C8. If you run out of time, cut in this order: lightning rod, voice lines, portraits, Phase 3 crush, then shorten S5.

---

## 8. Assets needed (additions)

| Asset | Source | Notes |
|---|---|---|
| Kraken tentacle (skinned) | Blender (make it yourself), or a CC0/CC-BY base mesh from Sketchfab or Poly Pizza | 12 bones, tapered, emissive suckers |
| 5 NPC characters | Quaternius (CC0) with material swaps, Mixamo for animation | Hat, coat, hair color per character |
| Rowboat | Kenney or Quaternius | Ismene's escape |
| Island beach props | Kenney Nature Kit (CC0), Quaternius | Palms, rocks, driftwood, campfire |
| Rain / fog / lightning | Babylon particles and a custom lightning shader | No assets needed |
| Storm skybox | Poly Haven HDRI (overcast/stormy) | Darken it in the shader |
| Audio | Freesound, Sonniss, Kenney | Thunder, rain, wave crash, rope, tentacle groan, wood creaks, heartbeat |
| Music | Incompetech, OpenGameArt, or a short AI-generated score you have rights to | 4 stems, loopable |
| UI | Custom CSS or Babylon GUI | Subtitles, choices, objective, letterbox |
| Voice (stretch) | A TTS service you have a license for | Check terms for commercial use |

Add every source and license to `docs/ASSETS.md`.

---

## 9. Prompts for Antigravity

Paste `AGENTS.md` rules first (they still apply). Add this to it:
```md
## Story mode rules
- Story content (beats, dialogue, cutscenes) is JSON under packages/shared/src/content and validated by zod. Do not hardcode story text in code.
- The StoryDirector is server-side and deterministic. Clients never advance the story themselves.
- Cutscene gameplay locks are applied by the server. The camera and visuals are client-only.
- Do not change PvP behavior. Campaign code lives in CampaignRoom and story-specific modules.
```

**C0**
> Implement milestone C0 from docs/CORSAIR_ARENA_STORY_MODE_PLAN.md. Create story types and zod schemas in packages/shared/src/story, a StoryDirector in packages/server that loads chapter1.beats.json, evaluates triggers each tick and runs actions, and a dev-only debug panel on the client to jump beats. Write Vitest tests for trigger evaluation. Do not implement dialogue UI yet.

**C1**
> Implement C1. Build the DialogueUI (barks, blocking dialogue, choices with voting, subtitles) and ObjectiveUI in the client. Dialogue data comes from chapter1.dialogue.json. Choices are sent to the server and stored in StoryFlags. Add a test that a choice sets a flag and a later trigger reads it.

**C2**
> Implement C2. Add weather.ts with stormIntensity affecting Gerstner parameters in waves.ts through one multiplier, deterministic lightning schedule from a seeded RNG, rain, fog, thunder audio, and a RogueWave term. Add the Reduce flashing setting and a warning screen. Add fixtures proving server and client wave heights match with the multiplier and a rogue wave.

**C3**
> Implement C3. Add NPC entities and NpcSystem with ship-local movement, behaviors, and station filling. Add NPC view with swapped materials. Solo play must be fully possible. Humans can displace NPCs at stations.

**C4**
> Implement C4. Build the CutscenePlayer for tracks camera, timescale, anim, dialogue, fx, music, kraken pose. The server only sends cutscene id and start tick and applies the gameplay locks. Add skip by vote. Create two test cutscenes and a Playwright test that checks they start and end.

**C5**
> Implement C5: beats S0 to S5 exactly as in section 3 and the timeline in section 2, using the systems from C0 to C4. Add the three mini-objectives and the island choice vote. Content only in JSON.

**C6**
> Implement C6: the Kraken. Create tentaclePose in shared/kraken.ts, KrakenSystem on the server (state machine, telegraph, slam, sweep, grab with a cuttable grip point, crush), capsule-chain swept hit tests, phases and soft-fail checkpoints, and KrakenView on the client. Add tests for hit detection and the state machine timings.

**C7**
> Implement C7: the Tobin and Ismene death cutscenes triggered by the boss logic, then the S8 Wave using the RogueWave term and the cutscene system, ending in a black screen and a map switch trigger.

**C8**
> Implement C8: the island beach scene, land movement mode, Kael NPC, the four-question dialogue storing flags, and the end card showing flags and stats.

Tip: after each prompt, ask the agent to play-test via the debug panel and report the exact steps it used, then commit.

---

## 10. Risks specific to story mode

| Risk | Mitigation |
|---|---|
| Too much content for the time | Follow the P0/P1/P2 tags. S5 and S9 are the first to shorten |
| Cutscenes desync in multiplayer | Start tick based timelines, and all positions resolved by entity id |
| Kraken animation looks bad | Keep the body hidden, use strong telegraphs, lighting and screen shake to sell it |
| Boss too hard or too easy | Keep HP and timers in constants, add a debug "set tentacle HP" tool |
| Judges can't see the whole story | Add a "Skip to chapter" demo menu and a 5-minute highlight path (S6, S7b, S8, S9) |
| Flashing lights | Warning, reduce-flashing toggle, flash rate limit (6.3) |
| Writing feels flat | Read the dialogue aloud once, trim every line by about 20 percent |
