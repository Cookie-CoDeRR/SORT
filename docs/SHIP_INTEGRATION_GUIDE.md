# Ship Integration & Customization Guide for Sea of Real Thieves

This document explains how ship meshes, cannons, steering controls, deck levels, and physics are structured so that custom 3D ship models (GLTF/GLB/FBX or procedural meshes) can be added cleanly without modifying core game logic.

---

## 1. Ship Architecture & Data Flow

Ship logic is strictly separated into three layers:

```
┌──────────────────────────────────────────────┐
│  packages/shared/src/shipPhysics.ts          │  <-- Pure Math Physics (Heading, Speed, Buoyancy)
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│  packages/client/src/shipBuilder.ts          │  <-- 3D Mesh & Component Hierarchy
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│  packages/client/src/main.ts                 │  <-- Main Gameplay Loop & Camera Controls
└──────────────────────────────────────────────┘
```

---

## 2. Key Ship Interfaces (`packages/client/src/shipBuilder.ts`)

Any custom ship builder or GLTF model loader **MUST** return a `ShipHandles` object so that all interactions (steering wheel, cannons, ammo barrel, leaks, ladders) work automatically.

```typescript
export interface CannonHandle {
    side: "L" | "R";
    index: number;
    mount: TransformNode;        // Yaw pivot (rotates horizontally with mouse aim)
    barrelPivot: TransformNode;  // Pitch pivot (elevates vertically with mouse aim)
    barrel: Mesh;                // Recoils along local Z axis when fired
    carriage: Mesh;              // Wheel chassis
    muzzleTip: TransformNode;    // World-coordinate tip for projectile spawning
    recoilZ: number;
}

export interface ShipHandles {
    root: TransformNode;
    steeringWheel: TransformNode; // Rotates based on rudder input
    rudder: TransformNode;        // Submerged rudder under stern
    pirateFlag: TransformNode;    // Flag fluttering on main mast
    ammoBarrel: TransformNode;    // Central ammo depot barrel
    plankBarrel: TransformNode;   // Planks storage barrel
    foodBarrel: TransformNode;    // Bananas storage barrel
    cannons: CannonHandle[];     // Array of port & starboard cannons
}
```

---

## 3. Ship Coordinate System & Conventions

When creating custom 3D models or procedural parts:

- **Origin `(0, 0, 0)`**: Center of the ship at the **waterline level**.
- **`+Z` (Forward)**: Ship Bow (front)
- **`-Z` (Backward)**: Ship Stern (back)
- **`+X` (Right)**: Starboard side
- **`-X` (Left)**: Port side
- **`+Y` (Up)**: Vertical height above ocean surface

### Deck Heights (`getDeckY(localZ)`)

Player walking physics queries `getDeckY(localZ)` to position the player's feet on the deck:
- `MAIN_DECK_Y = 4.0m` (Mid-ship gun deck for cannons and barrels)
- `POOP_DECK_Y = 6.8m` (Stern quarterdeck for helm & steering wheel)
- `FORE_DECK_Y = 6.2m` (Bow forecastle deck for anchor & bell)

---

## 4. How to Add a Custom GLTF / GLB / FBX Ship Model

To replace or add a custom 3D ship model, create a loader function in `packages/client/src/shipBuilder.ts`:

```typescript
import { SceneLoader } from "@babylonjs/core";

export async function loadCustomGLTFShip(
    scene: Scene,
    parent: TransformNode,
    modelPath: string,
    shipType: "player" | "enemy" = "player"
): Promise<ShipHandles> {
    const root = new TransformNode(`ship_${shipType}`, scene);
    root.parent = parent;

    // Load custom GLTF model
    const result = await SceneLoader.ImportMeshAsync("", "", modelPath, scene);
    const shipMesh = result.meshes[0];
    shipMesh.parent = root;

    // Attach interactive handles to nodes defined in the 3D model
    const steeringWheel = scene.getTransformNodeByName("SteeringWheel") || root;
    const rudder = scene.getTransformNodeByName("Rudder") || root;
    const ammoBarrel = scene.getTransformNodeByName("AmmoBarrel") || root;
    const plankBarrel = scene.getTransformNodeByName("PlankBarrel") || root;
    const foodBarrel = scene.getTransformNodeByName("FoodBarrel") || root;
    const pirateFlag = scene.getTransformNodeByName("Flag") || root;

    // Setup cannons array (match port/starboard nodes)
    const cannons: CannonHandle[] = [];
    // ... attach cannon mount, barrelPivot, and muzzleTip nodes

    return {
        root,
        steeringWheel,
        rudder,
        pirateFlag,
        ammoBarrel,
        plankBarrel,
        foodBarrel,
        cannons,
    };
}
```

---

## 5. Boarding Ladders & Interaction Positions

Boarding ladders are placed at amidships:
- `SHIP_LADDER_X = 5.4` (Gunwale width)
- `SHIP_LADDER_Z = 0.5` (Amidships cargo hatch)
- Interaction range: `LADDER_INTERACT_RADIUS = 3.8m`

Ladders allow seamless boarding from ocean water (`playerLocation = "water"`) onto the ship's deck (`playerLocation = "ship"`).
