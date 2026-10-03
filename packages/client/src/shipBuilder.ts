/**
 * Procedural ship builder for Corsair Arena.
 * Majestic 36m x 11m Pirate Galleon Warship.
 *
 * Ship-local coordinate convention (before heading rotation):
 *   +Z = bow, -Z = stern, +X = starboard, -X = port, +Y = up
 *
 * Deck heights (local Y from ship origin = waterline centre):
 *   MAIN_DECK_Y  = 4.0   — mid-ship gun deck (cannons + ammo depot)
 *   POOP_DECK_Y  = 6.8   — stern raised quarterdeck (helm & stern castle)
 *   FORE_DECK_Y  = 6.2   — bow forecastle deck (bell & anchors)
 */

import {
    Scene, TransformNode, MeshBuilder, StandardMaterial,
    Color3, Mesh,
} from "@babylonjs/core";
import {
    CANNON_COUNT_PER_SIDE,
    CANNON_COUNT_BOW,
    CANNON_COUNT_STERN,
    cannonLocalPos,
} from "@corsair/shared";

export const MAIN_DECK_Y   = 4.0;
export const POOP_DECK_Y   = 6.8;
export const FORE_DECK_Y   = 6.2;
export const POOP_ZONE_Z   = -6.5;
export const FORE_ZONE_Z   =  7.5;
// Re-export so main.ts only needs to import from shipBuilder
export { CANNON_LOCAL_X } from "@corsair/shared";

/**
 * Returns the expected eye-level deck Y for a given local Z.
 * Includes smooth slope interpolation along companionway and forecastle stairs.
 */
export function getDeckY(localZ: number): number {
    if (localZ < POOP_ZONE_Z) return POOP_DECK_Y;
    if (localZ >= -6.5 && localZ <= -3.5) {
        // Smooth companionway stair ramp between main deck and poop deck
        const t = (-localZ - 3.5) / 3.0;
        return MAIN_DECK_Y + t * (POOP_DECK_Y - MAIN_DECK_Y);
    }
    if (localZ > FORE_ZONE_Z) return FORE_DECK_Y;
    if (localZ >= 5.2 && localZ <= 7.5) {
        // Smooth forecastle stair ramp between main deck and forecastle deck
        const t = (localZ - 5.2) / 2.3;
        return MAIN_DECK_Y + t * (FORE_DECK_Y - MAIN_DECK_Y);
    }
    return MAIN_DECK_Y;
}

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface CannonHandle {
    side: "L" | "R" | "F" | "B";
    index: number;
    mount: TransformNode;        // Yaw pivot (turns with mouse/aim)
    barrelPivot: TransformNode;  // Pitch pivot (elevates with mouse/aim)
    barrel: Mesh;                // Recoils along local axis
    carriage: Mesh;              // Carriage chassis
    muzzleTip: TransformNode;    // Exact world coordinate tip for trajectory & projectiles
    recoilZ: number;
}

