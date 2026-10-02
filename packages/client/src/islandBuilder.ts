/**
 * Procedural Island and Archipelago Mesh Builder.
 * Builds low-poly stylized islands with sandy beaches, limestone cliffs,
 * inland grass plateaus, tropical palm trees, watchtowers, and shoreline foam rings.
 */

import {
    Scene, TransformNode, MeshBuilder, StandardMaterial,
    Color3,
} from "@babylonjs/core";

import { IslandEntity, SeededRng } from "@corsair/shared";

export function buildProceduralIsland(island: IslandEntity, scene: Scene, parent: TransformNode): TransformNode {
    const root = new TransformNode(`island_${island.id}`, scene);
    root.parent = parent;
    root.position.set(island.x, 0, island.z);

    const rng = new SeededRng(island.seed);

    // ── Palette Materials ─────────────────────────────────────────────────────
    const mSand = new StandardMaterial(`mSand_${island.id}`, scene);
    mSand.diffuseColor = new Color3(0.92, 0.82, 0.58); // warm tropical sand
    mSand.specularColor = new Color3(0.1, 0.1, 0.05);

    const mGrass = new StandardMaterial(`mGrass_${island.id}`, scene);
    mGrass.diffuseColor = new Color3(0.24, 0.58, 0.22); // lush jungle green
    mGrass.specularColor = new Color3(0.05, 0.1, 0.05);

    const mRock = new StandardMaterial(`mRock_${island.id}`, scene);
    mRock.diffuseColor = new Color3(0.38, 0.35, 0.32); // rugged limestone/slate
    mRock.specularColor = new Color3(0.12, 0.12, 0.12);

    const mWood = new StandardMaterial(`mWood_${island.id}`, scene);
    mWood.diffuseColor = new Color3(0.35, 0.22, 0.12); // dark timber

    const mStone = new StandardMaterial(`mStone_${island.id}`, scene);
    mStone.diffuseColor = new Color3(0.48, 0.48, 0.50); // castle stone

    const mPalmLeaf = new StandardMaterial(`mPalm_${island.id}`, scene);
    mPalmLeaf.diffuseColor = new Color3(0.18, 0.68, 0.18);
    mPalmLeaf.emissiveColor = new Color3(0.04, 0.12, 0.04);

    const mGold = new StandardMaterial(`mGold_${island.id}`, scene);
    mGold.diffuseColor = new Color3(0.95, 0.82, 0.18);
    mGold.emissiveColor = new Color3(0.45, 0.35, 0.05);

    const R = island.radius;
    const H = island.height;

    // ── 1. Beach Base / Sand Ring ─────────────────────────────────────────────
    // Flattened disc with gentle rise from waterline to +2.5m
    const beach = MeshBuilder.CreateCylinder(`beach_${island.id}`, {
        diameterTop: R * 1.85,
        diameterBottom: R * 2.15,
        height: 2.8,
        tessellation: island.type === "rock_needle" ? 8 : 18,
    }, scene);
    beach.parent = root;
    beach.position.y = 1.0;
    beach.material = (island.type === "rock_needle" || island.type === "crag") ? mRock : mSand;

    // Shoreline shallow water reef / foam ring
    const reef = MeshBuilder.CreateTorus(`reef_${island.id}`, {
        diameter: R * 2.1,
        thickness: 4.5,
        tessellation: 24,
    }, scene);
    reef.parent = root;
    reef.position.y = 0.15;
    const mReef = new StandardMaterial(`mReef_${island.id}`, scene);
    mReef.diffuseColor = new Color3(0.3, 0.85, 0.85); // turquoise coastal shoals
    mReef.alpha = 0.45;
    reef.material = mReef;

    // ── 2. Island Specific Topography ─────────────────────────────────────────
    if (island.type === "fortress") {
        // High central limestone plateau
        const cliff = MeshBuilder.CreateCylinder(`cliff_${island.id}`, {
            diameterTop: R * 1.25,
            diameterBottom: R * 1.55,
            height: H * 0.75,
            tessellation: 12,
        }, scene);
        cliff.parent = root;
        cliff.position.y = (H * 0.75) / 2 + 1.8;
        cliff.material = mRock;

        // Top plateau grass crown
        const crown = MeshBuilder.CreateCylinder(`crown_${island.id}`, {
            diameterTop: R * 1.18,
            diameterBottom: R * 1.25,
            height: 1.2,
            tessellation: 12,
        }, scene);
        crown.parent = root;
        crown.position.y = H * 0.75 + 2.0;
        crown.material = mGrass;

        // Central Stone Fortress Bastion
        const fortressTower = MeshBuilder.CreateCylinder(`fort_${island.id}`, {
            diameter: 24,
            height: 18,
            tessellation: 8,
        }, scene);
        fortressTower.parent = root;
        fortressTower.position.y = H * 0.75 + 11.0;
        fortressTower.material = mStone;

        // 4 Fortress Bastion Turrets
        for (let a = 0; a < 4; a++) {
            const ang = (a / 4) * Math.PI * 2;
            const turret = MeshBuilder.CreateCylinder(`turret_${island.id}_${a}`, {
                diameter: 8,
                height: 14,
                tessellation: 6,
            }, scene);
            turret.parent = root;
            turret.position.set(Math.sin(ang) * 16, H * 0.75 + 9.0, Math.cos(ang) * 16);
            turret.material = mStone;
        }

        // Golden Loot Cache beacon atop the fortress
        const lootChest = MeshBuilder.CreateBox(`chest_${island.id}`, { width: 4.5, height: 3.2, depth: 3.2 }, scene);
        lootChest.parent = root;
        lootChest.position.set(0, H * 0.75 + 21.0, 0);
        lootChest.material = mGold;

        // Wooden Harbor Pier & Watchtowers
        for (let p = 0; p < 2; p++) {
            const pierAngle = (p * Math.PI) + 0.3;
            const pier = MeshBuilder.CreateBox(`pier_${island.id}_${p}`, { width: 5.5, height: 1.5, depth: 32 }, scene);
            pier.parent = root;
            pier.position.set(Math.sin(pierAngle) * (R * 0.95), 1.6, Math.cos(pierAngle) * (R * 0.95));
            pier.rotation.y = pierAngle;
            pier.material = mWood;
        }

    } else if (island.type === "atoll") {
        // Crescent shaped atoll with central lagoon
        const ringSegments = 10;
        for (let seg = 0; seg < ringSegments; seg++) {
            if (seg === 4 || seg === 5) continue; // lagoon channel opening
            const ang = (seg / ringSegments) * Math.PI * 2;
            const segRadius = R * 0.75;
            const ridge = MeshBuilder.CreateCylinder(`ridge_${island.id}_${seg}`, {
                diameterTop: R * 0.35,
                diameterBottom: R * 0.55,
                height: H * 0.55,
                tessellation: 7,
            }, scene);
            ridge.parent = root;
            ridge.position.set(Math.sin(ang) * segRadius, (H * 0.55) / 2 + 1.2, Math.cos(ang) * segRadius);
            ridge.material = mGrass;
        }

        // Add 5-8 palm trees along the atoll ridge
        spawnPalmTrees(root, island, mWood, mPalmLeaf, rng, 7, R * 0.75);

    } else if (island.type === "archipelago_hub") {
        // Massive Pirate Outpost / Trade Hub Island
        // Tier 1 broad coastal shelf with beach & village area
        const shelf = MeshBuilder.CreateCylinder(`shelf_${island.id}`, {
            diameterTop: R * 1.55,
            diameterBottom: R * 1.85,
            height: H * 0.35,
            tessellation: 16,
        }, scene);
        shelf.parent = root;
        shelf.position.y = (H * 0.35) / 2 + 1.2;
        shelf.material = mGrass;

        // Tier 2 high central citadel cliffs
        const citadel = MeshBuilder.CreateCylinder(`citadel_${island.id}`, {
            diameterTop: R * 0.95,
            diameterBottom: R * 1.35,
            height: H * 0.65,
            tessellation: 14,
        }, scene);
        citadel.parent = root;
        citadel.position.y = H * 0.35 + (H * 0.65) / 2 + 1.2;
        citadel.material = mRock;

        // High plateau grass
        const highPlateau = MeshBuilder.CreateCylinder(`highplat_${island.id}`, {
            diameterTop: R * 0.88,
            diameterBottom: R * 0.95,
            height: 1.5,
            tessellation: 14,
        }, scene);
        highPlateau.parent = root;
        highPlateau.position.y = H + 1.5;
        highPlateau.material = mGrass;

        // Pirate Haven Outpost Village: 4-6 wooden shacks / taverns
        for (let b = 0; b < 5; b++) {
            const bAng = (b / 5) * Math.PI * 2 + rng.range(-0.2, 0.2);
            const bDist = R * rng.range(0.45, 0.70);
            const shack = MeshBuilder.CreateBox(`shack_${island.id}_${b}`, { width: 8.5, height: 5.5, depth: 7.0 }, scene);
            shack.parent = root;
            shack.position.set(Math.sin(bAng) * bDist, (H * 0.35) + 3.8, Math.cos(bAng) * bDist);
            shack.rotation.y = bAng + Math.PI / 2;
            shack.material = mWood;

            // Thatched shack roof
            const roof = MeshBuilder.CreateCylinder(`roof_${island.id}_${b}`, {
                diameterTop: 0,
                diameterBottom: 11.5,
                height: 3.5,
                tessellation: 4,
            }, scene);
            roof.parent = shack;
            roof.position.y = 4.2;
            roof.rotation.y = Math.PI / 4;
            roof.material = mGrass;
        }

        // Deep Water Ship Pier / Harbor Dock
        for (let p = 0; p < 3; p++) {
            const pierAngle = (p / 3) * Math.PI * 2 + 0.4;
            const pier = MeshBuilder.CreateBox(`hub_pier_${island.id}_${p}`, { width: 6.5, height: 1.6, depth: 45 }, scene);
            pier.parent = root;
            pier.position.set(Math.sin(pierAngle) * (R * 0.88), 1.6, Math.cos(pierAngle) * (R * 0.88));
            pier.rotation.y = pierAngle;
            pier.material = mWood;
        }

        // Beacon fire lighthouse tower on top of the citadel
        const beaconTower = MeshBuilder.CreateCylinder(`btower_${island.id}`, {
            diameterTop: 6,
            diameterBottom: 10,
            height: 18,
            tessellation: 8,
        }, scene);
        beaconTower.parent = root;
        beaconTower.position.set(0, H + 10.5, 0);
        beaconTower.material = mStone;

        // Glowing golden beacon brazier
        const brazier = MeshBuilder.CreateBox(`brazier_${island.id}`, { width: 4.5, height: 3.0, depth: 4.5 }, scene);
        brazier.parent = beaconTower;
        brazier.position.y = 10.0;
        brazier.material = mGold;

        // Lots of lush palm groves
        spawnPalmTrees(root, island, mWood, mPalmLeaf, rng, 20, R * 0.75);

    } else if (island.type === "tropical") {
        // Multi-tiered jungle island
        const tier1 = MeshBuilder.CreateCylinder(`tier1_${island.id}`, {
            diameterTop: R * 1.35,
            diameterBottom: R * 1.65,
            height: H * 0.45,
            tessellation: 12,
        }, scene);
        tier1.parent = root;
        tier1.position.y = (H * 0.45) / 2 + 1.5;
        tier1.material = mRock;

        const junglePlateau = MeshBuilder.CreateCylinder(`jungle_${island.id}`, {
            diameterTop: R * 1.2,
            diameterBottom: R * 1.35,
            height: H * 0.55,
            tessellation: 10,
        }, scene);
        junglePlateau.parent = root;
        junglePlateau.position.y = H * 0.45 + (H * 0.55) / 2 + 1.5;
        junglePlateau.material = mGrass;

        // Rock peaks / volcanic vents
        const peak = MeshBuilder.CreateCylinder(`peak_${island.id}`, {
            diameterTop: 0,
            diameterBottom: R * 0.65,
            height: H * 0.65,
            tessellation: 6,
        }, scene);

        peak.parent = root;
        peak.position.set(rng.range(-12, 12), H * 1.0 + 2.0, rng.range(-12, 12));
        peak.material = mRock;

        // Cluster of tropical palm trees
        spawnPalmTrees(root, island, mWood, mPalmLeaf, rng, 14, R * 0.65);

        // Pirate shipwreck / wooden watchtower on the shoreline
        const tower = MeshBuilder.CreateBox(`tower_${island.id}`, { width: 4.5, height: 14, depth: 4.5 }, scene);
        tower.parent = root;
        const tAngle = rng.range(0, Math.PI * 2);
        tower.position.set(Math.sin(tAngle) * (R * 0.75), 7.0, Math.cos(tAngle) * (R * 0.75));
        tower.material = mWood;

    } else {
        // Rock needle or jagged sea crag
        const needleCount = island.type === "rock_needle" ? 1 : 3;
        for (let n = 0; n < needleCount; n++) {
            const needle = MeshBuilder.CreateCylinder(`needle_${island.id}_${n}`, {
                diameterTop: rng.range(3, 8),
                diameterBottom: R * 1.4,
                height: H * rng.range(1.0, 1.4),
                tessellation: 5,
            }, scene);
            needle.parent = root;
            const offX = n === 0 ? 0 : rng.range(-10, 10);
            const offZ = n === 0 ? 0 : rng.range(-10, 10);
            needle.position.set(offX, H * 0.6, offZ);
            needle.rotation.x = rng.range(-0.15, 0.15);
            needle.rotation.z = rng.range(-0.15, 0.15);
            needle.material = mRock;
        }
    }

    return root;
}

