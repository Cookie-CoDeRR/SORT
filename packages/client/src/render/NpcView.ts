import {
    Scene,
    Vector3,
    MeshBuilder,
    StandardMaterial,
    Color3,
    TransformNode,
    Mesh
} from "@babylonjs/core";
import { NpcState, NpcId } from "@corsair/shared";

interface NpcMeshEntry {
    root: TransformNode;
    body: Mesh;
    head: Mesh;
    leftArm: Mesh;
    rightArm: Mesh;
    hatOrItem?: Mesh;
}

export class NpcView {
    private scene: Scene;
    private parentShipNode: TransformNode;
    private npcMeshes: Map<NpcId, NpcMeshEntry> = new Map();

    constructor(scene: Scene, parentShipNode: TransformNode) {
        this.scene = scene;
        this.parentShipNode = parentShipNode;
    }

    public updateCrew(crew: Record<NpcId, NpcState>, time: number = 0) {
        for (const [id, state] of Object.entries(crew) as [NpcId, NpcState][]) {
            if (!state.isAlive) {
                const existing = this.npcMeshes.get(id);
                if (existing) {
                    existing.root.setEnabled(false);
                }
                continue;
            }

            let entry = this.npcMeshes.get(id);
            if (!entry) {
                entry = this.createNpcMesh(id);
                this.npcMeshes.set(id, entry);
            }

            entry.root.setEnabled(true);

            // Update local coordinates relative to the ship deck
            entry.root.position = new Vector3(state.localPos.x, state.localPos.y, state.localPos.z);

            // Animate limbs based on animState
            const t = state.actionTimer || time;
            if (state.animState === "steering") {
                // Hands grasping wheel or spyglass
                entry.leftArm.rotation.x = -Math.PI / 3 + Math.sin(t * 2) * 0.15;
                entry.rightArm.rotation.x = -Math.PI / 3 - Math.sin(t * 2) * 0.15;
                entry.body.rotation.y = Math.sin(t * 1.5) * 0.1;
                entry.root.rotation.y = (id === "ismene") ? -Math.PI / 4 : 0;
            } else if (state.animState === "repairing") {
                // Swabbing deck / hammering rhythm
                const hammerSwing = Math.sin(t * 6);
                entry.rightArm.rotation.x = -Math.PI / 2 + hammerSwing * 0.6;
                entry.leftArm.rotation.x = -Math.PI / 4;
                entry.body.rotation.x = 0.2 + hammerSwing * 0.1;
                entry.body.position.y = 0.65 + Math.abs(hammerSwing) * 0.05;
            } else if (state.animState === "firing") {
                // Recoil back and waving arm forward to fire cannon
                entry.rightArm.rotation.x = -Math.PI / 1.5;
                entry.leftArm.rotation.x = 0.3;
                entry.body.rotation.x = -0.25;
                entry.root.rotation.y = state.station === "cannons_port" ? -Math.PI / 2 : Math.PI / 2;
            } else {
                // Idle breathing and subtle arm sway
                const sway = Math.sin(t * 2.5);
                entry.leftArm.rotation.x = sway * 0.1;
                entry.rightArm.rotation.x = -sway * 0.1;
                entry.body.rotation.x = 0;
                entry.body.rotation.y = 0;
                entry.body.position.y = 0.7 + Math.sin(t * 3) * 0.02;
                entry.root.rotation.y = 0;
            }
        }
    }

    private createNpcMesh(id: NpcId): NpcMeshEntry {
        const root = new TransformNode(`npc_${id}`, this.scene);
        root.parent = this.parentShipNode;

        // Distinct colors for character silhouette identification
        const mat = new StandardMaterial(`npc_mat_${id}`, this.scene);
        if (id === "vance") {
            mat.diffuseColor = new Color3(0.15, 0.22, 0.45); // Captain Navy Coat
        } else if (id === "tobin") {
            mat.diffuseColor = new Color3(0.55, 0.22, 0.15); // Veteran Reddish Leather
        } else if (id === "pip") {
            mat.diffuseColor = new Color3(0.85, 0.75, 0.45); // Cabin hand canvas
        } else {
            mat.diffuseColor = new Color3(0.25, 0.45, 0.35); // Navigator Forest Coat
        }

        // Stylized character torso
        const body = MeshBuilder.CreateCylinder(`npc_body_${id}`, {
            height: 1.4,
            diameterTop: 0.65,
            diameterBottom: 0.55
        }, this.scene);
        body.position.y = 0.7;
        body.material = mat;
        body.parent = root;

        // Head
        const headMat = new StandardMaterial(`npc_head_mat_${id}`, this.scene);
        headMat.diffuseColor = new Color3(0.9, 0.75, 0.65);
        const head = MeshBuilder.CreateSphere(`npc_head_${id}`, { diameter: 0.45 }, this.scene);
        head.position.y = 1.6;
        head.material = headMat;
        head.parent = root;

        // Arms (for realistic lively animations like swabbing, steering, firing)
        const armMat = mat;
        const leftArm = MeshBuilder.CreateBox(`npc_la_${id}`, { width: 0.18, height: 0.75, depth: 0.18 }, this.scene);
        leftArm.parent = root;
        leftArm.position.set(-0.42, 1.0, 0);
        leftArm.setPivotPoint(new Vector3(0, 0.35, 0));
        leftArm.material = armMat;

        const rightArm = MeshBuilder.CreateBox(`npc_ra_${id}`, { width: 0.18, height: 0.75, depth: 0.18 }, this.scene);
        rightArm.parent = root;
        rightArm.position.set(0.42, 1.0, 0);
        rightArm.setPivotPoint(new Vector3(0, 0.35, 0));
        rightArm.material = armMat;

        // Captain Vance gets a tricorn pirate hat
        let hatOrItem: Mesh | undefined;
        if (id === "vance") {
            const hatMat = new StandardMaterial("vance_hat_mat", this.scene);
            hatMat.diffuseColor = new Color3(0.08, 0.08, 0.12);
            hatOrItem = MeshBuilder.CreateCylinder(`vance_hat`, { height: 0.22, diameterTop: 0.75, diameterBottom: 0.55 }, this.scene);
            hatOrItem.parent = head;
            hatOrItem.position.y = 0.25;
            hatOrItem.material = hatMat;
        }

        return { root, body, head, leftArm, rightArm, hatOrItem };
    }

    public destroy() {
        for (const entry of this.npcMeshes.values()) {
            entry.root.dispose();
        }
        this.npcMeshes.clear();
    }
}
