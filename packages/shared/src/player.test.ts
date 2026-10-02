import { describe, it, expect } from "vitest";
import {
    createPlayerHotbarState,
    createShipSuppliesState,
    damagePlayer,
    healPlayer,
    respawnPlayer,
    selectHotbarSlot,
    takePlanksFromBarrel,
    storePlanksInBarrel,
    eatFood,
    takeFoodFromBarrel,
    storeFoodInBarrel,
    getHotbarItemType,
    stepPlayerStamina,
} from "./player.js";
import {
    PLAYER_MAX_HEALTH,
    CANNONBALL_PLAYER_DAMAGE,
    PLAYER_MAX_PLANKS,
    PLANK_BARREL_START,
} from "./constants.js";

describe("Player Health & Hotbar Inventory", () => {
    it("initializes player with 100 HP and default slots", () => {
        const p = createPlayerHotbarState();
        expect(p.health).toBe(PLAYER_MAX_HEALTH);
        expect(p.isDead).toBe(false);
        expect(p.selectedSlot).toBe(0);
        expect(getHotbarItemType(p.selectedSlot)).toBe("cannonball");
    });

    it("cannon hit deals 30% of total health damage", () => {
        const p = createPlayerHotbarState();
        const res = damagePlayer(p, CANNONBALL_PLAYER_DAMAGE);
        expect(res.tookDamage).toBe(true);
        expect(res.died).toBe(false);
        expect(p.health).toBe(70);

        // 3 more hits kill the player
        damagePlayer(p, CANNONBALL_PLAYER_DAMAGE); // 40
        damagePlayer(p, CANNONBALL_PLAYER_DAMAGE); // 10
        const deathRes = damagePlayer(p, CANNONBALL_PLAYER_DAMAGE); // 0 -> dead
        expect(deathRes.died).toBe(true);
        expect(p.isDead).toBe(true);
        expect(p.health).toBe(0);

        // Respawn restores health
        respawnPlayer(p);
        expect(p.health).toBe(PLAYER_MAX_HEALTH);
        expect(p.isDead).toBe(false);
    });

    it("heals player up to max health", () => {
        const p = createPlayerHotbarState();
        damagePlayer(p, 50);
        expect(p.health).toBe(50);
        healPlayer(p, 30);
        expect(p.health).toBe(80);
        healPlayer(p, 50);
        expect(p.health).toBe(PLAYER_MAX_HEALTH);
    });

    it("allows selecting hotbar slots 0 to 4", () => {
        const p = createPlayerHotbarState();
        selectHotbarSlot(p, 1);
        expect(p.selectedSlot).toBe(1);
        expect(getHotbarItemType(p.selectedSlot)).toBe("hammer");

        selectHotbarSlot(p, 2);
        expect(getHotbarItemType(p.selectedSlot)).toBe("plank");

        selectHotbarSlot(p, 3);
        expect(getHotbarItemType(p.selectedSlot)).toBe("bucket");

        selectHotbarSlot(p, 4);
        expect(getHotbarItemType(p.selectedSlot)).toBe("banana");

        selectHotbarSlot(p, 5);
        expect(getHotbarItemType(p.selectedSlot)).toBe("spyglass");
    });

    it("takes planks from supply barrel up to player carry limit", () => {
        const p = createPlayerHotbarState();
        const s = createShipSuppliesState();
        p.planksCarried = 0;
        expect(s.planksInBarrel).toBe(PLANK_BARREL_START);

        const taken = takePlanksFromBarrel(p, s, 3);
        expect(taken).toBe(3);
        expect(p.planksCarried).toBe(3);
        expect(s.planksInBarrel).toBe(PLANK_BARREL_START - 3);

        // Cannot exceed PLAYER_MAX_PLANKS (5)
        const taken2 = takePlanksFromBarrel(p, s, 10);
        expect(taken2).toBe(PLAYER_MAX_PLANKS - 3);
        expect(p.planksCarried).toBe(PLAYER_MAX_PLANKS);

        // Store back in barrel
        const stored = storePlanksInBarrel(p, s, 2);
        expect(stored).toBe(2);
        expect(p.planksCarried).toBe(PLAYER_MAX_PLANKS - 2);
    });

    it("eats food (banana) to restore player health", () => {
        const p = createPlayerHotbarState();
        p.foodCarried = 3;
        damagePlayer(p, 60);
        expect(p.health).toBe(40);

        // Eat 1 banana (restores 35 HP)
        const res = eatFood(p, 35);
        expect(res.ate).toBe(true);
        expect(res.healed).toBe(35);
        expect(p.health).toBe(75);
        expect(p.foodCarried).toBe(2);

        // Eat another banana (capped at maxHealth 100)
        const res2 = eatFood(p, 35);
        expect(res2.ate).toBe(true);
        expect(res2.healed).toBe(25);
        expect(p.health).toBe(100);
        expect(p.foodCarried).toBe(1);

        // Full health: cannot eat
        const res3 = eatFood(p, 35);
        expect(res3.ate).toBe(false);
        expect(p.foodCarried).toBe(1);

        // Out of food: cannot eat
        p.foodCarried = 0;
        damagePlayer(p, 30);
        const res4 = eatFood(p, 35);
        expect(res4.ate).toBe(false);
    });

    it("takes and stores food in provisions barrel", () => {
        const p = createPlayerHotbarState();
        const s = createShipSuppliesState();
        p.foodCarried = 0;
        expect(s.foodInBarrel).toBe(15);

        const taken = takeFoodFromBarrel(p, s, 2);
        expect(taken).toBe(2);
        expect(p.foodCarried).toBe(2);
        expect(s.foodInBarrel).toBe(13);

        const stored = storeFoodInBarrel(p, s, 1);
        expect(stored).toBe(1);
        expect(p.foodCarried).toBe(1);
        expect(s.foodInBarrel).toBe(14);
    });

    it("handles stamina drain during sprinting and regeneration when resting", () => {
        const p = createPlayerHotbarState();
        expect(p.stamina).toBe(100);

        // Sprinting on land drains stamina
        const r1 = stepPlayerStamina(p, true, true, false, 1.0);
        expect(r1.isSprinting).toBe(true);
        expect(p.stamina).toBe(78); // 100 - 22

        // Sprint swimming drains at higher rate
        const r2 = stepPlayerStamina(p, true, true, true, 1.0);
        expect(r2.isSprinting).toBe(true);
        expect(p.stamina).toBe(50); // 78 - 28

        // Stopping sprint regenerates stamina
        const r3 = stepPlayerStamina(p, false, true, false, 1.0);
        expect(r3.isSprinting).toBe(false);
        expect(p.stamina).toBe(68); // 50 + 18

        // Exhaustion: drains to 0 stops sprint
        stepPlayerStamina(p, true, true, false, 5.0);
        expect(p.stamina).toBe(0);
        expect(p.isSprinting).toBe(false);
    });
});