export interface ShipHandles {
    root: TransformNode;
    steeringWheel: TransformNode;    // spinning part — animate .rotation.z
    rudder: TransformNode;           // rudder blade at stern — rotates with helm
    pirateFlag: Mesh;                // pirate flag atop main mast
    cannons: CannonHandle[];
    ammoBarrel: Mesh;                // central ammo barrel — glow when near
    plankBarrel: Mesh;               // carpenter's plank barrel — glow when near
    foodBarrel: Mesh;                // provisions / food barrel — glow when near
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create a StandardMaterial with diffuse + ambient emissive so it's always visible. */
function mat(name: string, scene: Scene,
    dr: number, dg: number, db: number,
    emScale = 0.22,
): StandardMaterial {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor  = new Color3(dr, dg, db);
    m.emissiveColor = new Color3(dr * emScale, dg * emScale, db * emScale);
    return m;
}

function box(name: string, w: number, h: number, d: number, scene: Scene): Mesh {
    return MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
}

// ─── Builder ─────────────────────────────────────────────────────────────────
export function buildProceduralShip(
    scene: Scene,
    parent: TransformNode,
    theme: "player" | "enemy" = "player",
): ShipHandles {
    const isEnemy = theme === "enemy";
    const pfx = isEnemy ? "enemy_" : "";
    const root = new TransformNode(`${pfx}shipRoot`, scene);
    root.parent = parent;

    // ── Palette ───────────────────────────────────────────────────────────────
    const mHullDark    = mat(`${pfx}hullDark`, scene, isEnemy ? 0.12 : 0.28, isEnemy ? 0.09 : 0.13, isEnemy ? 0.08 : 0.05); // heavy oak hull frame
    const mHullMid     = mat(`${pfx}hullMid`,  scene, isEnemy ? 0.22 : 0.48, isEnemy ? 0.16 : 0.24, isEnemy ? 0.14 : 0.09); // mahogany planked walls & bulkheads
    const mDeck        = mat(`${pfx}deck`,     scene, isEnemy ? 0.45 : 0.70, isEnemy ? 0.38 : 0.48, isEnemy ? 0.30 : 0.22, 0.25); // light teak deck planks
    const mMast        = mat(`${pfx}mast`,     scene, isEnemy ? 0.25 : 0.60, isEnemy ? 0.18 : 0.40, isEnemy ? 0.12 : 0.18, 0.25); // pine spars & yards
    const mSail        = mat(`${pfx}sail`,     scene, isEnemy ? 0.68 : 0.94, isEnemy ? 0.12 : 0.90, isEnemy ? 0.10 : 0.76, isEnemy ? 0.40 : 0.35); // billowing canvas / corsair crimson
    const mCannon      = mat(`${pfx}cannon`,   scene, 0.20, 0.20, 0.22, 0.10); // dark cast iron
    const mCarriage    = mat(`${pfx}carriage`, scene, isEnemy ? 0.22 : 0.34, isEnemy ? 0.12 : 0.18, isEnemy ? 0.06 : 0.07); // weathered wood carriage
    const mWheel       = mat(`${pfx}wheel`,    scene, 0.50, 0.32, 0.12, 0.28); // polished walnut
    const mWheelRim    = mat(`${pfx}wheelRim`, scene, isEnemy ? 0.85 : 0.74, isEnemy ? 0.45 : 0.56, isEnemy ? 0.15 : 0.20, 0.30); // brass fittings & rings
    const mRope        = mat(`${pfx}rope`,     scene, 0.58, 0.50, 0.33, 0.18); // hemp cordage
    const mWindow      = mat(`${pfx}win`,      scene, isEnemy ? 0.75 : 0.32, isEnemy ? 0.20 : 0.46, isEnemy ? 0.20 : 0.68, 0.32); // ruby red stern cabin windows for enemy!
    const mStripe      = mat(`${pfx}stripe`,   scene, isEnemy ? 0.90 : 0.78, isEnemy ? 0.72 : 0.18, isEnemy ? 0.15 : 0.05); // golden waterline stripe
    const mAmmoBarrel  = mat(`${pfx}ammoBar`,  scene, 0.30, 0.20, 0.08, 0.25); // oak storage barrel
    const mIron        = mat(`${pfx}iron`,     scene, 0.16, 0.16, 0.18, 0.12); // black forged iron
    const mLanternGlow = mat(`${pfx}lGlow`,    scene, 1.00, isEnemy ? 0.25 : 0.82, isEnemy ? 0.10 : 0.30, 0.90); // blood-red lantern glow for enemy!
    const mGoldTrim    = mat(`${pfx}goldTrim`, scene, 0.88, 0.70, 0.22, 0.38); // gilded carvings & filigree
    const mFlag        = mat(`${pfx}flagMat`,  scene, isEnemy ? 0.70 : 0.10, isEnemy ? 0.08 : 0.10, isEnemy ? 0.08 : 0.12, isEnemy ? 0.25 : 0.18); // pirate flag black / war red

    function child(mesh: Mesh, m: StandardMaterial): Mesh {
        mesh.parent = root;
        mesh.material = m;
        return mesh;
    }

    // ── Lower Hull (36m x 11m Galleon) ─────────────────────────────────────────
    const hullLower = child(box("hullLower", 10.4, 5.0, 34, scene), mHullDark);
    hullLower.position.set(0, 1.2, 0);

    // Keel bar
    const keel = child(box("keel", 0.7, 1.2, 35.5, scene), mHullDark);
    keel.position.set(0, -1.6, 0);

    // Waterline stripe on both sides
    for (const sx of [-1, 1]) {
        const stripe = child(box(`stripe${sx}`, 0.14, 1.3, 34, scene), mStripe);
        stripe.position.set(sx * 5.28, 1.2, 0);
    }

    // Bow cutwater taper blocks
    for (const sx of [-1, 1]) {
        const bow = child(box(`bow${sx}`, 3.2, 5.5, 6.5, scene), mHullDark);
        bow.position.set(sx * 3.8, 1.2, 17.0);
        bow.rotation.y = -sx * 0.48;
    }

    // Prow stem knee
    const stemKnee = child(box("stemKnee", 0.8, 6.0, 3.2, scene), mHullDark);
    stemKnee.position.set(0, 3.2, 18.5);

    // Bowsprit spar
    const bowsprit = MeshBuilder.CreateCylinder("bowsprit",
        { height: 11.5, diameter: 0.45, tessellation: 8 }, scene);
    bowsprit.parent = root;
    bowsprit.material = mMast;
    bowsprit.rotation.x = Math.PI / 5.0;
    bowsprit.position.set(0, 6.8, 20.5);

    // Bowsprit cap & jibboom tip
    const jibboom = MeshBuilder.CreateCylinder("jibboom",
        { height: 5.5, diameter: 0.28, tessellation: 8 }, scene);
    jibboom.parent = bowsprit;
    jibboom.material = mMast;
    jibboom.position.set(0, 7.5, 0);

    // Martingale dolphin striker pointing down from bowsprit
    const dolphinStriker = MeshBuilder.CreateCylinder("dolphinStriker",
        { height: 2.8, diameter: 0.16, tessellation: 8 }, scene);
    dolphinStriker.parent = bowsprit;
    dolphinStriker.material = mHullMid;
    dolphinStriker.rotation.z = Math.PI / 2;
    dolphinStriker.position.set(0, 1.8, -0.6);

    // ── Stern Transom & Rudder ────────────────────────────────────────────────
    const sternLower = child(box("sternLower", 10.2, 5.8, 2.2, scene), mHullMid);
    sternLower.position.set(0, 1.5, -17.2);

    // Rudder Blade at Stern
    const rudderPivot = new TransformNode("rudderPivot", scene);
    rudderPivot.parent = root;
    rudderPivot.position.set(0, 1.2, -17.8);
    const rudderBlade = child(box("rudderBlade", 0.28, 4.4, 2.4, scene), mHullMid);
    rudderBlade.parent = rudderPivot;
    rudderBlade.position.set(0, -1.2, -1.2);

    // ── DECKS ─────────────────────────────────────────────────────────────────
    // 1. Main Deck (Gun Deck) Z in [-6.5, 7.5] (length 14m, width 10.6m)
    const mainDeck = child(box("mainDeck", 10.6, 0.35, 14.0, scene), mDeck);
    mainDeck.position.set(0, MAIN_DECK_Y, 0.5);

    // Center bilge cargo grating on main deck
    const cargoGrating = child(box("cargoGrating", 2.8, 0.08, 3.2, scene), mIron);
    cargoGrating.position.set(0, MAIN_DECK_Y + 0.18, -3.2);

    // 2. Poop Deck (Quarterdeck) Z in [-17.5, -6.5] (length 11m, width 10.6m)
    const poopBase = child(box("poopBase", 10.4, 2.8, 11.0, scene), mHullMid);
    poopBase.position.set(0, 5.4, -12.0);
    const poopDeck = child(box("poopDeck", 10.6, 0.35, 11.0, scene), mDeck);
    poopDeck.position.set(0, POOP_DECK_Y, -12.0);

    // 3. Forecastle Deck (Bow Deck) Z in [7.5, 17.5] (length 10m, width 10.6m)
    const foreBase = child(box("foreBase", 10.4, 2.2, 10.0, scene), mHullMid);
    foreBase.position.set(0, 5.1, 12.5);
    const foreDeck = child(box("foreDeck", 10.6, 0.35, 10.0, scene), mDeck);
    foreDeck.position.set(0, FORE_DECK_Y, 12.5);

    // ── WALLS & BULKHEADS ─────────────────────────────────────────────────────

    // A. SOLID MAIN DECK BULWARK WALLS WITH FRAMED GUNPORTS
    // Cannons are at Z = [-4.5, 0.5, 5.5], local X = +/- 4.3 (gunports at +/- 5.3)
    const cannonZPositions = [-4.5, 0.5, 5.5];

    for (const sx of [-1, 1]) {
        const wx = sx * 5.3;

        // Continuous heavy oak cap rail along the top of the bulwark (Y = 5.42)
        const capRail = child(box(`capRail_${sx}`, 0.38, 0.14, 14.0, scene), mHullMid);
        capRail.position.set(wx, 5.42, 0.5);

        // Framed Gunport Cutouts at each cannon position
        for (const cz of cannonZPositions) {
            // Lower sill beneath cannon
            const sill = child(box(`gp_sill_${sx}_${cz}`, 0.32, 0.25, 2.2, scene), mHullMid);
            sill.position.set(wx, MAIN_DECK_Y + 0.125, cz);

            // Upper lintel above cannon
            const lintel = child(box(`gp_lintel_${sx}_${cz}`, 0.32, 0.20, 2.2, scene), mHullMid);
            lintel.position.set(wx, 5.30, cz);

            // Forward and aft vertical framing timbers
            for (const fz of [-1.05, 1.05]) {
                const jamb = child(box(`gp_jamb_${sx}_${cz}_${fz}`, 0.34, 1.0, 0.22, scene), mHullMid);
                jamb.position.set(wx, MAIN_DECK_Y + 0.70, cz + fz);
            }
        }

        // Solid bulwark wall panels between gunports
        // 1. Aft wall panel (from Z = -6.5 to -5.55, length 0.95m)
        const pAft = child(box(`bwp_aft_${sx}`, 0.26, 1.4, 0.95, scene), mHullMid);
        pAft.position.set(wx, MAIN_DECK_Y + 0.70, -6.025);

        // 2. Mid wall panel 1 (from Z = -3.45 to -0.55, length 2.9m)
        const pMid1 = child(box(`bwp_mid1_${sx}`, 0.26, 1.4, 2.9, scene), mHullMid);
        pMid1.position.set(wx, MAIN_DECK_Y + 0.70, -2.0);

        // 3. Mid wall panel 2 (from Z = 1.55 to 4.45, length 2.9m)
        const pMid2 = child(box(`bwp_mid2_${sx}`, 0.26, 1.4, 2.9, scene), mHullMid);
        pMid2.position.set(wx, MAIN_DECK_Y + 0.70, 3.0);

        // 4. Fore wall panel (from Z = 6.55 to 7.5, length 0.95m)
        const pFore = child(box(`bwp_fore_${sx}`, 0.26, 1.4, 0.95, scene), mHullMid);
        pFore.position.set(wx, MAIN_DECK_Y + 0.70, 7.025);

        // Inner vertical reinforcing ribs / stanchions along the wall
        for (let rz = -6.0; rz <= 7.0; rz += 2.2) {
            const rib = child(box(`bw_rib_${sx}_${rz}`, 0.16, 1.35, 0.16, scene), mHullDark);
            rib.position.set(sx * 5.14, MAIN_DECK_Y + 0.68, rz);
        }

        // ── BOARDING LADDERS (Port & Starboard Amidships at Z = 0.5) ─────────────
        // Sea of Thieves style rope & oak rungs hanging down the outer hull into the ocean
        const ladderX = sx * 5.42;
        const ladderZ = 0.5;

        // Two vertical ladder side ropes / rails extending down to waterline (Y = -0.8 to 4.3)
        for (const lz of [-0.42, 0.42]) {
            const sideRail = child(box(`ladder_rail_${sx}_${lz}`, 0.08, 5.2, 0.08, scene), mIron);
            sideRail.position.set(ladderX, 1.75, ladderZ + lz);
        }

        // Ladder horizontal oak rungs
        for (let ry = -0.6; ry <= 4.2; ry += 0.45) {
            const rung = child(box(`ladder_rung_${sx}_${ry.toFixed(2)}`, 0.14, 0.09, 0.88, scene), mDeck);
            rung.position.set(ladderX + sx * 0.04, ry, ladderZ);
        }

        // Top boarding handrail posts on gunwale
        const topGrip = child(box(`ladder_grip_${sx}`, 0.18, 0.45, 0.94, scene), mGoldTrim);
        topGrip.position.set(ladderX - sx * 0.08, 4.45, ladderZ);
    }

    // B. CAPTAIN'S CABIN BULKHEAD WALL (Facing Main Deck under Poop Deck at Z = -6.5)
    // Height: 2.8m (from Y = 4.0 to 6.8), spanning across X in [-5.3, 5.3]
    const capBulkhead = child(box("capBulkhead", 10.6, 2.8, 0.32, scene), mHullMid);
    capBulkhead.position.set(0, 5.4, -6.5);

    // Bulkhead top cornice beam with gold decorative molding
    const capCornice = child(box("capCornice", 10.6, 0.18, 0.44, scene), mGoldTrim);
    capCornice.position.set(0, 6.71, -6.5);

    // Arched Captain's Cabin Door (in center)
    const doorFrame = child(box("capDoorFrame", 1.8, 2.4, 0.18, scene), mGoldTrim);
    doorFrame.position.set(0, 5.2, -6.32);
    const capDoor = child(box("capDoor", 1.5, 2.2, 0.14, scene), mHullDark);
    capDoor.position.set(0, 5.1, -6.30);

    // Iron strap hinges across door
    for (const hy of [5.7, 4.5]) {
        const hinge = child(box(`capHinge_${hy}`, 1.4, 0.08, 0.18, scene), mIron);
        hinge.position.set(0, hy, -6.28);
    }
    // Brass ring door handle
    const doorKnocker = MeshBuilder.CreateTorus("doorKnocker",
        { diameter: 0.18, thickness: 0.04, tessellation: 12 }, scene);
    doorKnocker.parent = root; doorKnocker.material = mWheelRim;
    doorKnocker.position.set(0.45, 5.1, -6.22);

    // Two Leaded Glass Captain's Cabin Windows
    for (const wx of [-1.8, 1.8]) {
        const winFrame = child(box(`capWinFrame_${wx}`, 1.1, 1.2, 0.16, scene), mGoldTrim);
        winFrame.position.set(wx, 5.5, -6.32);
        const winPane = child(box(`capWinPane_${wx}`, 0.9, 1.0, 0.12, scene), mWindow);
        winPane.position.set(wx, 5.5, -6.30);
    }

    // Flanking Bulkhead Lanterns (Warm golden glow)
    for (const lx of [-1.05, 1.05]) {
        const bBracket = child(box(`bLBrk_${lx}`, 0.08, 0.35, 0.35, scene), mIron);
        bBracket.position.set(lx, 5.65, -6.20);
        const bLantern = MeshBuilder.CreateCylinder(`bLantern_${lx}`,
            { height: 0.36, diameter: 0.24, tessellation: 8 }, scene);
        bLantern.parent = root; bLantern.material = mLanternGlow;
        bLantern.position.set(lx, 5.50, -6.05);
    }

    // C. TWIN COMPANIONWAY STAIRS (To Poop Deck)
    // Symmetrical flights on Port (X = -3.8) and Starboard (X = +3.8)
    // Spanning Z from -3.5 to -6.5, rising from Y = 4.0 to 6.8
    for (const sx of [-1, 1]) {
        const stX = sx * 3.8;
        // 7 solid steps
        for (let s = 0; s < 7; s++) {
            const stepZ = -3.5 - (s + 0.5) * (3.0 / 7);
            const stepY = MAIN_DECK_Y + (s + 0.5) * (2.8 / 7);
            const step = child(box(`poopStep_${sx}_${s}`, 1.5, 0.40, 0.46, scene), mDeck);
            step.position.set(stX, stepY, stepZ);
        }

        // Outer and inner angled handrails
        for (const hx of [-0.75, 0.75]) {
            const railX = stX + hx;
            const rail = child(box(`poopRail_${sx}_${hx}`, 0.10, 0.12, 3.8, scene), mHullMid);
            rail.rotation.x = -Math.atan2(2.8, 3.0);
            rail.position.set(railX, MAIN_DECK_Y + 1.85, -5.0);

            // Rail newel posts at top and bottom
            const postBottom = child(box(`poopPostB_${sx}_${hx}`, 0.14, 1.2, 0.14, scene), mHullMid);
            postBottom.position.set(railX, MAIN_DECK_Y + 0.60, -3.5);
            const postTop = child(box(`poopPostT_${sx}_${hx}`, 0.14, 1.2, 0.14, scene), mHullMid);
            postTop.position.set(railX, POOP_DECK_Y + 0.60, -6.5);
        }
    }

    // D. FORECASTLE BULKHEAD WALL (Facing Main Deck under Fore Deck at Z = 7.5)
    // Height: 2.2m (from Y = 4.0 to 6.2), spanning across X in [-5.3, 5.3]
    const foreBulkhead = child(box("foreBulkhead", 10.6, 2.2, 0.32, scene), mHullMid);
    foreBulkhead.position.set(0, 5.1, 7.5);

    // Bulkhead top cornice beam
    const foreCornice = child(box("foreCornice", 10.6, 0.16, 0.40, scene), mGoldTrim);
    foreCornice.position.set(0, 6.12, 7.5);

    // Crew Quarters Hatch Door in center
    const crewHatch = child(box("crewHatch", 1.5, 1.8, 0.14, scene), mHullDark);
    crewHatch.position.set(0, 4.9, 7.32);
    for (const hy of [5.4, 4.4]) {
        const hinge = child(box(`crewHinge_${hy}`, 1.3, 0.07, 0.18, scene), mIron);
        hinge.position.set(0, hy, 7.30);
    }
    // Naval lantern mounted above crew hatch
    const foreLantern = MeshBuilder.CreateCylinder("foreLantern",
        { height: 0.34, diameter: 0.24, tessellation: 8 }, scene);
    foreLantern.parent = root; foreLantern.material = mLanternGlow;
    foreLantern.position.set(0, 5.75, 7.22);

    // E. TWIN FORECASTLE STAIRS (To Fore Deck)
    // Symmetrical flights on Port (X = -3.8) and Starboard (X = +3.8)
    // Spanning Z from 5.2 to 7.5, rising from Y = 4.0 to 6.2
    for (const sx of [-1, 1]) {
        const stX = sx * 3.8;
        // 6 solid steps
        for (let s = 0; s < 6; s++) {
            const stepZ = 5.2 + (s + 0.5) * (2.3 / 6);
            const stepY = MAIN_DECK_Y + (s + 0.5) * (2.2 / 6);
            const step = child(box(`foreStep_${sx}_${s}`, 1.5, 0.38, 0.42, scene), mDeck);
            step.position.set(stX, stepY, stepZ);
        }

        // Outer and inner angled handrails
        for (const hx of [-0.75, 0.75]) {
            const railX = stX + hx;
            const rail = child(box(`foreRail_${sx}_${hx}`, 0.10, 0.12, 3.2, scene), mHullMid);
            rail.rotation.x = Math.atan2(2.2, 2.3);
            rail.position.set(railX, MAIN_DECK_Y + 1.55, 6.35);

            const postBottom = child(box(`forePostB_${sx}_${hx}`, 0.14, 1.1, 0.14, scene), mHullMid);
            postBottom.position.set(railX, MAIN_DECK_Y + 0.55, 5.2);
            const postTop = child(box(`forePostT_${sx}_${hx}`, 0.14, 1.1, 0.14, scene), mHullMid);
            postTop.position.set(railX, FORE_DECK_Y + 0.55, 7.5);
        }
    }

    // F. POOP DECK BULWARKS & GRAND STERN CASTLE TRANSOM WALL
    // Port & Starboard bulwark walls on poop deck Z in [-17.5, -6.5]
    for (const sx of [-1, 1]) {
        const pBulwark = child(box(`pBulwark_${sx}`, 0.28, 1.3, 11.0, scene), mHullMid);
        pBulwark.position.set(sx * 5.3, POOP_DECK_Y + 0.65, -12.0);

        const pCap = child(box(`pCap_${sx}`, 0.38, 0.14, 11.0, scene), mHullMid);
        pCap.position.set(sx * 5.3, POOP_DECK_Y + 1.30, -12.0);
    }

    // Grand Stern Transom Wall at Z = -17.5
    // Rising 1.7m above the poop deck (Y up to 8.5)
    const sternTransom = child(box("sternTransom", 10.6, 4.2, 0.38, scene), mHullMid);
    sternTransom.position.set(0, 6.4, -17.5);

    // Transom top carved gold crown / taffrail
    const taffrail = child(box("taffrail", 10.6, 0.32, 0.50, scene), mGoldTrim);
    taffrail.position.set(0, 8.5, -17.5);

    // Row of 5 Transom Gallery Windows overlooking the wake
    for (let i = -2; i <= 2; i++) {
        const twin = child(box(`transomWin_${i}`, 1.2, 1.3, 0.16, scene), mWindow);
        twin.position.set(i * 1.9, 7.1, -17.65);

        const twinFrame = child(box(`transomFrame_${i}`, 1.35, 1.45, 0.12, scene), mGoldTrim);
        twinFrame.position.set(i * 1.9, 7.1, -17.68);
    }

    // 4 Grand Glowing Stern Lanterns
    for (let i = 0; i < 4; i++) {
        const lx = -3.9 + i * 2.6;
        // Bracket
        const lBracket = child(box(`sLBrk_${i}`, 0.12, 0.45, 0.65, scene), mIron);
        lBracket.position.set(lx, 7.9, -17.85);

        // Warm Glowing Lantern Cylinder
        const sGlow = MeshBuilder.CreateCylinder(`sGlow_${i}`,
            { height: 0.60, diameter: 0.42, tessellation: 8 }, scene);
        sGlow.parent = root; sGlow.material = mLanternGlow;
        sGlow.position.set(lx, 8.1, -18.15);

        // Cap and base
        const sCap = child(box(`sCap_${i}`, 0.48, 0.16, 0.48, scene), mIron);
        sCap.position.set(lx, 8.45, -18.15);
        const sBase = child(box(`sBase_${i}`, 0.44, 0.12, 0.44, scene), mIron);
        sBase.position.set(lx, 7.75, -18.15);
    }

    // G. FORECASTLE DECK BULWARKS (Bow Z in [7.5, 17.5])
    for (const sx of [-1, 1]) {
        const fBulwark = child(box(`fBulwark_${sx}`, 0.28, 1.3, 10.0, scene), mHullMid);
        fBulwark.position.set(sx * 5.3, FORE_DECK_Y + 0.65, 12.5);

        const fCap = child(box(`fCap_${sx}`, 0.38, 0.14, 10.0, scene), mHullMid);
        fCap.position.set(sx * 5.3, FORE_DECK_Y + 1.30, 12.5);
    }
    // Forward bow beakhead wall across the front at Z = 17.5
    const bowWall = child(box("bowWall", 6.2, 1.4, 0.36, scene), mHullMid);
    bowWall.position.set(0, FORE_DECK_Y + 0.70, 17.5);
    const bowCap = child(box("bowCap", 6.4, 0.16, 0.44, scene), mGoldTrim);
    bowCap.position.set(0, FORE_DECK_Y + 1.40, 17.5);

    // Samson post at bow stem
    const samsonPost = child(box("samsonPost", 0.35, 1.8, 0.35, scene), mMast);
    samsonPost.position.set(0, FORE_DECK_Y + 0.90, 17.0);

    // ── Anchors & Chains (Port & Starboard) ───────────────────────────────────
    for (const sx of [-1, 1]) {
        const cathead = child(box(`cathead_${sx}`, 0.35, 0.35, 2.2, scene), mMast);
        cathead.position.set(sx * 5.2, FORE_DECK_Y + 0.8, 15.0);
        cathead.rotation.y = sx * 0.45;

        const anchorNode = new TransformNode(`anchorRoot_${sx}`, scene);
        anchorNode.parent = root;
        anchorNode.position.set(sx * 5.5, 3.8, 15.0);
        anchorNode.rotation.z = sx * 0.30;

        const shank = child(box(`aShank_${sx}`, 0.18, 2.8, 0.18, scene), mIron);
        shank.parent = anchorNode; shank.position.set(0, 0, 0);

        const stock = child(box(`aStock_${sx}`, 0.18, 0.18, 1.8, scene), mIron);
        stock.parent = anchorNode; stock.position.set(0, 1.2, 0);

        const flukes = child(box(`aFlukes_${sx}`, 0.18, 0.8, 2.0, scene), mIron);
        flukes.parent = anchorNode; flukes.position.set(0, -1.2, 0);

        for (let c = 0; c < 6; c++) {
            const link = child(box(`alink_${sx}_${c}`, 0.12, 0.28, 0.12, scene), mIron);
            link.parent = anchorNode;
            link.position.set(0, 1.3 + c * 0.26, c * 0.10);
        }
    }

    // ── Masts & Sails ─────────────────────────────────────────────────────────
    const mastData = [
        { name: "fore",   z:  12.0, h: 19, r: 0.32, hasCrowsNest: false, baseDeckY: FORE_DECK_Y },
        { name: "main",   z:   2.5, h: 24, r: 0.38, hasCrowsNest: true,  baseDeckY: MAIN_DECK_Y },
        { name: "mizzen", z: -10.5, h: 16, r: 0.28, hasCrowsNest: false, baseDeckY: POOP_DECK_Y },
    ];

    let pirateFlagMesh: Mesh | null = null;

    for (const md of mastData) {
        const mast = MeshBuilder.CreateCylinder(`mast_${md.name}`,
            { height: md.h, diameter: md.r * 2, tessellation: 8 }, scene);
        mast.parent = root; mast.material = mMast;
        mast.position.set(0, md.baseDeckY + md.h / 2, md.z);

        // Lower yard
        const yardLower = child(box(`${md.name}_yard_low`, md.h * 0.74, 0.26, 0.26, scene), mMast);
        yardLower.position.set(0, md.baseDeckY + md.h * 0.50, md.z);

        // Upper yard
        const yardUpper = child(box(`${md.name}_yard_up`, md.h * 0.56, 0.20, 0.20, scene), mMast);
        yardUpper.position.set(0, md.baseDeckY + md.h * 0.84, md.z);

        // Billowing Canvas Sail
        const sail = child(box(`${md.name}_sail`, md.h * 0.68, md.h * 0.44, 0.12, scene), mSail);
        sail.position.set(0, md.baseDeckY + md.h * 0.65, md.z + 0.18);

        // Shrouds / Ratlines left & right
        for (const sx of [-1, 1]) {
            const rope = child(box(`${md.name}_shroud_${sx}`, 0.08, md.h * 0.58, 0.08, scene), mRope);
            rope.rotation.z = sx * 0.16;
            rope.position.set(sx * 3.5, md.baseDeckY + md.h * 0.48, md.z);
        }

        // Crow's Nest on Main Mast
        if (md.hasCrowsNest) {
            const cnY = md.baseDeckY + 16.5;
            const cnFloor = MeshBuilder.CreateCylinder("crowsNestFloor",
                { height: 0.22, diameter: 3.2, tessellation: 14 }, scene);
            cnFloor.parent = root; cnFloor.material = mDeck;
            cnFloor.position.set(0, cnY, md.z);

            const cnRailing = MeshBuilder.CreateCylinder("crowsNestRail",
                { height: 0.95, diameter: 3.3, tessellation: 14 }, scene);
            cnRailing.parent = root; cnRailing.material = mHullMid;
            cnRailing.position.set(0, cnY + 0.54, md.z);

            // Pirate Flag atop Main Mast
            const flagStaff = child(box("flagStaff", 0.10, 2.2, 0.10, scene), mMast);
            flagStaff.position.set(0, md.baseDeckY + md.h + 1.1, md.z);

            pirateFlagMesh = MeshBuilder.CreatePlane("pirateFlag",
                { width: 2.4, height: 1.3 }, scene) as Mesh;
            pirateFlagMesh.parent = root;
            pirateFlagMesh.material = mFlag;
            pirateFlagMesh.position.set(1.2, md.baseDeckY + md.h + 1.0, md.z);
        }
    }

    // ── CANNONS (3 per side, 2 bow chasers, 2 stern chasers) ────────────────────
    const cannonHandles: CannonHandle[] = [];

    const createCannonMesh = (side: "L" | "R" | "F" | "B", idx: number, basePos: { x: number; y: number; z: number }, defaultYaw: number) => {
        // 1. Mount Pivot (Yaw rotation, parented to shipRoot)
        const mount = new TransformNode(`mount_${side}_${idx}`, scene);
        mount.parent = root;
        mount.position.set(basePos.x, basePos.y - 0.32, basePos.z);
        mount.rotation.y = defaultYaw;

        // 2. Heavy Oak Carriage Chassis (+Z is forward/outboard towards gunport)
        const carriage = MeshBuilder.CreateBox(`carriage_${side}_${idx}`,
            { width: 1.5, height: 0.58, depth: 2.3 }, scene) as Mesh;
        carriage.parent = mount; carriage.material = mCarriage;
        carriage.position.set(0, 0, 0);

        // 4 Carriage Truck Wheels
        for (const wx of [-0.82, 0.82]) {
            for (const wz of [-0.72, 0.72]) {
                const w = MeshBuilder.CreateCylinder(`cw_${side}_${idx}_${wx}_${wz}`,
                    { height: 0.18, diameter: 0.56, tessellation: 10 }, scene);
                w.parent = mount; w.material = mCarriage;
                w.rotation.z = Math.PI / 2;
                w.position.set(wx, -0.16, wz);
            }
        }

        // Rear Aiming Tiller Bar
        const tiller = MeshBuilder.CreateCylinder(`tiller_${side}_${idx}`,
            { height: 0.90, diameter: 0.10, tessellation: 8 }, scene);
        tiller.parent = mount; tiller.material = mWheel;
        tiller.rotation.z = Math.PI / 2;
        tiller.position.set(0, 0.30, -1.05);

        // Rear Carriage Aiming Handles
        for (const gx of [-0.38, 0.38]) {
            const grip = MeshBuilder.CreateCylinder(`grip_${side}_${idx}_${gx}`,
                { height: 0.30, diameter: 0.09, tessellation: 8 }, scene);
            grip.parent = mount; grip.material = mWheelRim;
            grip.position.set(gx, 0.44, -1.05);
        }

        // 3. Elevation Pivot (Pitch trunnions)
        const barrelPivot = new TransformNode(`bPivot_${side}_${idx}`, scene);
        barrelPivot.parent = mount;
        barrelPivot.position.set(0, 0.36, 0.18);

        // 4. Cast Iron Barrel
        const barrel = MeshBuilder.CreateCylinder(`barrel_${side}_${idx}`,
            { height: 2.2, diameterTop: 0.38, diameterBottom: 0.52, tessellation: 14 }, scene) as Mesh;
        barrel.parent = barrelPivot; barrel.material = mCannon;
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0, 0);

        // Muzzle Ring
        const muzzle = MeshBuilder.CreateCylinder(`muz_${side}_${idx}`,
            { height: 0.15, diameter: 0.50, tessellation: 14 }, scene);
        muzzle.parent = barrel; muzzle.material = mCannon;
        muzzle.position.set(0, 1.02, 0);

        // Dark Hollow Bore
        const bore = MeshBuilder.CreateCylinder(`bore_${side}_${idx}`,
            { height: 0.04, diameter: 0.28, tessellation: 10 }, scene);
        bore.parent = barrel; bore.material = mat(`boreMat_${side}_${idx}`, scene, 0.02, 0.02, 0.02, 0);
        bore.position.set(0, 1.09, 0);

        // Breech Ring Band
        const band = MeshBuilder.CreateCylinder(`band_${side}_${idx}`,
            { height: 0.16, diameter: 0.56, tessellation: 14 }, scene);
        band.parent = barrel; band.material = mWheelRim;
        band.position.set(0, -0.70, 0);

        // Cascabel Button
        const cascabel = MeshBuilder.CreateSphere(`casc_${side}_${idx}`,
            { diameter: 0.34, segments: 8 }, scene);
        cascabel.parent = barrel; cascabel.material = mCannon;
        cascabel.position.set(0, -1.15, 0);

        // Breech Aiming Grips directly on barrel
        for (const hx of [-0.36, 0.36]) {
            const bHandle = MeshBuilder.CreateCylinder(`bHandle_${side}_${idx}_${hx}`,
                { height: 0.26, diameter: 0.09, tessellation: 8 }, scene);
            bHandle.parent = barrel; bHandle.material = mWheel;
            bHandle.rotation.z = Math.PI / 2;
            bHandle.position.set(hx, -0.90, 0);
        }

        // 5. Muzzle Tip TransformNode
        const muzzleTip = new TransformNode(`muzTip_${side}_${idx}`, scene);
        muzzleTip.parent = barrel;
        muzzleTip.position.set(0, 1.25, 0);

        cannonHandles.push({
            side,
            index: idx,
            mount,
            barrelPivot,
            barrel,
            carriage,
            muzzleTip,
            recoilZ: 0,
        });
    };

