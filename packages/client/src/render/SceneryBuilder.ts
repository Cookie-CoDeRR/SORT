import {
    Scene,
    MeshBuilder,
    StandardMaterial,
    Color3,
    TransformNode
} from "@babylonjs/core";
import { ChapterLevel, Landmark } from "@corsair/shared";

/**
 * Procedural scenery builder for Chapter 1 driven entirely by chapter1.level.json.
 */
export class SceneryBuilder {
    private scene: Scene;
    private rootNode: TransformNode;
    private level: ChapterLevel;
    public lanternLightNode?: TransformNode;

    constructor(scene: Scene, level: ChapterLevel) {
        this.scene = scene;
        this.level = level;
        this.rootNode = new TransformNode("chapter1_scenery_root", scene);
    }

    public buildAll() {
        for (const lm of this.level.landmarks) {
            this.buildLandmark(lm);
        }
        this.buildLanternTowerLight();
    }

    private buildLandmark(lm: Landmark) {
        const matRock = new StandardMaterial(`mat_rock_${lm.id}`, this.scene);
        matRock.diffuseColor = new Color3(0.08, 0.10, 0.14);
        matRock.specularColor = new Color3(0.3, 0.35, 0.4);

        if (lm.id === "wreck_field" && lm.pos) {
            // Permanent ambient wreckage field
            const woodMat = new StandardMaterial("mat_wreck_wood", this.scene);
            woodMat.diffuseColor = new Color3(0.24, 0.16, 0.10); // dark waterlogged oak

            const barrelMat = new StandardMaterial("mat_wreck_barrel", this.scene);
            barrelMat.diffuseColor = new Color3(0.40, 0.25, 0.12);

            const wreckPiles = [
                { x: -1020, z: -930, angle: 0.35 },
                { x: -1070, z: -980, angle: -0.7 },
                { x: -990, z: -1010, angle: 1.2 }
            ];

            wreckPiles.forEach((p, idx) => {
                // Half-submerged broken hull
                const hull = MeshBuilder.CreateBox(`wreck_hull_${idx}`, { width: 14, height: 6, depth: 24 }, this.scene);
                hull.position.set(p.x, -0.5, p.z);
                hull.rotation.y = p.angle;
                hull.rotation.z = 0.25; // tilted/capsized
                hull.material = woodMat;
                hull.parent = this.rootNode;

                // Broken mast sticking out of water
                const mast = MeshBuilder.CreateCylinder(`wreck_mast_${idx}`, { height: 18, diameter: 1.2 }, this.scene);
                mast.position.set(p.x + 3, 4, p.z - 2);
                mast.rotation.z = -0.45;
                mast.rotation.x = 0.2;
                mast.material = woodMat;
                mast.parent = this.rootNode;

                // Floating debris barrels
                for (let b = 0; b < 4; b++) {
                    const barrel = MeshBuilder.CreateCylinder(`wreck_bar_${idx}_${b}`, { height: 2.2, diameter: 1.6 }, this.scene);
                    const bx = p.x + (b % 2 === 0 ? 8 : -8) + (b * 2.5);
                    const bz = p.z + (b > 1 ? 7 : -7);
                    barrel.position.set(bx, 0.2, bz);
                    barrel.rotation.z = Math.PI / 2;
                    barrel.material = barrelMat;
                    barrel.parent = this.rootNode;
                }
            });
        } else if (lm.id === "broken_tooth" && lm.pos) {
            // Lone sea stack (height 60m)
            const stack = MeshBuilder.CreateCylinder("stack_broken_tooth", {
                height: lm.height || 60,
                diameterTop: 12,
                diameterBottom: (lm.radius || 40) * 1.5,
                tessellation: 12
            }, this.scene);
            stack.position.set(lm.pos[0], (lm.height || 60) / 2 - 4, lm.pos[1]);
            stack.material = matRock;
            stack.parent = this.rootNode;

            // Foam ring at waterline
            const foamMat = new StandardMaterial("foam_ring_mat", this.scene);
            foamMat.diffuseColor = new Color3(0.9, 0.95, 1.0);
            foamMat.alpha = 0.55;
            const foam = MeshBuilder.CreateTorus("foam_broken_tooth", {
                diameter: (lm.radius || 40) * 1.8,
                thickness: 3.5,
                tessellation: 18
            }, this.scene);
            foam.position.set(lm.pos[0], 0.2, lm.pos[1]);
            foam.material = foamMat;
            foam.parent = this.rootNode;
        } else if (lm.id === "gravebell_shoal" && lm.pos) {
            // Low reef + bell buoy
            const reef = MeshBuilder.CreateCylinder("reef_gravebell", {
                height: 4,
                diameterTop: (lm.radius || 80) * 1.8,
                diameterBottom: (lm.radius || 80) * 2.0,
                tessellation: 16
            }, this.scene);
            reef.position.set(lm.pos[0], 0.5, lm.pos[1]);
            reef.material = matRock;
            reef.parent = this.rootNode;

            // Bell buoy cone
            const buoyMat = new StandardMaterial("buoy_mat", this.scene);
            buoyMat.diffuseColor = new Color3(0.65, 0.2, 0.15); // rusted red iron
            const buoy = MeshBuilder.CreateCylinder("bell_buoy", {
                height: 6,
                diameterTop: 0.8,
                diameterBottom: 4.5,
                tessellation: 8
            }, this.scene);
            buoy.position.set(lm.pos[0], 3.0, lm.pos[1]);
            buoy.material = buoyMat;
            buoy.parent = this.rootNode;
        } else if (lm.id === "needle_rocks" && lm.pos) {
            // 7 black needle rock spires scattered within radius
            const count = 7;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2 + (i % 2) * 0.4;
                const dist = 25 + (i * 14) % (lm.radius || 120);
                const nx = lm.pos[0] + Math.cos(angle) * dist;
                const nz = lm.pos[1] + Math.sin(angle) * dist;
                const h = 25 + (i % 3) * 12;

                const needle = MeshBuilder.CreateCylinder(`needle_${i}`, {
                    height: h,
                    diameterTop: 2,
                    diameterBottom: 14 + (i % 3) * 4,
                    tessellation: 7
                }, this.scene);
                needle.position.set(nx, h / 2 - 3, nz);
                needle.material = matRock;
                needle.parent = this.rootNode;
            }
        } else if ((lm.id === "twin_sister_a" || lm.id === "twin_sister_b") && lm.pos) {
            // Twin sister gate pillars
            const h = lm.height || 30;
            const pillar = MeshBuilder.CreateCylinder(`pillar_${lm.id}`, {
                height: h,
                diameterTop: 8,
                diameterBottom: (lm.radius || 45) * 1.3,
                tessellation: 10
            }, this.scene);
            pillar.position.set(lm.pos[0], h / 2 - 4, lm.pos[1]);
            pillar.material = matRock;
            pillar.parent = this.rootNode;
        } else if (lm.id === "maw_teeth" && lm.center && lm.ringRadius && lm.count) {
            // 10 inward-leaning jagged teeth encircling the Kraken Maw Basin
            const count = lm.count;
            const stepDeg = 360 / count;

            for (let i = 0; i < count; i++) {
                const deg = i * stepDeg;
                let diff = Math.abs(deg - (lm.gapCenterDeg || 225));
                if (diff > 180) diff = 360 - diff;
                if (diff <= (lm.gapHalfWidthDeg || 28)) {
                    continue; // Entrance gap!
                }

                const rad = (deg * Math.PI) / 180;
                const tx = lm.center[0] + Math.sin(rad) * lm.ringRadius;
                const tz = lm.center[1] + Math.cos(rad) * lm.ringRadius;
                const th = lm.height || 45;

                const tooth = MeshBuilder.CreateCylinder(`tooth_${i}`, {
                    height: th,
                    diameterTop: 4,
                    diameterBottom: 26,
                    tessellation: 8
                }, this.scene);
                tooth.position.set(tx, th / 2 - 4, tz);

                // Lean slightly inward toward basin center
                const inwardAngle = Math.atan2(lm.center[0] - tx, lm.center[1] - tz);
                tooth.rotation.y = inwardAngle;
                tooth.rotation.x = 0.16; // inward lean

                tooth.material = matRock;
                tooth.parent = this.rootNode;
            }
        } else if (lm.id === "maw_basin" && lm.pos) {
            // Bioluminescent water ring inside basin
            const bioMat = new StandardMaterial("bio_basin_mat", this.scene);
            bioMat.diffuseColor = new Color3(0.05, 0.35, 0.45);
            bioMat.emissiveColor = new Color3(0.04, 0.22, 0.28);
            bioMat.alpha = 0.65;

            const basinGlow = MeshBuilder.CreateDisc("basin_glow", {
                radius: lm.radius || 160,
                tessellation: 36
            }, this.scene);
            basinGlow.rotation.x = Math.PI / 2;
            basinGlow.position.set(lm.pos[0], 0.1, lm.pos[1]);
            basinGlow.material = bioMat;
            basinGlow.parent = this.rootNode;
        } else if (lm.id === "lantern_isle" && lm.pos) {
            // Hero island hill (radius 260m, height 90m)
            const isleMat = new StandardMaterial("isle_mat", this.scene);
            isleMat.diffuseColor = new Color3(0.06, 0.12, 0.08); // dark pine green
            isleMat.specularColor = new Color3(0.1, 0.1, 0.1);

            const hill = MeshBuilder.CreateSphere("lantern_isle_hill", {
                diameterX: (lm.radius || 260) * 2,
                diameterY: (lm.height || 90) * 2,
                diameterZ: (lm.radius || 260) * 2,
                segments: 24
            }, this.scene);
            hill.position.set(lm.pos[0], -((lm.height || 90) - 8), lm.pos[1]);
            hill.material = isleMat;
            hill.parent = this.rootNode;

            // Ruined Stone Tower at (940, 1340)
            const towerMat = new StandardMaterial("tower_mat", this.scene);
            towerMat.diffuseColor = new Color3(0.2, 0.22, 0.25);
            const tower = MeshBuilder.CreateCylinder("ruined_tower", {
                height: 40,
                diameterTop: 16,
                diameterBottom: 22,
                tessellation: 12
            }, this.scene);
            tower.position.set(940, 78, 1340);
            tower.material = towerMat;
            tower.parent = this.rootNode;
        }
    }

    private buildLanternTowerLight() {
        const lightDef = this.level.lights.find(l => l.id === "island_lantern");
        if (!lightDef) return;

        const lightNode = new TransformNode("island_lantern_node", this.scene);
        lightNode.position.set(lightDef.pos[0], lightDef.height, lightDef.pos[1]);
        lightNode.parent = this.rootNode;

        const glowMat = new StandardMaterial("lantern_flame_mat", this.scene);
        glowMat.emissiveColor = new Color3(1.0, 0.7, 0.25); // amber flame
        glowMat.diffuseColor = new Color3(1.0, 0.7, 0.25);

        const flameMesh = MeshBuilder.CreateSphere("lantern_flame", { diameter: 7 }, this.scene);
        flameMesh.position.set(0, 0, 0);
        flameMesh.material = glowMat;
        flameMesh.parent = lightNode;

        this.lanternLightNode = lightNode;
    }
}
