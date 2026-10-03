import {
    Scene,
    Vector3,
    MeshBuilder,
    StandardMaterial,
    Color3,
    TransformNode,
    Mesh
} from "@babylonjs/core";
import {
    KrakenBossState,
    calculateTentaclePose,
    TENTACLE_SEGMENT_COUNT
} from "@corsair/shared";

export class KrakenView {
    private scene: Scene;
    private rootNode: TransformNode;
    private tentacleMeshes: Map<number, {
        segments: Mesh[];
        suckers: Mesh[];
        glowMaterials: StandardMaterial[];
    }> = new Map();

    private skinMat: StandardMaterial;
    private underbellyMat: StandardMaterial;

    constructor(scene: Scene) {
        this.scene = scene;
        this.rootNode = new TransformNode("kraken_root", scene);

        // Dark abyssal kraken skin material (deep slate-indigo with slimy specular highlight)
        this.skinMat = new StandardMaterial("kraken_skin", scene);
        this.skinMat.diffuseColor = new Color3(0.08, 0.12, 0.18);
        this.skinMat.specularColor = new Color3(0.4, 0.6, 0.7);
        this.skinMat.roughness = 0.3;

        // Pale bioluminescent sucker flesh
        this.underbellyMat = new StandardMaterial("kraken_underbelly", scene);
        this.underbellyMat.diffuseColor = new Color3(0.75, 0.25, 0.35);
        this.underbellyMat.emissiveColor = new Color3(0.2, 0.05, 0.08);
    }

    public update(boss: KrakenBossState, shipPos: { x: number; y: number; z: number }, time: number) {
        if (!boss.active) {
            this.rootNode.setEnabled(false);
            return;
        }
        this.rootNode.setEnabled(true);

        for (const tentacle of boss.tentacles) {
            let tentacleData = this.tentacleMeshes.get(tentacle.id);
            if (!tentacleData) {
                tentacleData = this.createTentacleMesh(tentacle.id);
                this.tentacleMeshes.set(tentacle.id, tentacleData);
            }

            if (tentacle.state === "SUBMERGED") {
                for (const seg of tentacleData.segments) seg.setEnabled(false);
                for (const sk of tentacleData.suckers) sk.setEnabled(false);
                continue;
            }

            // Calculate animated mathematical IK joints
            const poses = calculateTentaclePose(tentacle, shipPos, time);

            for (let i = 0; i < TENTACLE_SEGMENT_COUNT; i++) {
                const p = poses[i];
                const segMesh = tentacleData.segments[i];
                segMesh.setEnabled(true);
                segMesh.position.set(p.x, p.y, p.z);

                // Orient segment along the spine toward the next segment
                if (i < TENTACLE_SEGMENT_COUNT - 1) {
                    const nextP = poses[i + 1];
                    segMesh.lookAt(new Vector3(nextP.x, nextP.y, nextP.z));
                }

                // Sucker joint placement & glowing weak point feedback
                const suckerMesh = tentacleData.suckers[i];
                if (suckerMesh) {
                    suckerMesh.setEnabled(true);
                    suckerMesh.position.set(p.x, p.y, p.z);

                    const glow = tentacleData.glowMaterials[i];
                    if (glow) {
                        if (p.isWeakPoint) {
                            // Pulsing bright molten amber weak point (Sea of Thieves style)
                            const pulse = 0.5 + 0.5 * Math.sin(time * 6.0 + i);
                            glow.emissiveColor = new Color3(1.0, 0.55 * pulse, 0.1);
                        } else {
                            glow.emissiveColor = new Color3(0.2, 0.05, 0.08);
                        }
                    }
                }
            }
        }
    }

    private createTentacleMesh(id: number) {
        const segments: Mesh[] = [];
        const suckers: Mesh[] = [];
        const glowMaterials: StandardMaterial[] = [];

        // Deep sea barnacle / spine material
        const spineMat = new StandardMaterial(`kraken_spine_${id}`, this.scene);
        spineMat.diffuseColor = new Color3(0.04, 0.06, 0.08);
        spineMat.specularColor = new Color3(0.3, 0.4, 0.5);

        for (let i = 0; i < TENTACLE_SEGMENT_COUNT; i++) {
            const segFrac = i / (TENTACLE_SEGMENT_COUNT - 1);
            // Thick base (r = 2.4m) smoothly tapering to a sharp whip tip (r = 0.45m)
            const rBase = 2.4 * (1.0 - segFrac * 0.82);
            const rTop  = 2.4 * (1.0 - Math.min(1.0, segFrac + 0.1) * 0.82);
            const segHeight = 3.2;

            // Organic, ribbed, fluted cylinder segment that seamlessly overlaps
            const seg = MeshBuilder.CreateCylinder(`tentacle_${id}_seg_${i}`, {
                height: segHeight,
                diameterBottom: rBase * 2.1,
                diameterTop: rTop * 1.9,
                tessellation: 16
            }, this.scene);
            seg.material = this.skinMat;
            seg.parent = this.rootNode;
            segments.push(seg);

            // Dorsal armored spine / ridged ridge along the back of the tentacle
            const spine = MeshBuilder.CreateBox(`spine_${id}_${i}`, {
                width: rBase * 0.35,
                height: segHeight * 0.75,
                depth: rBase * 0.7
            }, this.scene);
            spine.material = spineMat;
            spine.position.z = -rBase * 0.85;
            spine.rotation.x = 0.25;
            spine.parent = seg;

            // Deep organic suction cups with sunken bioluminescent maw
            const glowMat = new StandardMaterial(`sucker_mat_${id}_${i}`, this.scene);
            glowMat.diffuseColor = new Color3(0.65, 0.18, 0.22);
            glowMat.emissiveColor = new Color3(0.18, 0.04, 0.06);
            glowMaterials.push(glowMat);

            const suckerRoot = MeshBuilder.CreateCylinder(`tentacle_${id}_sucker_${i}`, {
                height: rBase * 0.5,
                diameterTop: rBase * 0.85,
                diameterBottom: rBase * 0.55,
                tessellation: 12
            }, this.scene);
            suckerRoot.material = glowMat;
            suckerRoot.position.z = rBase * 0.82;
            suckerRoot.rotation.x = Math.PI / 2;
            suckerRoot.parent = seg;
            suckers.push(suckerRoot);
        }

        return { segments, suckers, glowMaterials };
    }

    public destroy() {
        this.rootNode.dispose();
        this.tentacleMeshes.clear();
    }
}