    // 1. Broadside Cannons (Port: facing -X, Starboard: facing +X)
    for (const side of ["L", "R"] as ("L" | "R")[]) {
        const defaultYaw = side === "L" ? -Math.PI / 2 : Math.PI / 2;
        for (let idx = 0; idx < CANNON_COUNT_PER_SIDE; idx++) {
            const lp = cannonLocalPos(side, idx);
            createCannonMesh(side, idx, lp, defaultYaw);
        }
    }

    // 2. Front Bow Chaser Cannons on Forecastle (Facing Forward +Z: defaultYaw = 0)
    for (let idx = 0; idx < CANNON_COUNT_BOW; idx++) {
        const lp = cannonLocalPos("F", idx);
        createCannonMesh("F", idx, lp, 0);
    }

    // 3. Back Stern Chaser Cannons on Poop Deck (Facing Aft -Z: defaultYaw = Math.PI)
    for (let idx = 0; idx < CANNON_COUNT_STERN; idx++) {
        const lp = cannonLocalPos("B", idx);
        createCannonMesh("B", idx, lp, Math.PI);
    }

    // ── CENTRAL AMMO DEPOT (Positioned at X = 0, Z = 0.5) ──────────────────────
    const DEPOT_X = 0;
    const DEPOT_Z = 0.5;