/**
 * Procedurally spawns low-poly curved tropical palm trees.
 */
function spawnPalmTrees(
    parent: TransformNode,
    island: IslandEntity,
    mTrunk: StandardMaterial,
    mLeaves: StandardMaterial,
    rng: SeededRng,
    count: number,
    placementRadius: number,
): void {
    for (let t = 0; t < count; t++) {
        const treeRoot = new TransformNode(`palm_${island.id}_${t}`, parent.getScene());
        treeRoot.parent = parent;

        const ang = (t / count) * Math.PI * 2 + rng.range(-0.35, 0.35);
        const r = rng.range(placementRadius * 0.3, placementRadius * 0.95);
        const px = Math.sin(ang) * r;
        const pz = Math.cos(ang) * r;
        treeRoot.position.set(px, 3.2, pz);

        // Curved trunk (2 segments)
        const trunkH = rng.range(7.5, 11.5);
        const trunk1 = MeshBuilder.CreateCylinder(`trunk1_${island.id}_${t}`, {
            height: trunkH * 0.55,
            diameterTop: 0.6,
            diameterBottom: 1.1,
            tessellation: 5,
        }, parent.getScene());
        trunk1.parent = treeRoot;
        trunk1.position.y = (trunkH * 0.55) / 2;
        trunk1.rotation.z = rng.range(-0.18, 0.18);
        trunk1.material = mTrunk;

        const trunk2 = MeshBuilder.CreateCylinder(`trunk2_${island.id}_${t}`, {
            height: trunkH * 0.5,
            diameterTop: 0.45,
            diameterBottom: 0.6,
            tessellation: 5,
        }, parent.getScene());
        trunk2.parent = trunk1;
        trunk2.position.y = (trunkH * 0.55) / 2 + (trunkH * 0.5) / 2;
        trunk2.rotation.z = rng.range(-0.15, 0.15);
        trunk2.material = mTrunk;

        // Palm Crown (5 fan fronds)
        const crownNode = new TransformNode(`crownNode_${island.id}_${t}`, parent.getScene());
        crownNode.parent = trunk2;
        crownNode.position.y = (trunkH * 0.5) / 2;

        for (let f = 0; f < 5; f++) {
            const frond = MeshBuilder.CreateBox(`frond_${island.id}_${t}_${f}`, {
                width: 1.2,
                height: 0.15,
                depth: 5.2,
            }, parent.getScene());
            frond.parent = crownNode;
            const fAngle = (f / 5) * Math.PI * 2;
            frond.position.set(Math.sin(fAngle) * 2.2, -0.4, Math.cos(fAngle) * 2.2);
            frond.rotation.y = fAngle;
            frond.rotation.x = 0.45;
            frond.material = mLeaves;
        }
    }
}
