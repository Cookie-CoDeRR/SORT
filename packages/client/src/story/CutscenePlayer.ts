import {
    Vector3,
    Scene,
    TargetCamera,
    TransformNode
} from "@babylonjs/core";
import { CutsceneTimeline, CutsceneCameraKey } from "@corsair/shared";
import { CinematicLetterbox } from "./Letterbox.js";

export class CutscenePlayer {
    private scene: Scene;
    private camera: TargetCamera;
    private originalCameraPos: Vector3 = Vector3.Zero();
    private originalCameraTarget: Vector3 = Vector3.Zero();
    private activeCutscene: CutsceneTimeline | null = null;
    private cutsceneElapsed: number = 0;
    private isPlaying: boolean = false;
    private parentShipNode: TransformNode | null = null;
    private letterbox: CinematicLetterbox;
    private triggeredFx: Set<string> = new Set();

    public onCutsceneFinished?: (id: string) => void;
    public onDialogueTrigger?: (lineId: string) => void;

    private originalParent: import("@babylonjs/core").Node | null = null;

    constructor(scene: Scene, camera: TargetCamera) {
        this.scene = scene;
        this.camera = camera;
        this.letterbox = new CinematicLetterbox();
    }

    public setShipNode(node: TransformNode) {
        this.parentShipNode = node;
    }

    public play(cutscene: CutsceneTimeline) {
        this.activeCutscene = cutscene;
        this.cutsceneElapsed = 0;
        this.isPlaying = true;
        this.triggeredFx.clear();
        this.originalCameraPos = this.camera.position.clone();
        this.originalCameraTarget = this.camera.getTarget().clone();
        this.originalParent = this.camera.parent;

        // Unparent camera so cutscene world/ship coordinates apply directly without playerNode doubling
        this.camera.parent = null;

        // Enter 21:9 cinematic movie bars
        this.letterbox.enterCinematic("76px");
    }

    public update(dt: number) {
        if (!this.isPlaying || !this.activeCutscene) return;

        this.cutsceneElapsed += dt;

        // Process tracks (camera, fx, impact frames)
        for (const track of this.activeCutscene.tracks) {
            if (track.type === "camera") {
                this.evaluateCameraTrack(track.keys, this.cutsceneElapsed);
            } else if (track.type === "fx") {
                const key = `${track.name}_${track.t}`;
                if (this.cutsceneElapsed >= track.t && !this.triggeredFx.has(key)) {
                    this.triggeredFx.add(key);
                    if (track.name === "impact_frame") {
                        this.letterbox.triggerImpactFrame(2);
                    }
                }
            }
        }

        if (this.cutsceneElapsed >= this.activeCutscene.duration) {
            const finishedId = this.activeCutscene.id;
            this.stop();
            if (this.onCutsceneFinished) {
                this.onCutsceneFinished(finishedId);
            }
        }
    }

    private evaluateCameraTrack(keys: CutsceneCameraKey[], time: number) {
        if (keys.length === 0) return;

        // Find current segment
        let keyA = keys[0];
        let keyB = keys[keys.length - 1];

        for (let i = 0; i < keys.length - 1; i++) {
            if (time >= keys[i].t && time <= keys[i + 1].t) {
                keyA = keys[i];
                keyB = keys[i + 1];
                break;
            }
        }

        let fraction = 0;
        if (keyB.t > keyA.t) {
            fraction = Math.max(0, Math.min(1, (time - keyA.t) / (keyB.t - keyA.t)));
        }

        // Apply smooth ease if requested
        if (keyB.ease === "inOut" || keyB.ease === "smooth") {
            fraction = fraction * fraction * (3 - 2 * fraction); // smoothstep
        }

        const localPosA = new Vector3(keyA.pos[0], keyA.pos[1], keyA.pos[2]);
        const localPosB = new Vector3(keyB.pos[0], keyB.pos[1], keyB.pos[2]);
        const interpolatedPos = Vector3.Lerp(localPosA, localPosB, fraction);

        // If anchored to ship, transform local coordinate to world
        if (this.parentShipNode) {
            const worldPos = Vector3.TransformCoordinates(interpolatedPos, this.parentShipNode.getWorldMatrix());
            this.camera.position.copyFrom(worldPos);

            if (Array.isArray(keyA.look) && Array.isArray(keyB.look)) {
                const lookA = new Vector3(keyA.look[0], keyA.look[1], keyA.look[2]);
                const lookB = new Vector3(keyB.look[0], keyB.look[1], keyB.look[2]);
                const interpolatedLook = Vector3.Lerp(lookA, lookB, fraction);
                const worldLook = Vector3.TransformCoordinates(interpolatedLook, this.parentShipNode.getWorldMatrix());
                this.camera.setTarget(worldLook);
            }
        } else {
            this.camera.position.copyFrom(interpolatedPos);
        }
    }

    public stop() {
        this.isPlaying = false;
        this.activeCutscene = null;
        this.letterbox.exitCinematic();

        // Restore camera parent
        if (this.originalParent) {
            this.camera.parent = this.originalParent;
            this.camera.position.set(0, 0, 0);
            this.originalParent = null;
        }
    }

    public get active(): boolean {
        return this.isPlaying;
    }

    public getLetterbox(): CinematicLetterbox {
        return this.letterbox;
    }
}