    // Heavy Oak Cargo Pallet (3.2m x 3.0m)
    const pallet = child(box("ammoPallet", 3.2, 0.18, 3.0, scene), mDeck);
    pallet.position.set(DEPOT_X, MAIN_DECK_Y + 0.09, DEPOT_Z);

    // Corner Iron Bracket Reinforcements
    for (const px of [-1.5, 1.5]) {
        for (const pz of [-1.4, 1.4]) {
            const bracket = child(box(`pBracket_${px}_${pz}`, 0.26, 0.20, 0.26, scene), mIron);
            bracket.position.set(DEPOT_X + px, MAIN_DECK_Y + 0.10, DEPOT_Z + pz);
        }
    }

    // Glowing Golden Deck Torus Ring (Radius ~1.9m)
    const depotRing = MeshBuilder.CreateTorus("depotRing",
        { diameter: 3.8, thickness: 0.08, tessellation: 28 }, scene);
    depotRing.parent = root; depotRing.material = mLanternGlow;
    depotRing.position.set(DEPOT_X, MAIN_DECK_Y + 0.06, DEPOT_Z);

    // Master Ammo Barrel
    const ammoBarrelMesh = MeshBuilder.CreateCylinder("ammoBarrel",
        { height: 1.45, diameter: 1.28, tessellation: 16 }, scene) as Mesh;
    ammoBarrelMesh.parent = root; ammoBarrelMesh.material = mAmmoBarrel;
    ammoBarrelMesh.position.set(DEPOT_X, MAIN_DECK_Y + 0.80, DEPOT_Z);

