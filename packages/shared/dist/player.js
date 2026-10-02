/**
 * Player health, hotbar inventory, and ship supply interactions.
 * Pure math/sim logic - runs on both client and server.
 */
import { PLAYER_MAX_HEALTH, CANNONBALL_PLAYER_DAMAGE, PLAYER_MAX_PLANKS, PLANK_BARREL_CAPACITY, PLANK_BARREL_START, FOOD_HEAL_AMOUNT, PLAYER_MAX_FOOD, PLAYER_START_FOOD, FOOD_BARREL_CAPACITY, FOOD_BARREL_START, HOTBAR_SLOT_COUNT, PLAYER_MAX_STAMINA, STAMINA_DRAIN_RUN, STAMINA_DRAIN_SWIM, STAMINA_RECOVERY_RATE, } from "./constants.js";
export const HOTBAR_ITEMS = [
    "cannonball",
    "hammer",
    "plank",
    "bucket",
    "banana",
    "spyglass",
];
export function createPlayerHotbarState() {
    return {
        health: PLAYER_MAX_HEALTH,
        maxHealth: PLAYER_MAX_HEALTH,
        stamina: PLAYER_MAX_STAMINA,
        maxStamina: PLAYER_MAX_STAMINA,
        isSprinting: false,
        selectedSlot: 0, // Starts on cannonball
        planksCarried: 2, // Starts with 2 planks ready
        foodCarried: PLAYER_START_FOOD, // Starts with 3 bananas ready
        isDead: false,
        respawnTimer: 0,
    };
}
export function createShipSuppliesState() {
    return {
        planksInBarrel: PLANK_BARREL_START,
        maxPlanksInBarrel: PLANK_BARREL_CAPACITY,
        foodInBarrel: FOOD_BARREL_START,
        maxFoodInBarrel: FOOD_BARREL_CAPACITY,
    };
}
export function getHotbarItemType(slotIndex) {
    const idx = Math.max(0, Math.min(HOTBAR_SLOT_COUNT - 1, slotIndex));
    return HOTBAR_ITEMS[idx];
}
export function selectHotbarSlot(player, slotIndex) {
    if (slotIndex >= 0 && slotIndex < HOTBAR_SLOT_COUNT) {
        player.selectedSlot = slotIndex;
    }
}
/**
 * Inflicts damage on the player.
 * A cannonball hit deals CANNONBALL_PLAYER_DAMAGE (30% of total health).
 */
export function damagePlayer(player, amount = CANNONBALL_PLAYER_DAMAGE) {
    if (player.isDead)
        return { tookDamage: false, died: false };
    player.health = Math.max(0, player.health - amount);
    if (player.health <= 0) {
        player.isDead = true;
        player.respawnTimer = 3.0; // 3 seconds to respawn
        return { tookDamage: true, died: true };
    }
    return { tookDamage: true, died: false };
}
export function healPlayer(player, amount) {
    if (player.isDead)
        return;
    player.health = Math.min(player.maxHealth, player.health + amount);
}
export function respawnPlayer(player) {
    player.health = player.maxHealth;
    player.stamina = player.maxStamina;
    player.isSprinting = false;
    player.isDead = false;
    player.respawnTimer = 0;
    if (player.foodCarried < 2)
        player.foodCarried = 2;
}
/**
 * Updates player stamina based on movement activity and sprint state.
 * Consumes stamina while sprinting (drain depends on swim vs land run).
 * Passively regenerates stamina when not sprinting.
 */
export function stepPlayerStamina(player, isSprintingRequested, isMoving, isSwimming, dt) {
    if (player.isDead) {
        player.isSprinting = false;
        return { isSprinting: false, canSprint: false };
    }
    const drainRate = isSwimming ? STAMINA_DRAIN_SWIM : STAMINA_DRAIN_RUN;
    if (isSprintingRequested && isMoving && player.stamina > 0) {
        // Actively sprinting: consume stamina pool
        player.isSprinting = true;
        player.stamina = Math.max(0, player.stamina - drainRate * dt);
        if (player.stamina <= 0) {
            player.isSprinting = false;
        }
    }
    else {
        // Not sprinting: regenerate stamina up to maximum
        player.isSprinting = false;
        player.stamina = Math.min(player.maxStamina, player.stamina + STAMINA_RECOVERY_RATE * dt);
    }
    return {
        isSprinting: player.isSprinting,
        canSprint: player.stamina > 0,
    };
}
/**
 * Eats a food item (banana) from player inventory to restore health.
 * Restores healAmount (default 35 HP, capped at player.maxHealth).
 */
export function eatFood(player, healAmount = FOOD_HEAL_AMOUNT) {
    if (player.isDead || player.foodCarried <= 0) {
        return { ate: false, healed: 0 };
    }
    if (player.health >= player.maxHealth) {
        return { ate: false, healed: 0 };
    }
    const prevHp = player.health;
    player.health = Math.min(player.maxHealth, player.health + healAmount);
    player.foodCarried = Math.max(0, player.foodCarried - 1);
    return { ate: true, healed: player.health - prevHp };
}
/**
 * Takes bananas from the ship's provisions/food barrel into player's inventory.
 */
export function takeFoodFromBarrel(player, supplies, count = 1) {
    if (supplies.foodInBarrel <= 0 || player.foodCarried >= PLAYER_MAX_FOOD) {
        return 0;
    }
    const needed = PLAYER_MAX_FOOD - player.foodCarried;
    const canTake = Math.min(count, Math.min(supplies.foodInBarrel, needed));
    supplies.foodInBarrel -= canTake;
    player.foodCarried += canTake;
    return canTake;
}
/**
 * Stores bananas back into the ship's provisions/food barrel.
 */
export function storeFoodInBarrel(player, supplies, count = 1) {
    if (player.foodCarried <= 0 || supplies.foodInBarrel >= supplies.maxFoodInBarrel) {
        return 0;
    }
    const space = supplies.maxFoodInBarrel - supplies.foodInBarrel;
    const canStore = Math.min(count, Math.min(player.foodCarried, space));
    player.foodCarried -= canStore;
    supplies.foodInBarrel += canStore;
    return canStore;
}
/**
 * Takes planks from the ship's plank barrel into the player's carried inventory.
 */
export function takePlanksFromBarrel(player, supplies, count = 1) {
    if (supplies.planksInBarrel <= 0 || player.planksCarried >= PLAYER_MAX_PLANKS) {
        return 0;
    }
    const needed = PLAYER_MAX_PLANKS - player.planksCarried;
    const canTake = Math.min(count, Math.min(supplies.planksInBarrel, needed));
    supplies.planksInBarrel -= canTake;
    player.planksCarried += canTake;
    return canTake;
}
/**
 * Stores carried planks back into the ship's plank barrel.
 */
export function storePlanksInBarrel(player, supplies, count = 1) {
    if (player.planksCarried <= 0 || supplies.planksInBarrel >= supplies.maxPlanksInBarrel) {
        return 0;
    }
    const space = supplies.maxPlanksInBarrel - supplies.planksInBarrel;
    const canStore = Math.min(count, Math.min(player.planksCarried, space));
    player.planksCarried -= canStore;
    supplies.planksInBarrel += canStore;
    return canStore;
}
