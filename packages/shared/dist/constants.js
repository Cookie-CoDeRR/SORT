export const WAVE_PARAMS = [
    { steepness: 0.15, amplitude: 1.0, direction: { x: 1.0, z: 0.0 }, wavelength: 40 },
    { steepness: 0.15, amplitude: 0.5, direction: { x: 0.7, z: 0.7 }, wavelength: 20 },
    { steepness: 0.15, amplitude: 0.25, direction: { x: -0.2, z: 0.8 }, wavelength: 10 },
    { steepness: 0.1, amplitude: 0.1, direction: { x: 0.5, z: -0.5 }, wavelength: 4 }
];
// ── Ship physics ─────────────────────────────────────────────────────────────
export const SHIP_MAX_SPEED = 9;
export const SHIP_ACCEL_TIME = 12;
export const SHIP_TURN_RATE = 0.21;
// ── Cannon & projectile ───────────────────────────────────────────────────────
export const CANNON_MUZZLE_SPEED = 70;
export const CANNON_GRAVITY = 14;
export const CANNON_RELOAD_TIME = 7;
export const CANNON_YAW_ARC = 70;
export const CANNON_PITCH_MIN = -5;
export const CANNON_PITCH_MAX = 30;
export const CANNON_COUNT_PER_SIDE = 3;
export const CANNONBALL_RADIUS = 0.18;
// Cannon positions in ship-local space (must match shipBuilder.ts)
export const CANNON_LOCAL_X = 4.3; // outboard offset (for 11m wide hull)
export const CANNON_LOCAL_Y = 4.6; // deck height + carriage height
export const CANNON_SIDE_INSET_X = 3.2; // player stand position (inboard)
// ── Per-cannon ammo system ────────────────────────────────────────────────────
export const CANNON_STACK_SIZE = 16; // balls per stack
export const BARREL_STACK_CAPACITY = 20; // stacks max in the central barrel
export const BARREL_START_STACKS = 16; // starting stacks in barrel (room for deposit)
export const PLAYER_MAX_STACKS = 2; // stacks a player can carry
export const CANNON_START_AMMO = 16; // starting ammo in each cannon (1 stack loaded, ready to fire)
export const AMMO_START = 12; // legacy, kept for compat
export const CANNON_MAX_LEVEL = 3; // max cannon level (1: Bronze, 2: Silver, 3: Gold)
export const CANNON_XP_PER_LEVEL = 3; // hits required to advance cannon level
// ── Damage & Flooding ─────────────────────────────────────────────────────────
export const SHIP_HALF_LENGTH = 16;
export const SHIP_HALF_WIDTH = 5;
export const SHIP_HALF_HEIGHT = 3.5;
export const SLOTS_PER_SIDE = 10;
export const DAMAGE_SLOT_RADIUS = 3.5;
export const LEAK_RATE_PER_SEVERITY = 0.01; // 1%/s per severity level (level 3 = 3%/s)
export const BAIL_RATE = 0.02; // 2%/s bailing rate
export const SINK_THRESHOLD = 1.0; // 100% waterLevel = sinking
export const PATCH_TIME = 2.0; // seconds to patch a slot with 1 plank
export const REPAIR_DURATION = 5.0; // seconds for repair animation
export const REPAIR_COOLDOWN = 5.0; // seconds anti-spam delay after repair
export const BUCKET_CAPACITY = 0.08; // 8% bilge water scooped per bucket (SoT mechanic)
export const BUCKET_COOLDOWN = 1.5; // seconds between bucket scoops / dumping
export const START_PLANKS = 6;
export const MAX_PLANKS = 20;
export const SINK_TIME = 10.0; // seconds sinking animation duration
export const MAX_BUOYANCY_OFFSET = 1.8; // meters ship lowers at 100% water
// ── Player Health, Food & Hotbar Inventory ────────────────────────────────────
export const PLAYER_MAX_HEALTH = 100;
export const CANNONBALL_PLAYER_DAMAGE = 30; // 30% of total health per hit
export const CANNONBALL_SPLASH_RADIUS = 4.5; // blast damage radius
export const PLANK_BARREL_CAPACITY = 20;
export const PLANK_BARREL_START = 15;
export const PLAYER_MAX_PLANKS = 5;
export const FOOD_HEAL_AMOUNT = 35; // HP restored per banana eaten
export const PLAYER_MAX_FOOD = 5; // max bananas carried
export const PLAYER_START_FOOD = 3; // starting bananas carried
export const FOOD_BARREL_CAPACITY = 20; // provisions barrel capacity
export const FOOD_BARREL_START = 15; // provisions barrel initial stock
export const HOTBAR_SLOT_COUNT = 6;
// ── AI Ship Constants ─────────────────────────────────────────────────────────
export const AI_DEFAULT_PATROL_RADIUS = 65; // meters radius for circular patrol
export const AI_PATROL_CENTER_X = 80; // default arena sector X
export const AI_PATROL_CENTER_Z = 0; // default arena sector Z
export const AI_COMBAT_ATTACK_RANGE = 220; // meters: NPC ship ceases attacking when target exceeds this distance
// ── Map & Island World Constants ──────────────────────────────────────────────
export const MAP_RADIUS = 3500; // 7000m across massive open-world sea
export const MAP_CENTER_X = 0;
export const MAP_CENTER_Z = 0;
export const DEFAULT_MAP_SEED = 1749; // deterministic default map seed
export const ISLAND_COUNT_DEFAULT = 16; // number of expansive archipelago islands
export const ROCK_HAZARD_COUNT_DEFAULT = 28; // crags and rock needles scattered across the sea
export const SHIP_COLLISION_RADIUS = 14.0; // effective hull collision radius (galleon 36m x 11m)
// ── Ship Ladder Boarding Constants ────────────────────────────────────────────
// Ladders on port (-X) and starboard (+X) amidships
export const SHIP_LADDER_X = 5.4; // along outer hull gunwale
export const SHIP_LADDER_Z = 0.5; // amidships near cargo hatch
export const SHIP_LADDER_TOP_Y = 4.2; // gunwale deck lip
export const SHIP_LADDER_BOTTOM_Y = -0.8; // extends down into ocean water
export const LADDER_INTERACT_RADIUS = 3.8; // interaction radius from ladder bottom/top
export const SWIM_SPEED = 8.5; // base swimming speed in water (increased from 5.2)
export const SPRINT_SWIM_SPEED = 14.0; // fast sprint swimming with shift
export const WALK_SPEED = 6.5; // base walking speed on land / deck
export const SPRINT_RUN_SPEED = 11.5; // fast sprinting speed with shift
export const WATERLINE_Y = 0.0; // ocean surface level
export const PLAYER_COLLISION_RADIUS = 0.5; // player collision radius
// ── Player Stamina & Sprinting ────────────────────────────────────────────────
export const PLAYER_MAX_STAMINA = 100; // max stamina pool
export const STAMINA_DRAIN_RUN = 22; // stamina drained per second of sprint running
export const STAMINA_DRAIN_SWIM = 28; // stamina drained per second of sprint swimming
export const STAMINA_RECOVERY_RATE = 18; // stamina recovered per second when not sprinting
export const STAMINA_EXHAUST_THRESHOLD = 8; // min stamina required to start sprinting again