    // 4 Brass Hoops on Master Barrel
    for (const hy of [0.48, 0.16, -0.16, -0.48]) {
        const hoop = MeshBuilder.CreateCylinder(`bhoop_${hy}`,
            { height: 0.08, diameter: 1.32, tessellation: 16 }, scene);
        hoop.parent = root; hoop.material = mGoldTrim;
        hoop.position.set(DEPOT_X, MAIN_DECK_Y + 0.80 + hy, DEPOT_Z);
    }

    // Open top rim showing stacked cannonballs inside
    const openRim = MeshBuilder.CreateCylinder("ammoRim",
        { height: 0.14, diameter: 1.32, tessellation: 16 }, scene);
    openRim.parent = root; openRim.material = mGoldTrim;
    openRim.position.set(DEPOT_X, MAIN_DECK_Y + 1.50, DEPOT_Z);

    for (let bx = -1; bx <= 1; bx++) {
        for (let bz = -1; bz <= 1; bz++) {
            const inBall = MeshBuilder.CreateSphere(`inBall_${bx}_${bz}`,
                { diameter: 0.30, segments: 6 }, scene);
            inBall.parent = root;
            inBall.material = mat(`inBm_${bx}_${bz}`, scene, 0.10, 0.10, 0.12, 0.08);
            inBall.position.set(DEPOT_X + bx * 0.28, MAIN_DECK_Y + 1.46, DEPOT_Z + bz * 0.28);
        }
    }

