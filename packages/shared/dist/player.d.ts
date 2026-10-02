/**
 * Player health, hotbar inventory, and ship supply interactions.
 * Pure math/sim logic - runs on both client and server.
 */
export type HotbarItemType = "cannonball" | "hammer" | "plank" | "bucket" | "banana" | "spyglass";
export declare const HOTBAR_ITEMS: readonly HotbarItemType[];
export interface PlayerHotbarState {
    health: number;
    maxHealth: number;
    stamina: number;
    maxStamina: number;
    isSprinting: boolean;
    selectedSlot: number;
    planksCarried: number;
    foodCarried: number;
    isDead: boolean;
    respawnTimer: number;
}
export interface ShipSuppliesState {
    planksInBarrel: number;
    maxPlanksInBarrel: number;
    foodInBarrel: number;
    maxFoodInBarrel: number;
}
export declare function createPlayerHotbarState(): PlayerHotbarState;
export declare function createShipSuppliesState(): ShipSuppliesState;
export declare function getHotbarItemType(slotIndex: number): HotbarItemType;
export declare function selectHotbarSlot(player: PlayerHotbarState, slotIndex: number): void;
/**
 * Inflicts damage on the player.
 * A cannonball hit deals CANNONBALL_PLAYER_DAMAGE (30% of total health).
 */
export declare function damagePlayer(player: PlayerHotbarState, amount?: number): {
    tookDamage: boolean;
    died: boolean;
};
export declare function healPlayer(player: PlayerHotbarState, amount: number): void;
export declare function respawnPlayer(player: PlayerHotbarState): void;
/**
 * Updates player stamina based on movement activity and sprint state.
 * Consumes stamina while sprinting (drain depends on swim vs land run).
 * Passively regenerates stamina when not sprinting.
 */
export declare function stepPlayerStamina(player: PlayerHotbarState, isSprintingRequested: boolean, isMoving: boolean, isSwimming: boolean, dt: number): {
    isSprinting: boolean;
    canSprint: boolean;
};
/**
 * Eats a food item (banana) from player inventory to restore health.
 * Restores healAmount (default 35 HP, capped at player.maxHealth).
 */
export declare function eatFood(player: PlayerHotbarState, healAmount?: number): {
    ate: boolean;
    healed: number;
};
/**
 * Takes bananas from the ship's provisions/food barrel into player's inventory.
 */
export declare function takeFoodFromBarrel(player: PlayerHotbarState, supplies: ShipSuppliesState, count?: number): number;
/**
 * Stores bananas back into the ship's provisions/food barrel.
 */
export declare function storeFoodInBarrel(player: PlayerHotbarState, supplies: ShipSuppliesState, count?: number): number;
/**
 * Takes planks from the ship's plank barrel into the player's carried inventory.
 */
export declare function takePlanksFromBarrel(player: PlayerHotbarState, supplies: ShipSuppliesState, count?: number): number;
/**
 * Stores carried planks back into the ship's plank barrel.
 */
export declare function storePlanksInBarrel(player: PlayerHotbarState, supplies: ShipSuppliesState, count?: number): number;