    // Flanking Powder Kegs
    for (const sx of [-1, 1]) {
        const keg = MeshBuilder.CreateCylinder(`ammoKeg_${sx}`,
            { height: 1.05, diameter: 0.74, tessellation: 12 }, scene);
        keg.parent = root; keg.material = mCarriage;
        keg.position.set(DEPOT_X + sx * 1.15, MAIN_DECK_Y + 0.60, DEPOT_Z);

        for (const khy of [0.30, -0.30]) {
            const khoop = MeshBuilder.CreateCylinder(`khoop_${sx}_${khy}`,
                { height: 0.06, diameter: 0.77, tessellation: 12 }, scene);
            khoop.parent = root; khoop.material = mIron;
            khoop.position.set(DEPOT_X + sx * 1.15, MAIN_DECK_Y + 0.60 + khy, DEPOT_Z);
        }
    }

    // Pyramid Stacks of Cannonballs on Pallet Corners
    for (let c = 0; c < 6; c++) {
        const pBall = MeshBuilder.CreateSphere(`pBall_${c}`,
            { diameter: 0.28, segments: 6 }, scene);
        pBall.parent = root;
        pBall.material = mat(`pbMat_${c}`, scene, 0.10, 0.10, 0.12, 0.08);
        const row = c < 3 ? 0 : 1;
        const col = c % 3;
        pBall.position.set(
            DEPOT_X - 0.95 + col * 0.28,
            MAIN_DECK_Y + 0.28 + (row > 0 ? 0.24 : 0),
            DEPOT_Z + 1.05
        );
    }

    // Depot Signpost & Golden Lantern
    const post = child(box("depotPost", 0.14, 2.1, 0.14, scene), mMast);
    post.position.set(DEPOT_X, MAIN_DECK_Y + 1.15, DEPOT_Z - 1.15);

    const dLantern = MeshBuilder.CreateCylinder("depotLantern",
        { height: 0.38, diameter: 0.30, tessellation: 8 }, scene);
    dLantern.parent = root; dLantern.material = mLanternGlow;
    dLantern.position.set(DEPOT_X, MAIN_DECK_Y + 2.25, DEPOT_Z - 1.15);

    const signBoard = child(box("depotSign", 1.4, 0.40, 0.10, scene), mDeck);
    signBoard.position.set(DEPOT_X, MAIN_DECK_Y + 1.85, DEPOT_Z - 1.15);

    // ── CARPENTER'S PLANK DEPOT (Positioned at X = 0, Z = -1.6) ────────────────
    const PLANK_DEPOT_X = 0;
    const PLANK_DEPOT_Z = -1.6;

    // Wooden Pallet Platform
    const plankPallet = child(box("plankPallet", 2.4, 0.16, 1.8, scene), mDeck);
    plankPallet.position.set(PLANK_DEPOT_X, MAIN_DECK_Y + 0.08, PLANK_DEPOT_Z);

    // Glowing Wood/Emerald Ring Indicator
    const plankRing = MeshBuilder.CreateTorus("plankRing",
        { diameter: 2.8, thickness: 0.07, tessellation: 24 }, scene);
    plankRing.parent = root;
    const mPlankRing = mat("pRingMat", scene, 0.25, 0.85, 0.45, 0.65);
    plankRing.material = mPlankRing;
    plankRing.position.set(PLANK_DEPOT_X, MAIN_DECK_Y + 0.05, PLANK_DEPOT_Z);

    // Primary Plank Storage Barrel
    const plankBarrelMesh = MeshBuilder.CreateCylinder("plankBarrel",
        { height: 1.35, diameter: 1.15, tessellation: 16 }, scene) as Mesh;
    plankBarrelMesh.parent = root; plankBarrelMesh.material = mAmmoBarrel;
    plankBarrelMesh.position.set(PLANK_DEPOT_X - 0.50, MAIN_DECK_Y + 0.72, PLANK_DEPOT_Z);

    // Iron Hoops on Plank Barrel
    for (const hy of [0.42, 0.14, -0.14, -0.44]) {
        const hoop = MeshBuilder.CreateCylinder(`phoop_${hy}`,
            { height: 0.06, diameter: 1.18, tessellation: 16 }, scene);
        hoop.parent = root; hoop.material = mIron;
        hoop.position.set(PLANK_DEPOT_X - 0.50, MAIN_DECK_Y + 0.72 + hy, PLANK_DEPOT_Z);
    }

    // 4 Long Oak Planks standing upright inside the barrel
    for (let p = 0; p < 4; p++) {
        const a = (p / 4) * Math.PI * 2;
        const plank = child(box(`barrelPlank_${p}`, 0.14, 1.9, 0.38, scene), mDeck);
        plank.position.set(
            PLANK_DEPOT_X - 0.50 + Math.cos(a) * 0.22,
            MAIN_DECK_Y + 1.25,
            PLANK_DEPOT_Z + Math.sin(a) * 0.22,
        );
        plank.rotation.z = Math.cos(a) * 0.12;
        plank.rotation.x = Math.sin(a) * 0.12;
    }

    // Stack of bundled horizontal planks beside the barrel
    for (let layer = 0; layer < 4; layer++) {
        const stackPlank = child(box(`stackPlank_${layer}`, 0.45, 0.12, 1.4, scene), mDeck);
        stackPlank.position.set(PLANK_DEPOT_X + 0.55, MAIN_DECK_Y + 0.16 + layer * 0.13, PLANK_DEPOT_Z);
    }
    // Iron straps on bundled planks
    for (const sz of [-0.4, 0.4]) {
        const strap = child(box(`plankStrap_${sz}`, 0.48, 0.54, 0.06, scene), mIron);
        strap.position.set(PLANK_DEPOT_X + 0.55, MAIN_DECK_Y + 0.38, PLANK_DEPOT_Z + sz);
    }

    // Plank Depot Signpost & Lantern
    const pPost = child(box("plankPost", 0.12, 1.9, 0.12, scene), mMast);
    pPost.position.set(PLANK_DEPOT_X, MAIN_DECK_Y + 1.05, PLANK_DEPOT_Z - 0.85);

    const pLantern = MeshBuilder.CreateCylinder("plankLantern",
        { height: 0.35, diameter: 0.26, tessellation: 8 }, scene);
    pLantern.parent = root; pLantern.material = mLanternGlow;
    pLantern.position.set(PLANK_DEPOT_X, MAIN_DECK_Y + 2.05, PLANK_DEPOT_Z - 0.85);

    const pSign = child(box("plankSign", 1.3, 0.36, 0.08, scene), mDeck);
    pSign.position.set(PLANK_DEPOT_X, MAIN_DECK_Y + 1.70, PLANK_DEPOT_Z - 0.85);

    // ── PROVISIONS / FOOD DEPOT (Main Deck at X = -2.2, Z = -1.6) ─────────────
    const FOOD_DEPOT_X = -2.2;
    const FOOD_DEPOT_Z = -1.6;

    // Wooden Pallet Platform
    const foodPallet = child(box("foodPallet", 1.8, 0.16, 1.8, scene), mDeck);
    foodPallet.position.set(FOOD_DEPOT_X, MAIN_DECK_Y + 0.08, FOOD_DEPOT_Z);

    // Glowing Golden Ring Indicator
    const foodRing = MeshBuilder.CreateTorus("foodRing",
        { diameter: 2.4, thickness: 0.07, tessellation: 24 }, scene);
    foodRing.parent = root;
    const mFoodRing = mat("fRingMat", scene, 0.95, 0.80, 0.15, 0.65);
    foodRing.material = mFoodRing;
    foodRing.position.set(FOOD_DEPOT_X, MAIN_DECK_Y + 0.05, FOOD_DEPOT_Z);

    // Primary Food Storage Barrel
    const foodBarrelMesh = MeshBuilder.CreateCylinder("foodBarrel",
        { height: 1.35, diameter: 1.15, tessellation: 16 }, scene) as Mesh;
    foodBarrelMesh.parent = root; foodBarrelMesh.material = mAmmoBarrel;
    foodBarrelMesh.position.set(FOOD_DEPOT_X, MAIN_DECK_Y + 0.72, FOOD_DEPOT_Z);

    // Iron Hoops on Food Barrel
    for (const hy of [0.42, 0.14, -0.14, -0.44]) {
        const hoop = MeshBuilder.CreateCylinder(`fhoop_${hy}`,
            { height: 0.06, diameter: 1.18, tessellation: 16 }, scene);
        hoop.parent = root; hoop.material = mIron;
        hoop.position.set(FOOD_DEPOT_X, MAIN_DECK_Y + 0.72 + hy, FOOD_DEPOT_Z);
    }

    // Bananas on top of the barrel
    const mBananaYellow = mat("bYellowMat", scene, 0.96, 0.82, 0.12, 0.4);
    for (let b = 0; b < 3; b++) {
        const bMesh = MeshBuilder.CreateCylinder(`barrelBanana_${b}`,
            { height: 0.42, diameterTop: 0.08, diameterBottom: 0.10, tessellation: 6 }, scene);
        bMesh.parent = root; bMesh.material = mBananaYellow;
        bMesh.rotation.z = Math.PI / 3 + b * 0.2;
        bMesh.position.set(FOOD_DEPOT_X + (b - 1) * 0.18, MAIN_DECK_Y + 1.45, FOOD_DEPOT_Z);
    }

    // Lantern post & Sign
    const fPost = child(box("foodPost", 0.12, 1.9, 0.12, scene), mMast);
    fPost.position.set(FOOD_DEPOT_X - 0.7, MAIN_DECK_Y + 1.05, FOOD_DEPOT_Z);
    const fLantern = MeshBuilder.CreateCylinder("fLantern",
        { height: 0.32, diameter: 0.22, tessellation: 8 }, scene);
    fLantern.parent = root; fLantern.material = mLanternGlow;
    fLantern.position.set(FOOD_DEPOT_X - 0.7, MAIN_DECK_Y + 2.0, FOOD_DEPOT_Z);
    const fSign = child(box("foodSign", 1.1, 0.32, 0.08, scene), mDeck);
    fSign.position.set(FOOD_DEPOT_X - 0.7, MAIN_DECK_Y + 1.65, FOOD_DEPOT_Z);

    // ── STEERING WHEEL & BINNACLE (Poop Deck at Z = -14.0) ────────────────────
    const wheelRoot = new TransformNode("steeringWheelRoot", scene);
    wheelRoot.parent = root;
    wheelRoot.position.set(0, POOP_DECK_Y + 1.25, -14.0);

    // Raised Helm Platform
    const helmPlatform = child(box("helmPlat", 2.6, 0.16, 2.6, scene), mDeck);
    helmPlatform.position.set(0, POOP_DECK_Y + 0.08, -14.0);

    // Pedestal & Binnacle Compass Box
    const pedestal = MeshBuilder.CreateCylinder("pedestal",
        { height: 1.2, diameter: 0.32, tessellation: 8 }, scene);
    pedestal.parent = wheelRoot; pedestal.material = mMast;
    pedestal.position.set(0, -0.60, 0);

    const binnacleHood = MeshBuilder.CreateSphere("binnacleHood",
        { diameter: 0.48, segments: 8 }, scene);
    binnacleHood.parent = wheelRoot; binnacleHood.material = mGoldTrim;
    binnacleHood.position.set(0, -0.05, 0.22);

    // Spinning Wheel Part
    const wheelSpin = new TransformNode("wheelSpin", scene);
    wheelSpin.parent = wheelRoot;

    // Hub
    const hub = MeshBuilder.CreateCylinder("hub",
        { height: 0.22, diameter: 0.46, tessellation: 10 }, scene);
    hub.parent = wheelSpin; hub.material = mWheelRim; hub.rotation.x = Math.PI / 2;

    // 8 Wooden Spokes
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const spoke = box(`spk${i}`, 0.10, 1.65, 0.10, scene);
        spoke.parent = wheelSpin; spoke.material = mWheel; spoke.rotation.z = a;
    }

    // Rim (16 Segments)
    for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + Math.PI / 16;
        const seg = box(`rim${i}`, 0.11, 0.34, 0.11, scene);
        seg.parent = wheelSpin; seg.material = mWheelRim;
        seg.position.set(Math.sin(a) * 0.84, Math.cos(a) * 0.84, 0);
    }

    // 4 Brass Handle Grips
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const grip = MeshBuilder.CreateCylinder(`grip${i}`,
            { height: 0.24, diameter: 0.12, tessellation: 8 }, scene);
        grip.parent = wheelSpin; grip.material = mWheelRim;
        grip.position.set(Math.sin(a) * 0.84, Math.cos(a) * 0.84, 0.14);
    }

    // Compass Rose Inlay on Deck
    const compass = MeshBuilder.CreateCylinder("compassRose",
        { height: 0.06, diameter: 1.0, tessellation: 16 }, scene);
    compass.parent = root;
    compass.material = mat("cmat", scene, 0.20, 0.16, 0.08, 0.05);
    compass.position.set(0, POOP_DECK_Y + 0.18, -14.6);

    // ── Ship's Bell on Forecastle (Z = 12.5) ──────────────────────────────────
    const bellBelfry = child(box("bellBelfry", 0.8, 1.8, 0.4, scene), mMast);
    bellBelfry.position.set(0, FORE_DECK_Y + 0.9, 12.5);

    const bell = MeshBuilder.CreateSphere("bell",
        { diameter: 0.45, segments: 8 }, scene);
    bell.parent = root;
    bell.material = mat("bellm", scene, 0.85, 0.70, 0.15, 0.45);
    bell.position.set(0, FORE_DECK_Y + 0.9, 12.5);

    return {
        root,
        steeringWheel: wheelSpin,
        rudder: rudderPivot,
        pirateFlag: pirateFlagMesh ?? (child(box("flagDefault", 1, 1, 1, scene), mFlag)),
        cannons: cannonHandles,
        ammoBarrel: ammoBarrelMesh,
        plankBarrel: plankBarrelMesh,
        foodBarrel: foodBarrelMesh,
    };
}

/**
 * Builds a stylish 3D Pirate Captain character model.
 */
export function buildPirateCharacter(scene: Scene, parent: TransformNode): TransformNode {
    const pirateRoot = new TransformNode("pirateAvatar", scene);
    pirateRoot.parent = parent;

    const mCoat = mat("pCoat", scene, 0.12, 0.18, 0.36); // rich navy coat
    const mShirt = mat("pShirt", scene, 0.92, 0.90, 0.85); // white ruffled shirt
    const mPants = mat("pPants", scene, 0.18, 0.14, 0.10); // dark trousers
    const mLeather = mat("pLeather", scene, 0.25, 0.15, 0.08); // weathered leather
    const mGold = mat("pGold", scene, 0.88, 0.72, 0.20, 0.4); // gold buttons & buckles
    const mSkin = mat("pSkin", scene, 0.84, 0.62, 0.48); // tanned skin
    const mHat = mat("pHat", scene, 0.10, 0.10, 0.12); // black felt tricorn hat
    const mPlume = mat("pPlume", scene, 0.85, 0.15, 0.15, 0.3); // crimson feather plume

    function pBox(name: string, w: number, h: number, d: number, m: StandardMaterial): Mesh {
        const b = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
        b.parent = pirateRoot; b.material = m;
        return b;
    }

    // Legs & Cuffed Pirate Boots
    for (const sx of [-1, 1]) {
        const leg = pBox(`leg_${sx}`, 0.20, 0.65, 0.20, mPants);
        leg.position.set(sx * 0.18, 0.65, 0);

        const boot = pBox(`boot_${sx}`, 0.24, 0.40, 0.26, mLeather);
        boot.position.set(sx * 0.18, 0.20, 0.03);

        const cuff = pBox(`bcuff_${sx}`, 0.26, 0.12, 0.28, mLeather);
        cuff.position.set(sx * 0.18, 0.38, 0.03);
    }

    // Waist Leather Sash & Golden Buckle
    const belt = pBox("belt", 0.65, 0.16, 0.36, mLeather);
    belt.position.set(0, 0.98, 0);
    const buckle = pBox("buckle", 0.18, 0.18, 0.38, mGold);
    buckle.position.set(0, 0.98, 0.02);

    // Torso / Navy Pirate Coat
    const coat = pBox("coat", 0.70, 0.68, 0.34, mCoat);
    coat.position.set(0, 1.35, 0);

    for (const sx of [-1, 1]) {
        const tail = pBox(`tail_${sx}`, 0.30, 0.45, 0.32, mCoat);
        tail.position.set(sx * 0.18, 0.75, -0.02);
    }

    // Ruffled White Pirate Shirt & Gold Buttons
    const shirt = pBox("shirt", 0.22, 0.55, 0.35, mShirt);
    shirt.position.set(0, 1.38, 0.01);
    for (let b = 0; b < 4; b++) {
        const btn = pBox(`btn_${b}`, 0.05, 0.05, 0.37, mGold);
        btn.position.set(0, 1.15 + b * 0.12, 0);
    }

    // Leather Cross-Belt (Bandolier) with Cutlass
    const crossBelt = pBox("crossBelt", 0.10, 0.85, 0.36, mLeather);
    crossBelt.rotation.z = 0.55;
    crossBelt.position.set(0, 1.35, 0.01);

    const scabbard = pBox("scabbard", 0.08, 0.90, 0.12, mLeather);
    scabbard.rotation.z = 0.35;
    scabbard.position.set(-0.38, 0.85, 0.05);

    const hilt = pBox("hilt", 0.18, 0.06, 0.08, mGold);
    hilt.position.set(-0.52, 1.25, 0.05);

    // Shoulders, Sleeves & Leather Gloves (Arm pivots for realistic swinging/hammering)
    const epauletteL = pBox("epaulette_-1", 0.18, 0.06, 0.26, mGold);
    epauletteL.position.set(-0.42, 1.68, 0);
    const leftArmPivot = new TransformNode("pirateLeftArm", scene);
    leftArmPivot.parent = pirateRoot;
    leftArmPivot.position.set(-0.42, 1.62, 0);
    const sleeveL = MeshBuilder.CreateBox("sleeve_-1", { width: 0.16, height: 0.55, depth: 0.16 }, scene);
    sleeveL.parent = leftArmPivot; sleeveL.material = mCoat; sleeveL.position.set(0, -0.27, 0);
    const handL = MeshBuilder.CreateBox("hand_-1", { width: 0.13, height: 0.16, depth: 0.13 }, scene);
    handL.parent = leftArmPivot; handL.material = mLeather; handL.position.set(0, -0.60, 0);

    const epauletteR = pBox("epaulette_1", 0.18, 0.06, 0.26, mGold);
    epauletteR.position.set(0.42, 1.68, 0);
    const rightArmPivot = new TransformNode("pirateRightArm", scene);
    rightArmPivot.parent = pirateRoot;
    rightArmPivot.position.set(0.42, 1.62, 0);
    const sleeveR = MeshBuilder.CreateBox("sleeve_1", { width: 0.16, height: 0.55, depth: 0.16 }, scene);
    sleeveR.parent = rightArmPivot; sleeveR.material = mCoat; sleeveR.position.set(0, -0.27, 0);
    const handR = MeshBuilder.CreateBox("hand_1", { width: 0.13, height: 0.16, depth: 0.13 }, scene);
    handR.parent = rightArmPivot; handR.material = mLeather; handR.position.set(0, -0.60, 0);

    // Held Mallet in right hand for 3rd person
    const tpMallet = new TransformNode("tpMallet", scene);
    tpMallet.parent = handR;
    tpMallet.position.set(0, -0.05, 0.15);
    tpMallet.rotation.x = Math.PI / 3.5;
    const mHHandle = MeshBuilder.CreateCylinder("tpHHandle", { height: 0.45, diameter: 0.05 }, scene);
    mHHandle.parent = tpMallet; mHHandle.material = mLeather;
    const mHHead = MeshBuilder.CreateBox("tpHHead", { width: 0.14, height: 0.13, depth: 0.20 }, scene);
    mHHead.parent = mHHandle; mHHead.material = mPants; mHHead.position.set(0, 0.20, 0);
    tpMallet.setEnabled(false);

    // Held Bucket in right hand for 3rd person
    const tpBucket = new TransformNode("tpBucket", scene);
    tpBucket.parent = handR;
    tpBucket.position.set(0, -0.18, 0.10);
    const bMesh = MeshBuilder.CreateCylinder("tpBMesh", { height: 0.32, diameterTop: 0.28, diameterBottom: 0.20 }, scene);
    bMesh.parent = tpBucket; bMesh.material = mLeather;
    tpBucket.setEnabled(false);

    // Held Banana in right hand for 3rd person
    const tpBanana = new TransformNode("tpBanana", scene);
    tpBanana.parent = handR;
    tpBanana.position.set(0, -0.05, 0.12);
    tpBanana.rotation.x = Math.PI / 4;
    const mBanYellow = new StandardMaterial("tpBanYellow", scene);
    mBanYellow.diffuseColor = new Color3(0.95, 0.85, 0.12);
    mBanYellow.emissiveColor = new Color3(0.40, 0.32, 0.05);
    const tpBanMesh = MeshBuilder.CreateCylinder("tpBanMesh", { height: 0.35, diameterTop: 0.07, diameterBottom: 0.09, tessellation: 6 }, scene);
    tpBanMesh.parent = tpBanana; tpBanMesh.material = mBanYellow;
    tpBanana.setEnabled(false);

    // Head, Eye-Patch, Bandana & Tricorn Hat
    const head = MeshBuilder.CreateSphere("pirateHead", { diameter: 0.32, segments: 8 }, scene);
    head.parent = pirateRoot; head.material = mSkin;
    head.position.set(0, 1.82, 0);

    const eyePatch = pBox("eyePatch", 0.07, 0.07, 0.07, mHat);
    eyePatch.position.set(-0.08, 1.84, 0.14);

    const bandana = pBox("bandana", 0.34, 0.10, 0.34, mPlume);
    bandana.position.set(0, 1.90, 0);

    const hatCrown = MeshBuilder.CreateCylinder("hatCrown",
        { height: 0.20, diameter: 0.40, tessellation: 8 }, scene);
    hatCrown.parent = pirateRoot; hatCrown.material = mHat;
    hatCrown.position.set(0, 2.02, 0);

    const hatBrim = pBox("hatBrim", 0.80, 0.06, 0.80, mHat);
    hatBrim.position.set(0, 1.95, 0);

    const brimTrim = pBox("brimTrim", 0.84, 0.03, 0.84, mGold);
    brimTrim.position.set(0, 1.97, 0);

    const plume = pBox("plume", 0.07, 0.38, 0.07, mPlume);
    plume.rotation.z = 0.45;
    plume.position.set(0.30, 2.15, -0.05);

    return pirateRoot;
}
