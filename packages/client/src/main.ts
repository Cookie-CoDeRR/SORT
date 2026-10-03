import {
    Engine, Scene, FreeCamera, Vector3, MeshBuilder,
    HemisphericLight, DirectionalLight, ShaderMaterial, Effect,
    TransformNode, Color3, Color4, StandardMaterial, Mesh, Matrix,
} from "@babylonjs/core";
import { Client } from "colyseus.js";
import {
    WAVE_PARAMS, heightAt, stepShip, ShipState, ShipInput,
    createCannonShipState, createPlayerAmmo, stepCannons, aimCannon, fireCannon,
    cannonLocalPos, CannonShipState, CannonState, PlayerAmmo,
    pickupFromBarrel, depositToBarrel, loadCannonFromPlayer, recordCannonHit,
    createProjectile, stepProjectile, sweptHit, makeShipBox, ProjectileState,
    CANNON_RELOAD_TIME, CANNON_STACK_SIZE, BARREL_STACK_CAPACITY,
    CANNON_GRAVITY, CANNON_MUZZLE_SPEED, DEG,
    createShipDamageState, applyDamageHit, calcInflowRate, stepShipDamage,
    patchDamageSlot, calcBuoyancyOffset, calcSpeedMultiplier, calcTurnMultiplier,
    ShipDamageState, DamageSlot,
    REPAIR_DURATION, REPAIR_COOLDOWN, BUCKET_CAPACITY, BUCKET_COOLDOWN,
    createPlayerHotbarState, createShipSuppliesState, damagePlayer,
    respawnPlayer, selectHotbarSlot, takePlanksFromBarrel, storePlanksInBarrel,
    eatFood, takeFoodFromBarrel, storeFoodInBarrel,
    getHotbarItemType, PlayerHotbarState, ShipSuppliesState,
    CANNONBALL_PLAYER_DAMAGE, CANNONBALL_SPLASH_RADIUS,
    stepCirclePatrolAi,
    generateWorldMap, DEFAULT_MAP_SEED, WorldMap,
    getTerrainHeight, SHIP_LADDER_X, SHIP_LADDER_Z,
    LADDER_INTERACT_RADIUS, SWIM_SPEED, SPRINT_SWIM_SPEED, WALK_SPEED, SPRINT_RUN_SPEED,
    WATERLINE_Y, AI_COMBAT_ATTACK_RANGE, stepPlayerStamina, CANNONBALL_RADIUS,
    SHIP_COLLISION_RADIUS,
} from "@corsair/shared";
import {
    buildProceduralShip, getDeckY, ShipHandles,
    POOP_DECK_Y, MAIN_DECK_Y, buildPirateCharacter,
} from "./shipBuilder.js";

import {
    resumeAudio, toggleAudioMute,
    playCannonFire, playHullImpact, playWaterSplash,
    playHammerStrike, playRepairComplete, playPlankPlacement,
    playBucketScoop, playBucketDumpOverboard, playBucketSpillInside,
    playShipCollision, playPlankPickup, playAmmoPickup,
    playItemSwitch, playCannonReload,
    playEatBite, playEatGulp, playFoodPickup,
    playLadderClimb, playWaterJump,
} from "./soundEngine.js";

import { DialogueUI } from "./story/DialogueUI.js";
import { ObjectiveUI } from "./story/ObjectiveUI.js";
import { StoryDebugPanel } from "./story/DebugPanel.js";
import { CutscenePlayer } from "./story/CutscenePlayer.js";
import { WeatherRenderer } from "./render/Weather.js";
import { NpcView } from "./render/NpcView.js";
import { KrakenView } from "./render/KrakenView.js";
import {
    createDefaultWeatherState, stepWeather,
    createDefaultNpcCrew, stepNpcCrew,
    createDefaultKrakenBoss, stepKrakenBoss, testCannonballTentacleHit,
    WeatherState, KrakenBossState
} from "@corsair/shared";
import { SceneryBuilder } from "./render/SceneryBuilder.js";
import chapterBeatsData from "@corsair/shared/src/content/chapter1.beats.json" with { type: "json" };
import chapterDialogueData from "@corsair/shared/src/content/chapter1.dialogue.json" with { type: "json" };
import chapterCutscenesData from "@corsair/shared/src/content/chapter1.cutscenes.json" with { type: "json" };
import chapterLevelData from "@corsair/shared/src/content/chapter1.level.json" with { type: "json" };
import { getLevelColliders, ChapterLevel, ChapterBeats, ChapterCutscenes, ChapterDialogue } from "@corsair/shared";


// ─── CSS ────────────────────────────────────────────────────────────────────
document.head.insertAdjacentHTML("beforeend", `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Pirata+One&family=IM+Fell+English:ital@0;1&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{overflow:hidden;background:#06080b;font-family:'Cinzel',serif;user-select:none}
  #renderCanvas{width:100vw;height:100vh;display:block;outline:none}

  /* Crosshairs */
  #crosshair{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:22px;height:22px;pointer-events:none;opacity:1;transition:opacity .2s}
  #crosshair.hidden{opacity:0}
  #crosshair::before,#crosshair::after{content:'';position:absolute;background:rgba(212,175,55,0.85);border-radius:1px}
  #crosshair::before{width:2px;height:100%;left:50%;transform:translateX(-50%)}
  #crosshair::after{height:2px;width:100%;top:50%;transform:translateY(-50%)}

  #cannon-xhair{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;opacity:0;transition:opacity .2s;display:flex;align-items:center;justify-content:center}
  #cannon-xhair.visible{opacity:1}
  .cxh-ring{width:56px;height:56px;border:2px solid #c5a059;border-radius:50%;position:relative;box-shadow:0 0 16px rgba(0,0,0,0.8),inset 0 0 10px rgba(197,160,89,0.3)}
  .cxh-ring::before,.cxh-ring::after{content:'';position:absolute;background:#d4af37;border-radius:1px}
  .cxh-ring::before{width:2px;height:24px;left:50%;top:50%;transform:translate(-50%,-50%)}
  .cxh-ring::after{height:2px;width:24px;top:50%;left:50%;transform:translate(-50%,-50%)}
  .cxh-dot{position:absolute;width:6px;height:6px;background:#e5c158;border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:0 0 8px #d4af37}

  /* Top bar */
  #topbar{position:absolute;top:0;left:0;right:0;height:54px;background:linear-gradient(180deg,rgba(16,12,8,0.95) 0%,rgba(16,12,8,0) 100%);display:flex;align-items:center;justify-content:center;pointer-events:none;gap:45px;padding:0 24px}
  .topstat{display:flex;flex-direction:column;align-items:center}
  .tslabel{font-family:'Cinzel',serif;font-size:9px;letter-spacing:3px;color:rgba(197,160,89,0.65);text-transform:uppercase}
  .tsval{font-family:'Cinzel',serif;font-size:14px;font-weight:700;color:#f4ebd9;text-shadow:0 2px 6px rgba(0,0,0,0.9)}
  #gtitle{font-family:'Pirata One',cursive;font-size:22px;letter-spacing:4px;color:#d4af37;text-shadow:0 2px 8px rgba(0,0,0,0.95);margin:0 20px}

  /* Speedometer */
  #speedo{position:absolute;bottom:54px;left:24px;display:flex;align-items:flex-end;gap:6px;pointer-events:none}
  #speedo-val{font-family:'Pirata One',cursive;font-size:38px;font-weight:700;color:#f4ebd9;line-height:1;text-shadow:0 2px 10px rgba(0,0,0,0.9)}
  #speedo-unit{font-family:'Cinzel',serif;font-size:12px;font-weight:700;color:#c5a059;margin-bottom:6px;letter-spacing:1px}
  #spbar-wrap{position:absolute;bottom:42px;left:24px;width:125px}
  #spbar-bg{height:5px;background:rgba(28,20,14,0.85);border:1px solid rgba(197,160,89,0.4);border-radius:2px;overflow:hidden}
  #spbar-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,#9a3412,#d4af37);transition:width .3s cubic-bezier(.4,0,.2,1);width:0%}

  /* Compass */
  #compass-wrap{position:absolute;bottom:42px;left:50%;transform:translateX(-50%);pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:4px}
  #compass-dial{width:240px;height:34px;border-radius:4px;overflow:hidden;position:relative;background:linear-gradient(180deg,rgba(26,20,15,0.95) 0%,rgba(14,10,7,0.95) 100%);border:1.5px solid #c5a059;box-shadow:0 4px 20px rgba(0,0,0,0.85),inset 0 0 10px rgba(0,0,0,0.7)}
  #compass-tape{position:absolute;white-space:nowrap;top:50%;transform:translateY(-50%);font-family:'Cinzel',serif;font-size:11px;font-weight:700;letter-spacing:4px;color:#d4af37}
  #compass-marker{position:absolute;left:50%;top:0;bottom:0;width:2px;background:#e5c158;transform:translateX(-50%);box-shadow:0 0 6px #d4af37}
  #compass-waypoint-pip{position:absolute;top:2px;width:8px;height:8px;background:#fbbf24;border-radius:50%;transform:translateX(-50%);box-shadow:0 0 8px #fbbf24;display:none}
  #compass-sub{display:flex;gap:14px;align-items:center}
  #hdg-val{font-family:'Cinzel',serif;font-size:10px;font-weight:700;color:#c5a059;letter-spacing:2px}
  #wp-dist-val{font-family:'Cinzel',serif;font-size:10px;color:#f4ebd9;letter-spacing:1px;font-weight:700}

  /* Sail */
  #sail-wrap{position:absolute;bottom:42px;right:24px;display:flex;align-items:center;gap:10px;pointer-events:none}
  #sail-label{font-family:'Cinzel',serif;font-size:9px;font-weight:700;letter-spacing:2px;color:#c5a059;text-align:right}
  #sail-bars{display:flex;align-items:flex-end;gap:3px;height:36px}
  .sail-seg{width:12px;border-radius:2px;background:rgba(28,20,14,0.6);border:1px solid rgba(197,160,89,0.3);transition:background .3s,border-color .3s}
  .sail-seg.active{background:linear-gradient(180deg,#d4af37,#92400e);border-color:#e5c158;box-shadow:0 0 10px rgba(212,175,55,0.4)}

  /* Central Ammo Barrel HUD */
  #barrel-hud{position:absolute;top:64px;right:24px;pointer-events:none;background:linear-gradient(180deg,rgba(26,20,15,0.92) 0%,rgba(14,10,7,0.95) 100%);border:1.5px solid #c5a059;border-radius:4px;padding:8px 14px;display:flex;align-items:center;gap:12px;box-shadow:0 4px 20px rgba(0,0,0,0.8)}
  .bh-icon{font-size:22px;line-height:1}
  .bh-info{display:flex;flex-direction:column}
  .bh-title{font-family:'Cinzel',serif;font-size:9px;font-weight:700;letter-spacing:2px;color:#c5a059;text-transform:uppercase}
  .bh-val{font-family:'Cinzel',serif;font-size:14px;font-weight:700;color:#f4ebd9}
  .bh-sub{font-size:10px;color:rgba(244,235,217,0.6)}

  /* Player Carried Ammo HUD */
  #player-ammo{position:absolute;bottom:94px;left:24px;pointer-events:none;background:linear-gradient(180deg,rgba(26,20,15,0.92) 0%,rgba(14,10,7,0.95) 100%);border:1.5px solid #c5a059;border-radius:4px;padding:8px 12px;display:flex;flex-direction:column;gap:6px}
  #pa-header{display:flex;justify-content:space-between;align-items:center}
  #pa-label{font-family:'Cinzel',serif;font-size:9px;font-weight:700;letter-spacing:2px;color:#c5a059;text-transform:uppercase}
  #pa-total{font-family:'Cinzel',serif;font-size:10px;color:rgba(244,235,217,0.6)}
  #pa-slots{display:flex;gap:8px}
  .pa-slot{border:1px solid rgba(197,160,89,0.3);background:rgba(10,8,6,0.6);border-radius:3px;padding:4px 6px;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:68px}
  .pa-slot-title{font-family:'Cinzel',serif;font-size:8px;color:#c5a059;letter-spacing:1px}
  .pa-slot-count{font-family:'Cinzel',serif;font-size:11px;font-weight:700;color:#f4ebd9}
  .pa-pips{display:flex;gap:2px;flex-wrap:wrap;width:48px;justify-content:center}
  .pa-pip{width:4px;height:4px;border-radius:50%;background:#d4af37;box-shadow:0 0 3px #d4af37}
  .pa-pip.empty{background:rgba(244,235,217,0.15);box-shadow:none}

  /* Cannon Station HUD (Overlay while manning) */
  #cannon-station-hud{position:absolute;bottom:80px;left:50%;transform:translateX(-50%);pointer-events:none;opacity:0;transition:opacity .25s;display:flex;flex-direction:column;align-items:center;gap:8px;min-width:320px}
  #cannon-station-hud.visible{opacity:1}
  .csh-header{background:linear-gradient(180deg,rgba(26,20,15,0.95) 0%,rgba(14,10,7,0.96) 100%);border:1.5px solid #c5a059;border-radius:4px;padding:4px 18px;display:flex;align-items:center;gap:12px}
  .csh-badge{font-family:'Pirata One',cursive;font-size:14px;letter-spacing:2px;color:#d4af37;text-transform:uppercase}
  .csh-level{font-family:'Cinzel',serif;font-size:10px;font-weight:700;color:#e5c158;letter-spacing:1px}
  .csh-body{background:linear-gradient(180deg,rgba(24,18,14,0.96) 0%,rgba(14,10,7,0.98) 100%);border:1.5px solid #c5a059;border-radius:4px;padding:8px 20px;display:flex;flex-direction:column;align-items:center;gap:6px;box-shadow:0 6px 25px rgba(0,0,0,0.8)}
  .csh-ammo-label{font-family:'Cinzel',serif;font-size:9px;font-weight:700;letter-spacing:2px;color:#c5a059;text-transform:uppercase}
  .csh-ammo-row{display:flex;gap:4px;align-items:center}
  .csh-ammo-pip{width:8px;height:14px;border-radius:2px;background:linear-gradient(180deg,#fbbf24,#92400e);box-shadow:0 0 4px rgba(212,175,55,0.5);transition:all .15s}
  .csh-ammo-pip.empty{background:rgba(244,235,217,0.12);box-shadow:none}
  .csh-status{font-family:'Cinzel',serif;font-size:12px;font-weight:700;letter-spacing:2px;color:#f4ebd9}
  .csh-status.ready{color:#4ade80;text-shadow:0 0 10px rgba(74,222,128,0.5)}
  .csh-status.reloading{color:#fbbf24;text-shadow:0 0 10px rgba(251,191,36,0.5)}
  .csh-status.empty{color:#ef4444;text-shadow:0 0 10px rgba(239,68,68,0.5)}
  .csh-rl-bar{width:160px;height:5px;background:rgba(28,20,14,0.85);border:1px solid rgba(197,160,89,0.3);border-radius:2px;overflow:hidden;margin-top:2px}
  .csh-rl-fill{height:100%;background:linear-gradient(90deg,#92400e,#d4af37);width:0%;transition:width .05s linear}
  .csh-hints{font-size:11px;color:rgba(244,235,217,0.55);letter-spacing:1px}

  /* Interaction Prompt Toast */
  #interact-prompt{position:absolute;bottom:24px;left:50%;transform:translateX(-50%) translateY(10px);pointer-events:none;opacity:0;transition:opacity .25s,transform .25s;display:flex;align-items:center;gap:10px;background:linear-gradient(180deg,rgba(26,20,15,0.95) 0%,rgba(14,10,7,0.98) 100%);border:1.5px solid #c5a059;border-radius:4px;padding:6px 20px;box-shadow:0 4px 20px rgba(0,0,0,0.8)}
  #interact-prompt.visible{opacity:1;transform:translateX(-50%) translateY(0)}
  .ip-key{width:26px;height:26px;border-radius:3px;border:1px solid #c5a059;background:rgba(40,28,20,0.8);font-family:'Cinzel',serif;font-size:12px;font-weight:900;color:#d4af37;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.6)}
  .ip-text{font-size:13px;font-weight:700;color:#f4ebd9;letter-spacing:1.5px;text-transform:uppercase}

  /* Level Up Banner */
  #levelup-banner{position:absolute;top:75px;left:50%;transform:translateX(-50%) scale(0.9);pointer-events:none;opacity:0;transition:all .35s cubic-bezier(.34,1.56,.64,1);background:linear-gradient(180deg,rgba(36,26,18,0.98) 0%,rgba(16,12,8,0.98) 100%);border:2px solid #d4af37;padding:10px 28px;border-radius:4px;box-shadow:0 0 35px rgba(212,175,55,0.6);display:flex;align-items:center;gap:12px;z-index:99}
  #levelup-banner.show{opacity:1;transform:translateX(-50%) scale(1)}
  .lub-text{font-family:'Pirata One',cursive;font-size:18px;color:#d4af37;letter-spacing:2px;text-transform:uppercase;text-shadow:0 2px 8px rgba(0,0,0,0.8)}

  /* Notification Toast */
  #game-toast{position:absolute;top:118px;left:50%;transform:translateX(-50%) translateY(-10px);pointer-events:none;opacity:0;transition:all .25s cubic-bezier(.34,1.56,.64,1);background:linear-gradient(180deg,rgba(26,20,15,0.96) 0%,rgba(14,10,7,0.98) 100%);border:1.5px solid #c5a059;border-radius:4px;padding:8px 24px;font-family:'Cinzel',serif;font-size:12px;font-weight:700;color:#f4ebd9;letter-spacing:1px;box-shadow:0 6px 25px rgba(0,0,0,0.8);z-index:90}
  #game-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
  #game-toast.warning{border-color:#b91c1c;color:#fecaca}
  #game-toast.success{border-color:#15803d;color:#bbf7d0}

  /* Station overlays */
  .soverlay{position:absolute;top:60px;left:50%;transform:translateX(-50%);pointer-events:none;opacity:0;transition:opacity .3s;display:flex;flex-direction:column;align-items:center;gap:4px}
  .soverlay.visible{opacity:1}
  .so-title{font-family:'Cinzel',serif;font-size:13px;font-weight:900;letter-spacing:4px;text-transform:uppercase}
  .so-hint{font-family:'Cinzel',serif;font-size:11px;color:rgba(244,235,217,0.6);letter-spacing:1px}
  #helm-ov .so-title{color:#d4af37}

  /* Hit flash */
  #hflash{position:absolute;inset:0;pointer-events:none;background:rgba(255,60,0,0);transition:background .05s}
  #fps{position:absolute;top:8px;right:14px;font-family:'Cinzel',serif;font-size:11px;color:rgba(197,160,89,0.4);pointer-events:none}
  #audio-btn{position:absolute;top:8px;right:64px;z-index:90;cursor:pointer;background:linear-gradient(180deg,rgba(26,20,15,0.9) 0%,rgba(14,10,7,0.95) 100%);border:1px solid #c5a059;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.6);transition:transform .1s,border-color .15s}
  #audio-btn:hover{transform:scale(1.1);border-color:#d4af37}

  /* Repair Progress Overlay */
  #repair-progress{position:absolute;bottom:160px;left:50%;transform:translateX(-50%);pointer-events:none;opacity:0;transition:opacity .2s;display:flex;flex-direction:column;align-items:center;gap:6px;z-index:95}
  #repair-progress.active{opacity:1}
  .rp-label{font-family:'Cinzel',serif;font-size:12px;font-weight:900;color:#d4af37;letter-spacing:2px;text-transform:uppercase;text-shadow:0 0 10px rgba(212,175,55,0.8)}
  .rp-bar-wrap{width:220px;height:8px;background:rgba(20,14,10,0.8);border-radius:2px;overflow:hidden;border:1px solid #c5a059}
  .rp-bar-fill{height:100%;background:linear-gradient(90deg,#9a3412,#d4af37);border-radius:2px;width:0%;transition:width .05s linear;box-shadow:0 0 8px rgba(212,175,55,0.6)}
  .rp-hint{font-family:'Cinzel',serif;font-size:10px;color:rgba(244,235,217,0.65);letter-spacing:1px}

  /* Bucket Out-of-Ship indicator */
  #bucket-aim-hint{position:absolute;top:42%;left:50%;transform:translateX(-50%);pointer-events:none;opacity:0;transition:opacity .2s;font-family:'Cinzel',serif;font-size:12px;font-weight:700;color:#d4af37;letter-spacing:2px;text-align:center;text-shadow:0 2px 6px rgba(0,0,0,0.9);z-index:94;padding:8px 22px;background:linear-gradient(180deg,rgba(26,20,15,0.95) 0%,rgba(14,10,7,0.98) 100%);border:1.5px solid #c5a059;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,0.8)}
  #bucket-aim-hint.show{opacity:1}
  #bucket-aim-hint.overboard{color:#4ade80;border-color:#15803d}
  #bucket-aim-hint.warning{color:#f87171;border-color:#b91c1c}
  .mc-slot.leak-alert{border-color:#ef4444!important;box-shadow:0 0 18px rgba(239,68,68,0.85),inset 0 0 10px rgba(239,68,68,0.3)!important;animation:leakSlotPulse 1s infinite alternate}
  @keyframes leakSlotPulse{0%{transform:scale(1.0)}100%{transform:scale(1.06)}}

  /* Player Health & Status Card (Top Left) */
  #player-hp-card{position:absolute;top:10px;left:24px;display:flex;align-items:center;gap:12px;background:linear-gradient(180deg,rgba(26,20,15,0.95) 0%,rgba(14,10,7,0.98) 100%);border:1.5px solid #c5a059;border-radius:4px;padding:6px 16px;box-shadow:0 4px 20px rgba(0,0,0,0.8);z-index:80}
  .hp-icon{font-size:18px}
  .hp-info{display:flex;flex-direction:column;gap:3px}
  .hp-label-row{display:flex;justify-content:space-between;align-items:center;width:140px}
  .hp-title{font-family:'Cinzel',serif;font-size:9px;font-weight:700;color:#c5a059;letter-spacing:1px;text-transform:uppercase}
  .hp-val{font-family:'Cinzel',serif;font-size:11px;font-weight:700;color:#f4ebd9}
  .hp-bar-wrap{width:140px;height:6px;background:rgba(20,14,10,0.8);border:1px solid rgba(197,160,89,0.3);border-radius:2px;overflow:hidden}
  .hp-fill{height:100%;background:linear-gradient(90deg,#991b1b,#ef4444);width:100%;transition:width .2s ease}
  .stamina-fill{height:100%;background:linear-gradient(90deg,#92400e,#d4af37);width:100%;transition:width .1s ease}
  .hp-planks-pill{font-family:'Cinzel',serif;font-size:9px;font-weight:700;color:#fde047;background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.4);border-radius:2px;padding:3px 10px;letter-spacing:1px}
  .hp-food-pill{font-family:'Cinzel',serif;font-size:9px;font-weight:700;color:#86efac;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);border-radius:2px;padding:3px 10px;letter-spacing:1px}

  /* Damage & Heal Vignette */
  #damage-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center, transparent 40%, rgba(220,38,38,0.7) 100%);opacity:0;transition:opacity .15s ease-out;z-index:95}
  #damage-vignette.hurt{opacity:1;background:radial-gradient(ellipse at center, transparent 40%, rgba(220,38,38,0.7) 100%)}
  #damage-vignette.heal{opacity:0.85;background:radial-gradient(ellipse at center, transparent 35%, rgba(34,197,94,0.65) 100%)}

  /* Minimap Radar Card (Bottom Right, above sail) */
  #minimap-card{position:absolute;bottom:96px;right:24px;width:150px;height:150px;border-radius:50%;background:rgba(14,10,7,0.92);border:3px solid #c5a059;box-shadow:0 6px 25px rgba(0,0,0,0.8),inset 0 0 20px rgba(0,0,0,0.9);overflow:hidden;pointer-events:none;display:flex;align-items:center;justify-content:center}
  #minimap-canvas{width:150px;height:150px;display:block}
  #mm-n{position:absolute;top:5px;left:50%;transform:translateX(-50%);font-family:'Cinzel',serif;font-size:10px;font-weight:900;color:#d4af37;letter-spacing:1px}
  #mm-title{position:absolute;bottom:5px;left:50%;transform:translateX(-50%);font-family:'Cinzel',serif;font-size:8px;font-weight:700;color:rgba(197,160,89,0.7);letter-spacing:1.5px}

  /* Black Flag / Pirate-Themed Hotbar (Bottom Center) */
  #mc-hotbar{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);display:flex;gap:6px;background:linear-gradient(180deg,rgba(26,20,15,0.96) 0%,rgba(14,10,7,0.98) 100%);border:2px solid #c5a059;border-radius:4px;padding:6px;box-shadow:0 8px 35px rgba(0,0,0,0.9);z-index:70}
  .mc-slot{width:56px;height:56px;border-radius:3px;background:rgba(40,28,20,0.5);border:1.5px solid rgba(197,160,89,0.3);display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;cursor:pointer;transition:all .15s cubic-bezier(.4,0,.2,1);user-select:none}
  .mc-slot:hover{background:rgba(197,160,89,0.15);border-color:#e5c158}
  .mc-slot.active{background:rgba(212,175,55,0.22);border-color:#d4af37;box-shadow:0 0 16px rgba(212,175,55,0.4),inset 0 0 10px rgba(212,175,55,0.2);transform:translateY(-3px)}
  .mc-num{position:absolute;top:3px;left:5px;font-family:'Cinzel',serif;font-size:9px;font-weight:700;color:#c5a059}
  .mc-slot.active .mc-num{color:#f4ebd9}
  .mc-icon{font-size:24px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8))}
  .mc-name{font-family:'Cinzel',serif;font-size:9px;font-weight:700;color:#f4ebd9;letter-spacing:0.5px;text-transform:uppercase;margin-top:2px}
  .mc-badge{position:absolute;bottom:3px;right:5px;font-family:'Cinzel',serif;font-size:10px;font-weight:900;color:#d4af37;background:rgba(10,8,6,0.85);border-radius:2px;padding:1px 4px;line-height:1}

  /* Ship Hull & Bilge Status HUD (Top Left) */
  #damage-hud{position:absolute;top:64px;left:24px;pointer-events:none;background:linear-gradient(180deg,rgba(26,20,15,0.95) 0%,rgba(14,10,7,0.98) 100%);border:1.5px solid #c5a059;border-radius:4px;padding:8px 14px;display:flex;flex-direction:column;gap:6px;box-shadow:0 4px 20px rgba(0,0,0,0.8);min-width:210px}
  .dh-header{display:flex;justify-content:space-between;align-items:center}
  .dh-title{font-family:'Cinzel',serif;font-size:9px;font-weight:700;letter-spacing:2px;color:#c5a059;text-transform:uppercase}
  .dh-val{font-family:'Cinzel',serif;font-size:12px;font-weight:700;color:#f4ebd9}
  .dh-bar{width:100%;height:6px;background:rgba(20,14,10,0.8);border:1px solid rgba(197,160,89,0.3);border-radius:2px;overflow:hidden}
  .dh-fill{height:100%;background:linear-gradient(90deg,#0369a1,#38bdf8);width:0%;transition:width .2s}
  .dh-fill.danger{background:linear-gradient(90deg,#991b1b,#dc2626)}
  .dh-subrow{display:flex;justify-content:space-between;font-size:11px;color:rgba(244,235,217,0.7)}

  /* Kraken Boss Health Bar (Top Center Banner) */
  #kraken-boss-bar{position:absolute;top:20px;left:50%;transform:translateX(-50%);display:none;flex-direction:column;align-items:center;gap:4px;z-index:88;pointer-events:none}
  #kraken-boss-bar.visible{display:flex}
  .kbb-header{display:flex;align-items:center;gap:10px}
  .kbb-icon{font-size:18px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.8))}
  .kbb-title{font-family:'Pirata One',cursive;font-size:24px;letter-spacing:3px;color:#ef4444;text-shadow:0 2px 10px rgba(0,0,0,0.95);text-transform:uppercase}
  .kbb-frame{width:460px;height:14px;background:rgba(18,10,12,0.95);border:2px solid #c5a059;border-radius:3px;overflow:hidden;box-shadow:0 6px 25px rgba(0,0,0,0.9),inset 0 0 8px rgba(0,0,0,0.9)}
  .kbb-fill{height:100%;background:linear-gradient(90deg,#7f1d1d,#dc2626);width:100%;transition:width .2s ease;box-shadow:0 0 10px rgba(220,38,38,0.7)}
  .kbb-sub{font-family:'Cinzel',serif;font-size:10px;font-weight:700;letter-spacing:2px;color:#d4af37;text-transform:uppercase;text-shadow:0 1px 4px rgba(0,0,0,0.9)}

  /* Damage Waypoint Indicator */
  #damage-waypoint{position:absolute;pointer-events:none;display:none;flex-direction:column;align-items:center;z-index:90;transition:opacity .15s}
  #damage-waypoint.visible{display:flex}
  #damage-waypoint.on-screen{transform:translate(-50%,-110%)}
  #damage-waypoint.edge{transform:translate(-50%,-50%)}
  .dw-badge{background:linear-gradient(180deg,rgba(36,16,18,0.96) 0%,rgba(20,10,12,0.98) 100%);border:1.5px solid #dc2626;box-shadow:0 0 16px rgba(220,38,38,0.6);border-radius:4px;padding:4px 10px;display:flex;align-items:center;gap:6px;font-family:'Cinzel',serif;font-size:11px;font-weight:700;color:#fecaca;letter-spacing:1px;animation:dwPulse 1s infinite alternate}
  .dw-badge.near{border-color:#15803d;box-shadow:0 0 18px rgba(21,128,61,0.7)}
  .dw-badge.near .dw-icon{color:#4ade80}
  .dw-arrow{width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:14px solid #dc2626;filter:drop-shadow(0 2px 6px rgba(220,38,38,0.9));transition:transform .1s}
  #damage-waypoint.on-screen .dw-arrow{border-bottom:none;border-top:8px solid #dc2626;margin-top:3px}
  .dw-badge.near + .dw-arrow{border-bottom-color:#15803d;border-top-color:#15803d}
  @keyframes dwPulse{0%{transform:scale(0.96)}100%{transform:scale(1.04)}}

  /* ── FULLSCREEN NAUTICAL CHART & ADVENTURE MAP (M KEY) ── */
  #world-map-modal{position:absolute;inset:0;background:rgba(10,8,6,0.92);backdrop-filter:blur(14px);z-index:120;display:none;opacity:0;transition:opacity .25s ease;flex-direction:row;align-items:stretch;justify-content:center;padding:24px;box-sizing:border-box}
  #world-map-modal.open{display:flex;opacity:1;pointer-events:auto}
  .map-container{flex:1;position:relative;background:#0d1b2a;border:2px solid #c5a059;border-radius:4px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.9),inset 0 0 40px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center}
  #map-canvas{width:100%;height:100%;display:block}
  .map-sidebar{width:360px;margin-left:20px;background:linear-gradient(180deg,rgba(26,20,15,0.97) 0%,rgba(14,10,7,0.98) 100%);border:2px solid #c5a059;border-radius:4px;padding:20px;box-sizing:border-box;display:flex;flex-direction:column;gap:14px;box-shadow:0 8px 35px rgba(0,0,0,0.85);color:#f4ebd9;overflow-y:auto}
  .map-title-row{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(197,160,89,0.4);padding-bottom:12px}
  .map-title{font-family:'Pirata One',cursive;font-size:22px;letter-spacing:2px;color:#d4af37;text-transform:uppercase}
  .map-close-btn{background:rgba(185,28,28,0.25);border:1px solid #b91c1c;color:#fca5a5;padding:4px 12px;border-radius:3px;font-family:'Cinzel',serif;font-size:11px;font-weight:700;cursor:pointer}
  .map-close-btn:hover{background:rgba(185,28,28,0.5);color:#fff}
  .map-legend{display:flex;flex-direction:column;gap:6px;font-size:12px;background:rgba(10,8,6,0.6);padding:10px;border-radius:4px;border:1px solid rgba(197,160,89,0.3)}
  .legend-item{display:flex;align-items:center;gap:10px}
  .legend-dot{width:12px;height:12px;border-radius:50%}
  .island-card{background:rgba(40,28,20,0.5);border:1px solid rgba(197,160,89,0.3);border-radius:4px;padding:12px;display:flex;flex-direction:column;gap:8px;transition:all .15s}
  .island-card:hover{background:rgba(197,160,89,0.15);border-color:#d4af37;transform:translateY(-2px)}
  .ic-header{display:flex;justify-content:space-between;align-items:center}
  .ic-name{font-family:'Cinzel',serif;font-size:13px;font-weight:700;color:#d4af37}
  .ic-type{font-size:10px;text-transform:uppercase;letter-spacing:1px;padding:2px 6px;border-radius:2px;background:rgba(197,160,89,0.2);color:#f4ebd9;border:1px solid rgba(197,160,89,0.4)}
  .ic-coords{font-size:11px;color:rgba(244,235,217,0.55)}
  .ic-resources{display:flex;gap:10px;font-size:11px;color:#f4ebd9;background:rgba(10,8,6,0.6);padding:6px 10px;border-radius:4px}
  .ic-mission{font-size:11px;border-left:3px solid #d4af37;padding-left:8px;margin-top:2px}
  .ic-m-title{font-weight:700;color:#e5c158}
  .ic-m-desc{color:rgba(244,235,217,0.75);font-size:10.5px}
  .ic-m-reward{color:#d4af37;font-weight:700;margin-top:2px}
</style>`);

// ─── DOM ────────────────────────────────────────────────────────────────────
document.body.insertAdjacentHTML("beforeend", `
<div id="damage-vignette"></div>
<div id="audio-btn" title="Toggle Sound (M)">🔊</div>
<div id="damage-waypoint">
  <div class="dw-badge" id="dw-badge">
    <span class="dw-icon" id="dw-icon">⚠️</span>
    <span id="dw-text">REPAIR LEAK</span>
    <span id="dw-dist" style="color:#f59e0b">5.2m</span>
  </div>
  <div class="dw-arrow"></div>
</div>
<div id="repair-progress">
  <div class="rp-label" id="rp-label">🔨 REPAIRING...</div>
  <div class="rp-bar-wrap"><div class="rp-bar-fill" id="rp-bar-fill"></div></div>
  <div class="rp-hint">Hold still while hammering the breach</div>
</div>
<div id="bucket-aim-hint">🌊 AIM OVERBOARD TO DUMP WATER</div>

<div id="player-hp-card">
  <div class="hp-icon">🏴‍☠️</div>
  <div class="hp-info">
    <div class="hp-label-row">
      <span class="hp-title">Captain Health</span>
      <span class="hp-val" id="player-hp-num">100 / 100</span>
    </div>
    <div class="hp-bar-wrap"><div class="hp-fill" id="player-hp-fill"></div></div>
    <div class="hp-label-row" style="margin-top:2px">
      <span class="hp-title" style="color:#fbbf24">Stamina</span>
      <span class="hp-val" id="player-stamina-num" style="color:#f59e0b">100%</span>
    </div>
    <div class="hp-bar-wrap" style="height:4px"><div class="stamina-fill" id="player-stamina-fill"></div></div>
  </div>
  <div class="hp-planks-pill" id="player-planks-pill">🪵 2 / 5 PLANKS</div>
  <div class="hp-food-pill" id="player-food-pill">🍌 3 / 5 FOOD</div>
</div>

<div id="minimap-card">
  <canvas id="minimap-canvas" width="150" height="150"></canvas>
  <div id="mm-n">N</div>
  <div id="mm-title">RADAR</div>
</div>

<div id="mc-hotbar">
  <div class="mc-slot active" id="slot-btn-0" data-idx="0">
    <span class="mc-num">1</span>
    <span class="mc-icon">💣</span>
    <span class="mc-name">Cannonball</span>
    <span class="mc-badge" id="mc-badge-0">16</span>
  </div>
  <div class="mc-slot" id="slot-btn-1" data-idx="1">
    <span class="mc-num">2</span>
    <span class="mc-icon">🔨</span>
    <span class="mc-name">Mallet</span>
    <span class="mc-badge" id="mc-badge-1">Tool</span>
  </div>
  <div class="mc-slot" id="slot-btn-2" data-idx="2">
    <span class="mc-num">3</span>
    <span class="mc-icon">🪵</span>
    <span class="mc-name">Planks</span>
    <span class="mc-badge" id="mc-badge-2">2</span>
  </div>
  <div class="mc-slot" id="slot-btn-3" data-idx="3">
    <span class="mc-num">4</span>
    <span class="mc-icon">🪣</span>
    <span class="mc-name">Bucket</span>
    <span class="mc-badge" id="mc-badge-3">Bilge</span>
  </div>
  <div class="mc-slot" id="slot-btn-4" data-idx="4">
    <span class="mc-num">5</span>
    <span class="mc-icon">🍌</span>
    <span class="mc-name">Banana</span>
    <span class="mc-badge" id="mc-badge-4">3</span>
  </div>
  <div class="mc-slot" id="slot-btn-5" data-idx="5">
    <span class="mc-num">6</span>
    <span class="mc-icon">🔭</span>
    <span class="mc-name">Spyglass</span>
    <span class="mc-badge" id="mc-badge-5">Zoom</span>
  </div>
</div>

<div id="crosshair"></div>
<div id="cannon-xhair"><div class="cxh-ring"><div class="cxh-dot"></div></div></div>
<div id="game-toast"></div>

<div id="topbar">
  <div class="topstat"><div class="tslabel">Mission</div><div class="tsval">CORSAIR ARENA</div></div>
  <div id="gtitle">Sea of Real Thieves</div>
  <div class="topstat"><div class="tslabel">Mode</div><div class="tsval">SOLO CRUISE</div></div>
</div>

<div id="speedo"><div id="speedo-val">0.0</div><div id="speedo-unit">KN</div></div>
<div id="spbar-wrap"><div id="spbar-bg"><div id="spbar-fill"></div></div></div>

<div id="compass-wrap">
  <div id="compass-dial">
    <div id="compass-tape"></div>
    <div id="compass-marker"></div>
    <div id="compass-waypoint-pip"></div>
  </div>
  <div id="compass-sub">
    <div id="hdg-val">000°</div>
    <div id="wp-dist-val">-- M</div>
  </div>
</div>

<div id="sail-wrap">
  <div id="sail-label">SAIL</div>
  <div id="sail-bars">
    <div class="sail-seg" style="height:8px"></div>
    <div class="sail-seg" style="height:15px"></div>
    <div class="sail-seg" style="height:22px"></div>
    <div class="sail-seg" style="height:29px"></div>
    <div class="sail-seg" style="height:36px"></div>
  </div>
</div>

<div id="barrel-hud">
  <div class="bh-icon">📦</div>
  <div class="bh-info">
    <div class="bh-title">Ammo Barrel</div>
    <div class="bh-val"><span id="bh-count">20</span> / 20 STACKS</div>
    <div class="bh-sub"><span id="bh-balls">320</span> balls stored</div>
  </div>
</div>

<div id="player-ammo">
  <div id="pa-header">
    <div id="pa-label">Carried Ammo</div>
    <div id="pa-total">0 / 32</div>
  </div>
  <div id="pa-slots">
    <div class="pa-slot" id="slot-0">
      <div class="pa-slot-title">STACK 1</div>
      <div class="pa-slot-count" id="slot-0-count">EMPTY</div>
      <div class="pa-pips" id="slot-0-pips"></div>
    </div>
    <div class="pa-slot" id="slot-1">
      <div class="pa-slot-title">STACK 2</div>
      <div class="pa-slot-count" id="slot-1-count">EMPTY</div>
      <div class="pa-pips" id="slot-1-pips"></div>
    </div>
  </div>
</div>

<div id="cannon-station-hud">
  <div class="csh-header">
    <div class="csh-badge" id="csh-name">PORT CANNON 1</div>
    <div class="csh-level" id="csh-level">★ LEVEL 1</div>
  </div>
  <div class="csh-body">
    <div class="csh-ammo-label">Loaded Ammo Level (<span id="csh-ammo-num">16</span> / 16)</div>
    <div class="csh-ammo-row" id="csh-ammo-pips"></div>
    <div class="csh-status ready" id="csh-status">🔴 CANNON READY</div>
    <div class="csh-rl-bar"><div class="csh-rl-fill" id="csh-rl-fill"></div></div>
    <div class="csh-hints">LEFT CLICK: Fire &nbsp;·&nbsp; R: Load Ammo &nbsp;·&nbsp; MOUSE: Aim &nbsp;·&nbsp; E: Leave</div>
  </div>
</div>

<div id="interact-prompt">
  <div class="ip-key" id="ip-key">E</div>
  <div class="ip-text" id="ip-text">Take the Helm</div>
</div>

<div id="levelup-banner">
  <span style="font-size:18px">⭐</span>
  <span class="lub-text" id="lub-msg">CANNON LEVELED UP TO LEVEL 2!</span>
</div>

<div id="helm-ov" class="soverlay">
  <div class="so-title">At the Helm</div>
  <div class="so-hint">W/S — Adjust Sail &nbsp;·&nbsp; A/D — Steer Rudder &nbsp;·&nbsp; E — Leave Helm</div>
</div>

<div id="hflash"></div>
<div id="fps"></div>

<div id="damage-hud">
  <div class="dh-header">
    <div class="dh-title">Bilge Flooding</div>
    <div class="dh-val" id="bilge-pct">0%</div>
  </div>
  <div class="dh-bar"><div class="dh-fill" id="bilge-fill"></div></div>
  <div class="dh-subrow">
    <span>🪵 Planks: <strong id="planks-val">6</strong>/20</span>
    <span id="leak-rate-val">Dry (0.0%/s)</span>
  </div>
</div>

<div id="kraken-boss-bar">
  <div class="kbb-header">
    <span class="kbb-icon">🦑</span>
    <span class="kbb-title">THE KRAKEN — ABYSSAL TERROR</span>
  </div>
  <div class="kbb-frame">
    <div class="kbb-fill" id="kbb-fill"></div>
  </div>
  <div class="kbb-sub" id="kbb-sub">SEVERED TENTACLES: 0 / 4</div>
</div>

<!-- Fullscreen Nautical Adventure Chart (Press M) -->
<div id="world-map-modal">
  <div class="map-container">
    <canvas id="map-canvas" width="1000" height="900"></canvas>
  </div>
  <div class="map-sidebar">
    <div class="map-title-row">
      <div class="map-title">🗺️ Sea of Thieves Chart</div>
      <button class="map-close-btn" id="map-close-btn">ESC / [M] CLOSE</button>
    </div>
    <div class="map-legend">
      <div class="legend-item"><span class="legend-dot" style="background:#fbbf24"></span> <span>Player Ship (Center)</span></div>
      <div class="legend-item"><span class="legend-dot" style="background:#ef4444"></span> <span>Enemy Man-O-War</span></div>
      <div class="legend-item"><span class="legend-dot" style="background:#eab308"></span> <span>Fortress of the Damned</span></div>
      <div class="legend-item"><span class="legend-dot" style="background:#10b981"></span> <span>Archipelago Outpost Hub</span></div>
      <div class="legend-item"><span class="legend-dot" style="background:#d97706"></span> <span>Tropical & Atoll Islands</span></div>
      <div class="legend-item"><span class="legend-dot" style="background:#64748b"></span> <span>Hazard Sea Crags & Needles</span></div>
    </div>
    <div style="font-family:'Orbitron',sans-serif;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-top:6px">
      ARCHIPELAGO ISLANDS & MISSIONS (<span id="sidebar-island-count">16</span>)
    </div>
    <div id="island-list" style="display:flex;flex-direction:column;gap:10px"></div>
  </div>
</div>
`);

// ─── UI Helpers ─────────────────────────────────────────────────────────────
function renderPlayerAmmo(player: PlayerAmmo) {
    const totalBalls = player.stacks * CANNON_STACK_SIZE + player.loose;
    const totalEl = document.getElementById("pa-total");
    if (totalEl) totalEl.textContent = `${totalBalls} / 32`;

    for (let s = 0; s < 2; s++) {
        const countEl = document.getElementById(`slot-${s}-count`);
        const pipsEl  = document.getElementById(`slot-${s}-pips`);
        if (!countEl || !pipsEl) continue;

        let ballsInSlot = 0;
        if (s < player.stacks) {
            ballsInSlot = CANNON_STACK_SIZE;
        } else if (s === player.stacks && player.loose > 0) {
            ballsInSlot = player.loose;
        }

        countEl.textContent = ballsInSlot > 0 ? `${ballsInSlot} / ${CANNON_STACK_SIZE}` : "EMPTY";
        pipsEl.innerHTML = "";
        for (let i = 0; i < CANNON_STACK_SIZE; i++) {
            const pip = document.createElement("div");
            pip.className = "pa-pip" + (i < ballsInSlot ? "" : " empty");
            pipsEl.appendChild(pip);
        }
    }
}

function renderBarrelHUD(stacks: number) {
    const countEl = document.getElementById("bh-count");
    const ballsEl = document.getElementById("bh-balls");
    if (countEl) countEl.textContent = `${stacks} / ${BARREL_STACK_CAPACITY}`;
    if (ballsEl) ballsEl.textContent = (stacks * CANNON_STACK_SIZE).toString();
}

function renderCannonStationHUD(cannon: CannonState) {
    const hud = document.getElementById("cannon-station-hud");
    if (!hud) return;

    let sideName = "PORT";
    if (cannon.side === "R") sideName = "STARBOARD";
    else if (cannon.side === "F") sideName = "BOW CHASER";
    else if (cannon.side === "B") sideName = "STERN CHASER";

    const nameEl = document.getElementById("csh-name");
    const lvlEl  = document.getElementById("csh-level");
    const numEl  = document.getElementById("csh-ammo-num");
    const pipsEl = document.getElementById("csh-ammo-pips");
    const statEl = document.getElementById("csh-status");
    const fillEl = document.getElementById("csh-rl-fill");

    if (nameEl) nameEl.textContent = `${sideName} #${cannon.index + 1}`;
    if (lvlEl) {
        const stars = cannon.level === 3 ? "★★★" : cannon.level === 2 ? "★★☆" : "★☆☆";
        lvlEl.textContent = `${stars} LEVEL ${cannon.level}`;
    }
    if (numEl) numEl.textContent = cannon.ammoLoaded.toString();

    if (pipsEl) {
        pipsEl.innerHTML = "";
        for (let i = 0; i < CANNON_STACK_SIZE; i++) {
            const pip = document.createElement("div");
            pip.className = "csh-ammo-pip" + (i < cannon.ammoLoaded ? "" : " empty");
            pipsEl.appendChild(pip);
        }
    }

    if (statEl && fillEl) {
        if (cannon.reloadTimer > 0) {
            statEl.className = "csh-status reloading";
            statEl.textContent = `⏳ RELOADING (${cannon.reloadTimer.toFixed(1)}s)`;
            const maxRel = CANNON_RELOAD_TIME * (cannon.level === 3 ? 0.65 : cannon.level === 2 ? 0.8 : 1.0);
            const pct = Math.min(100, Math.max(0, (1 - cannon.reloadTimer / maxRel) * 100));
            fillEl.style.width = `${pct}%`;
        } else if (cannon.ammoLoaded <= 0) {
            statEl.className = "csh-status empty";
            statEl.textContent = "⚠️ EMPTY — PRESS R TO LOAD";
            fillEl.style.width = "0%";
        } else {
            statEl.className = "csh-status ready";
            statEl.textContent = "🔴 CANNON READY TO FIRE";
            fillEl.style.width = "100%";
        }
    }
}

let levelBannerTimeout: ReturnType<typeof setTimeout> | null = null;
function showLevelUpToast(level: number) {
    const banner = document.getElementById("levelup-banner");
    const msg = document.getElementById("lub-msg");
    if (!banner || !msg) return;

    msg.textContent = `🎉 CANNON LEVELED UP TO LEVEL ${level}! FASTER RELOAD!`;
    banner.classList.add("show");
    if (levelBannerTimeout) clearTimeout(levelBannerTimeout);
    levelBannerTimeout = setTimeout(() => banner.classList.remove("show"), 3200);
}

let toastTimeout: ReturnType<typeof setTimeout> | null = null;
function showToast(msg: string, type: "normal" | "warning" | "success" = "normal") {
    const el = document.getElementById("game-toast");
    if (!el) return;
    el.textContent = msg;
    el.className = type !== "normal" ? type : "";
    el.classList.add("show");
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el?.classList.remove("show"), 2800);
}





// ─── ENGINE ─────────────────────────────────────────────────────────────────
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new Engine(canvas, true);

// ─── WATER SHADERS ──────────────────────────────────────────────────────────
Effect.ShadersStore["waterVertexShader"] = `
precision highp float;
attribute vec3 position; attribute vec2 uv;
uniform mat4 worldViewProjection; uniform mat4 world; uniform float time;
const int NW=4;
uniform float amplitudes[NW]; uniform float wavelengths[NW];
uniform float steepnesses[NW]; uniform float dirX[NW]; uniform float dirZ[NW];
varying vec3 vPos;
void main(void){
  vec3 p=position; float dx=0.,dy=0.,dz=0.;
  for(int i=0;i<NW;i++){
    float a=amplitudes[i],l=wavelengths[i],q=steepnesses[i];
    vec2 d=normalize(vec2(dirX[i],dirZ[i]));
    float k=6.28318/l,om=sqrt(9.8*k),ph=k*dot(d,vec2(p.x,p.z))-om*time;
    dx+=q*a*d.x*cos(ph); dy+=a*sin(ph); dz+=q*a*d.y*cos(ph);
  }
  p+=vec3(dx,dy,dz); vPos=(world*vec4(p,1.)).xyz; gl_Position=worldViewProjection*vec4(p,1.);
}`;
Effect.ShadersStore["waterFragmentShader"] = `
precision highp float; varying vec3 vPos;
void main(void){
  float h=clamp(vPos.y/2.+.5,0.,1.);
  vec3 c=mix(mix(vec3(.01,.09,.32),vec3(.04,.22,.52),h*.7),vec3(.30,.62,.82),h*h);
  gl_FragColor=vec4(c,.94);
}`;

// ─── SCENE ──────────────────────────────────────────────────────────────────
const createScene = function () {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.48, 0.77, 0.98, 1.0);

    // Sky
    const sky = MeshBuilder.CreateSphere("sky", { diameter: 900, sideOrientation: 1 }, scene);
    const skyMat = new StandardMaterial("skyMat", scene);
    skyMat.emissiveColor = new Color3(0.36, 0.66, 0.98);
    skyMat.backFaceCulling = false; skyMat.disableLighting = true;
    sky.material = skyMat; sky.infiniteDistance = true; sky.isPickable = false;

    // Lights
    const sun = new DirectionalLight("sun", new Vector3(-0.4, -1, 0.6), scene);
    sun.intensity = 1.2; sun.diffuse = new Color3(1, 0.96, 0.82);
    const amb = new HemisphericLight("amb", new Vector3(0, 1, 0), scene);
    amb.intensity = 0.7; amb.diffuse = new Color3(0.65, 0.85, 1.0);
    amb.groundColor = new Color3(0.3, 0.4, 0.5);

    // Vast Open Ocean (3000m scale)
    // Vast Open Ocean (8000m scale covering massive 7km world)
    const water = MeshBuilder.CreateGround("water", { width: 8000, height: 8000, subdivisions: 320 }, scene);
    const wMat = new ShaderMaterial("wm", scene, { vertex: "water", fragment: "water" },
        { attributes:["position","uv"], uniforms:["worldViewProjection","world","time","amplitudes","wavelengths","steepnesses","dirX","dirZ"] });
    wMat.setFloats("amplitudes",  WAVE_PARAMS.map(w => w.amplitude));
    wMat.setFloats("wavelengths", WAVE_PARAMS.map(w => w.wavelength));
    wMat.setFloats("steepnesses", WAVE_PARAMS.map(w => w.steepness));
    wMat.setFloats("dirX",        WAVE_PARAMS.map(w => w.direction.x));
    wMat.setFloats("dirZ",        WAVE_PARAMS.map(w => w.direction.z));
    wMat.backFaceCulling = false; water.material = wMat;

    // ─── CHAPTER 1 STORY SCENERY & ROUTE LANDMARKS ─────────────────────────
    const chapterLevel: ChapterLevel = chapterLevelData as ChapterLevel;
    const sceneryBuilder = new SceneryBuilder(scene, chapterLevel);
    sceneryBuilder.buildAll();
    const chapterColliders = getLevelColliders(chapterLevel);
    const worldMap: WorldMap = generateWorldMap(DEFAULT_MAP_SEED, 0, 0); // terrain query container

    // ─── AUTONOMOUS ENEMY WARSHIP (HMS Dreadnought) ───────────────────────────
    const enemyMesh = new TransformNode("enemyShipNode", scene);
    const enemyShipHandles = buildProceduralShip(scene, enemyMesh, "enemy");
    enemyMesh.setEnabled(false); // Hidden during opening story cutscenes until combat/ambush
    const enemyShipState: ShipState = {
        x: chapterLevel.npcShips[0] ? chapterLevel.npcShips[0].spawn[0] : 250,
        z: chapterLevel.npcShips[0] ? chapterLevel.npcShips[0].spawn[1] : 660,
        heading: ((chapterLevel.npcShips[0]?.headingDeg || 90) * Math.PI) / 180,
        speed: 0, // dormant until ambush
        yawRate: 0,
        waterLevel: 0,
    };
    let enemyShipInput: ShipInput = { sail: 0, rudder: 0 };
    let enemyHitFlash = 0;

    // ─── SHIP ────────────────────────────────────────────────────────────────
    // Spawns in open stormy sea at Chapter 1 start coordinates (-1400, -1300), heading 40 deg
    const startSpawnX = chapterLevel.spawn.pos[0];
    const startSpawnZ = chapterLevel.spawn.pos[1];
    const startHeading = (chapterLevel.spawn.headingDeg * Math.PI) / 180;

    const shipState: ShipState = {
        x: startSpawnX,
        z: startSpawnZ,
        heading: startHeading,
        speed: 0,
        yawRate: 0,
        waterLevel: 0
    };
    const shipInput: ShipInput = { sail: 0, rudder: 0 };
    const SHIP_L = 34, SHIP_W = 10.6;

    const shipMesh = new TransformNode("ship", scene);
    const shipHandles: ShipHandles = buildProceduralShip(scene, shipMesh);

    // ─── ROUTE GUIDANCE & FLOATING LANTERN MARKER ───────────────────────────
    let currentRouteWaypointIndex = 0;

    // Floating 3D waypoint beacon marker in the world
    const waypointMarker = MeshBuilder.CreateSphere("waypointMarker", { diameter: 6, segments: 12 }, scene);
    const wpMat = new StandardMaterial("wpMarkerMat", scene);
    wpMat.emissiveColor = new Color3(0.98, 0.75, 0.14); // glowing gold
    wpMat.diffuseColor = new Color3(1, 0.8, 0.2);
    wpMat.alpha = 0.85;
    waypointMarker.material = wpMat;
    waypointMarker.position = new Vector3(chapterLevel.route[0].pos[0], 12, chapterLevel.route[0].pos[1]);

    // ─── DRIFTING TARGET WRECKAGE (Beat S2: "Shoot drifting wreckage blocking channel") ───
    interface DriftWreckageTarget {
        id: number;
        hp: number;
        x: number;
        z: number;
        radius: number;
        mesh: TransformNode;
        dead: boolean;
    }
    const driftingWreckages: DriftWreckageTarget[] = [];
    const wreckWoodMat = new StandardMaterial("driftWreckWoodMat", scene);
    wreckWoodMat.diffuseColor = new Color3(0.38, 0.25, 0.14);
    wreckWoodMat.specularColor = new Color3(0.1, 0.1, 0.1);

    const wreckIronMat = new StandardMaterial("driftWreckIronMat", scene);
    wreckIronMat.diffuseColor = new Color3(0.6, 0.2, 0.15); // rusty iron
    wreckIronMat.emissiveColor = new Color3(0.2, 0.05, 0.05);

    function spawnDriftingWreckageTargets() {
        // Clear any previous
        for (const w of driftingWreckages) {
            w.mesh.dispose();
        }
        driftingWreckages.length = 0;

        // Position 3 shootable wreckage barricades floating in the channel ahead of the ship
        // Ship starts at (-1400, -1300) heading 40 deg.
        // Channel waypoints: r0(-1350,-1240), r1(-1250,-1120), r2(-1150,-1000)
        const spawnPoints = [
            { x: -1320, z: -1200, r: 8, name: "Drifting Hull Section" },
            { x: -1230, z: -1100, r: 7, name: "Broken Mast Timber" },
            { x: -1130, z: -980,  r: 9, name: "Explosive Iron Barrel Raft" }
        ];

        spawnPoints.forEach((sp, idx) => {
            const root = new TransformNode(`drift_target_${idx}`, scene);
            root.position.set(sp.x, 0.5, sp.z);

            // Broken wooden beams
            const beam1 = MeshBuilder.CreateBox(`beam1_${idx}`, { width: 3, height: 1.8, depth: 16 }, scene);
            beam1.material = wreckWoodMat;
            beam1.rotation.y = 0.4 + idx * 0.5;
            beam1.rotation.z = 0.15;
            beam1.parent = root;

            const beam2 = MeshBuilder.CreateBox(`beam2_${idx}`, { width: 2.2, height: 1.5, depth: 12 }, scene);
            beam2.material = wreckWoodMat;
            beam2.rotation.y = -0.6 + idx * 0.3;
            beam2.parent = root;

            // Red glowing powder keg / iron barrel in center
            const barrel = MeshBuilder.CreateCylinder(`iron_barrel_${idx}`, { height: 3.5, diameter: 2.4 }, scene);
            barrel.material = wreckIronMat;
            barrel.position.y = 1.2;
            barrel.parent = root;

            // Floating debris ring
            const foam = MeshBuilder.CreateTorus(`foam_${idx}`, { diameter: 14, thickness: 1.2 }, scene);
            const fMat = new StandardMaterial(`fmat_${idx}`, scene);
            fMat.diffuseColor = new Color3(0.9, 0.95, 1);
            fMat.alpha = 0.45;
            foam.material = fMat;
            foam.position.y = -0.2;
            foam.parent = root;

            driftingWreckages.push({
                id: idx,
                hp: 1, // one direct cannon shot destroys it
                x: sp.x,
                z: sp.z,
                radius: sp.r,
                mesh: root,
                dead: false
            });
        });
    }

    // Ammo barrel glow material (swaps when player is near)
    const barrelNormalMat = shipHandles.ammoBarrel.material as StandardMaterial;
    const barrelGlowMat   = new StandardMaterial("barrelGlow", scene);
    barrelGlowMat.diffuseColor  = new Color3(0.65, 0.48, 0.16);
    barrelGlowMat.emissiveColor = new Color3(0.35, 0.22, 0.06);

    // ─── DAMAGE & FLOODING STATE ─────────────────────────────────────────────
    const playerDamage: ShipDamageState = createShipDamageState();
    const enemyDamage: ShipDamageState  = createShipDamageState();
    const shipSupplies: ShipSuppliesState = createShipSuppliesState();
    const playerHotbar: PlayerHotbarState = createPlayerHotbarState();
    let isBailing = false;
    let cameraShake = 0;
    let hammerSwing = 0;
    let bucketSwing = 0;
    let isZoomed = false;
    let collisionToastCooldown = false;
    // Repair state & cooldown: 5-second animated repair + 5-second anti-spam delay
    let repairCooldownEnd = 0;
    let repairAnimTimer = 0;   // 0..5 seconds, drives the progress bar
    let repairStrikeTimer = 0; // periodic hammer strike interval
    let isRepairing = false;
    let repairSlotId = -1;
    const repairStartPos = new Vector3(0, 0, 0);

    // Bucket state: Sea of Thieves mechanics (scoops bilge water, must be dumped overboard)
    let bucketFull = false;
    let bucketHeldWater = 0;   // amount of water scooped into bucket
    let bucketCooldownEnd = 0; // cooldown after scoop/dump

    // Banana eating animation state
    let isEatingBanana = false;
    let bananaEatTimer = 0;
    const BANANA_EAT_DURATION = 0.85;
    let bananaBitePhase = 0;

    // ─── CANNON STATE ────────────────────────────────────────────────────────
    const cannonShip: CannonShipState = createCannonShipState();
    const playerAmmo: PlayerAmmo      = createPlayerAmmo();
    let activeCannon: CannonState | null = null;
    let activeHandle: typeof shipHandles.cannons[0] | null = null;

    const CANNON_INTERACT_RADIUS = 2.4;
    const BARREL_INTERACT_RADIUS = 2.0;
    const projectiles: Array<{
        state: ProjectileState;
        mesh: Mesh;
        firedFrom?: CannonState;
        firedBy: "player" | "enemy";
    }> = [];

    // ─── LEAK & WATER HOLE VISUALS ───────────────────────────────────────────
    const breachMat = new StandardMaterial("breachMat", scene);
    breachMat.diffuseColor = new Color3(0.05, 0.03, 0.02);
    breachMat.emissiveColor = new Color3(0.01, 0.01, 0.01);

    const geyserMat = new StandardMaterial("geyserMat", scene);
    geyserMat.diffuseColor = new Color3(0.20, 0.78, 0.95);
    geyserMat.emissiveColor = new Color3(0.08, 0.38, 0.52);
    geyserMat.specularColor = new Color3(1.0, 1.0, 1.0);
    geyserMat.alpha = 0.75;

    const foamMat = new StandardMaterial("foamMat", scene);
    foamMat.diffuseColor = new Color3(0.92, 0.97, 1.0);
    foamMat.emissiveColor = new Color3(0.35, 0.48, 0.60);
    foamMat.alpha = 0.65;

    const repairPlankMat = new StandardMaterial("repairPlankMat", scene);
    repairPlankMat.diffuseColor = new Color3(0.58, 0.38, 0.18);
    repairPlankMat.emissiveColor = new Color3(0.08, 0.05, 0.02);

    const nailMat = new StandardMaterial("nailMat", scene);
    nailMat.diffuseColor = new Color3(0.85, 0.85, 0.90);
    nailMat.specularColor = new Color3(1, 1, 1);

    interface LeakVisual {
        root: TransformNode;
        breach: Mesh;
        geyser: Mesh;
        foam: Mesh;
        board: Mesh;
        indicator: TransformNode;
    }

    function createShipLeakVisuals(damageState: ShipDamageState, parentMesh: TransformNode | Mesh, isPlayer: boolean): Map<number, LeakVisual> {
        const map = new Map<number, LeakVisual>();
        for (const slot of damageState.slots) {
            const root = new TransformNode(`leak_${slot.id}_${isPlayer ? "p" : "e"}`, scene);
            root.parent = parentMesh;

            const wallX = slot.side === "L" ? -4.92 : 4.92;
            root.position.set(wallX, 1.88, slot.localPos.z);

            // 1. Dark breach hole with jagged splintered rim
            const breach = MeshBuilder.CreateBox(`br_${slot.id}`, { width: 0.14, height: 0.72, depth: 0.95 }, scene);
            breach.parent = root;
            breach.material = breachMat;

            // Splintered wood wedges around breach
            for (let j = 0; j < 4; j++) {
                const sp = MeshBuilder.CreateCylinder(`br_sp_${slot.id}_${j}`,
                    { height: 0.40, diameterTop: 0.02, diameterBottom: 0.12, tessellation: 4 }, scene);
                sp.parent = breach;
                sp.material = barrelNormalMat;
                const ang = (j / 4) * Math.PI * 2 + 0.3;
                sp.position.set(0, Math.sin(ang) * 0.32, Math.cos(ang) * 0.42);
                sp.rotation.x = Math.sin(ang) * 0.5;
                sp.rotation.z = Math.cos(ang) * 0.5;
            }

            // 2. Pressurized spurting seawater geyser jet
            const geyser = MeshBuilder.CreateCylinder(`gey_${slot.id}`,
                { height: 1.75, diameterTop: 0.55, diameterBottom: 0.16, tessellation: 12 }, scene);
            geyser.parent = root;
            geyser.material = geyserMat;
            if (slot.side === "L") {
                geyser.rotation.z = -Math.PI / 3.0;
                geyser.position.set(0.65, 0.35, 0);
            } else {
                geyser.rotation.z = Math.PI / 3.0;
                geyser.position.set(-0.65, 0.35, 0);
            }

            // 3. Agitated white foam puddle on deck floor
            const foam = MeshBuilder.CreateDisc(`foam_${slot.id}`, { radius: 0.75, tessellation: 16 }, scene);
            foam.parent = root;
            foam.material = foamMat;
            foam.rotation.x = Math.PI / 2;
            foam.position.set(slot.side === "L" ? 0.65 : -0.65, -0.05, 0);

            // 4. Sturdy oak repair plank nailed over the breach
            const board = MeshBuilder.CreateBox(`board_${slot.id}`, { width: 0.22, height: 0.72, depth: 1.1 }, scene);
            board.parent = root;
            board.material = repairPlankMat;
            for (const ny of [-0.25, 0.25]) {
                for (const nz of [-0.42, 0.42]) {
                    const nail = MeshBuilder.CreateSphere(`nail_${slot.id}`, { diameter: 0.07, segments: 4 }, scene);
                    nail.parent = board;
                    nail.material = nailMat;
                    nail.position.set(slot.side === "L" ? 0.11 : -0.11, ny, nz);
                }
            }

            // 5. In-World 3D Floating Indicator Marker
            const indicator = new TransformNode(`ind_${slot.id}`, scene);
            indicator.parent = root;
            indicator.position.set(slot.side === "L" ? 0.65 : -0.65, 1.85, 0);

            const mBeacon = new StandardMaterial(`mBeacon_${slot.id}`, scene);
            mBeacon.diffuseColor = new Color3(1.0, 0.25, 0.05);
            mBeacon.emissiveColor = new Color3(1.0, 0.45, 0.10);

            const diamond = MeshBuilder.CreatePolyhedron(`indD_${slot.id}`, { type: 1, size: 0.28 }, scene);
            diamond.parent = indicator;
            diamond.material = mBeacon;

            const arrow = MeshBuilder.CreateCylinder(`indA_${slot.id}`,
                { height: 0.35, diameterTop: 0.24, diameterBottom: 0.02, tessellation: 4 }, scene);
            arrow.parent = indicator;
            arrow.material = mBeacon;
            arrow.rotation.x = Math.PI;
            arrow.position.set(0, -0.32, 0);

            const mBeam = new StandardMaterial(`mBeam_${slot.id}`, scene);
            mBeam.diffuseColor = new Color3(1.0, 0.4, 0.1);
            mBeam.emissiveColor = new Color3(0.9, 0.35, 0.05);
            mBeam.alpha = 0.45;

            const beam = MeshBuilder.CreateCylinder(`indB_${slot.id}`,
                { height: 1.8, diameter: 0.06, tessellation: 6 }, scene);
            beam.parent = indicator;
            beam.material = mBeam;
            beam.position.set(0, -0.95, 0);

            root.setEnabled(false);
            map.set(slot.id, { root, breach, geyser, foam, board, indicator });
        }
        return map;
    }

    const playerLeakVisuals = createShipLeakVisuals(playerDamage, shipMesh, true);
    const enemyLeakVisuals = createShipLeakVisuals(enemyDamage, enemyMesh, false);

    function updateLeakVisuals(damageState: ShipDamageState, visuals: Map<number, LeakVisual>, isPlayerShip: boolean, timeVal: number) {
        const hammerEquipped = isPlayerShip && (playerHotbar.selectedSlot === 1) && !activeCannon;
        for (const slot of damageState.slots) {
            const vis = visuals.get(slot.id);
            if (!vis) continue;

            if (slot.active) {
                vis.root.setEnabled(true);
                vis.breach.setEnabled(true);
                vis.geyser.setEnabled(true);
                vis.foam.setEnabled(true);
                vis.board.setEnabled(false);

                // Indicator ONLY shows when mallet/hammer is equipped in hand
                vis.indicator.setEnabled(hammerEquipped);
                if (hammerEquipped) {
                    vis.indicator.rotation.y = timeVal * 3.5;
                    vis.indicator.position.y = 1.85 + Math.sin(timeVal * 5.0 + slot.id) * 0.18;
                    vis.indicator.scaling.setAll(1.0 + Math.sin(timeVal * 10.0 + slot.id) * 0.15);
                }

                // Dynamic pulsating geyser animation
                const pulse = Math.sin(timeVal * 18 + slot.id * 2.8);
                const sevScale = 0.75 + slot.severity * 0.35;
                vis.geyser.scaling.x = (1.0 + pulse * 0.22) * sevScale;
                vis.geyser.scaling.z = (1.0 + Math.cos(timeVal * 15 + slot.id) * 0.20) * sevScale;
                vis.geyser.scaling.y = (1.0 + Math.sin(timeVal * 22 + slot.id) * 0.25) * sevScale;

                vis.foam.scaling.setAll((1.0 + Math.sin(timeVal * 11 + slot.id) * 0.20) * sevScale);
                vis.foam.rotation.y = timeVal * 1.8;
            } else if (slot.patchProgress >= 1.0) {
                vis.root.setEnabled(true);
                vis.breach.setEnabled(false);
                vis.geyser.setEnabled(false);
                vis.foam.setEnabled(false);
                vis.board.setEnabled(true);
                vis.indicator.setEnabled(false);
            } else {
                vis.root.setEnabled(false);
            }
        }
    }

    function spawnHammerSparks(pos: { x: number; y: number; z: number }) {
        // Wood chips + bright sparks for a polished repair VFX
        for (let i = 0; i < 10; i++) {
            const isChip = i < 6;
            const chip = isChip
                ? MeshBuilder.CreateBox("chip", { width: 0.07, height: 0.05, depth: 0.12 }, scene)
                : MeshBuilder.CreateSphere("spark", { diameter: 0.06 }, scene);
            chip.position.set(pos.x, pos.y + 0.1, pos.z);
            if (isChip) {
                chip.material = repairPlankMat;
            } else {
                const spkMat = new StandardMaterial("spkM", scene);
                spkMat.emissiveColor = new Color3(1.0, 0.85, 0.2);
                spkMat.disableLighting = true;
                chip.material = spkMat;
            }
            const speed = isChip ? 3.5 : 6.0;
            const cvx = (Math.random() - 0.5) * speed;
            const cvy = Math.random() * (isChip ? 3.5 : 5.5) + 1.5;
            const cvz = (Math.random() - 0.5) * speed;
            let age = 0;
            const lifespan = isChip ? 0.55 : 0.35;
            const cObs = scene.onBeforeRenderObservable.add(() => {
                const sdt = engine.getDeltaTime() * 0.001;
                age += sdt;
                chip.position.x += cvx * sdt;
                chip.position.y += (cvy - 9.8 * age) * sdt;
                chip.position.z += cvz * sdt;
                chip.rotation.x += sdt * 12;
                chip.rotation.z += sdt * 8;
                if (!isChip) { (chip.material as StandardMaterial).alpha = Math.max(0, 1 - age / lifespan); }
                if (age > lifespan) {
                    scene.onBeforeRenderObservable.remove(cObs);
                    chip.dispose();
                }
            });
        }
    }

    function spawnBucketSplash(px: number, py: number, pz: number) {
        // Animated water arc + splash ring when dumping bucket overboard
        for (let i = 0; i < 12; i++) {
            const drop = MeshBuilder.CreateSphere("bdrop", { diameter: 0.18 + Math.random() * 0.12 }, scene);
            drop.position.set(px, py + 1.2, pz);
            const dropMat = new StandardMaterial("bdropM", scene);
            dropMat.diffuseColor = new Color3(0.35, 0.75, 0.92);
            dropMat.emissiveColor = new Color3(0.05, 0.22, 0.35);
            dropMat.alpha = 0.82;
            drop.material = dropMat;
            const angle = (i / 12) * Math.PI * 2;
            const spd = 1.2 + Math.random() * 1.5;
            const dvx = Math.cos(angle) * spd;
            const dvz = Math.sin(angle) * spd;
            let dAge = 0;
            const dObs = scene.onBeforeRenderObservable.add(() => {
                const sdt = engine.getDeltaTime() * 0.001;
                dAge += sdt;
                drop.position.x += dvx * sdt;
                drop.position.y += (2.5 - 9.8 * dAge) * sdt;
                drop.position.z += dvz * sdt;
                dropMat.alpha = Math.max(0, 0.82 - dAge * 1.8);
                if (dAge > 0.55) {
                    scene.onBeforeRenderObservable.remove(dObs);
                    drop.dispose();
                }
            });
        }
    }

    function createExplosionVFX(pos: { x: number; y: number; z: number }) {
        const expSphere = MeshBuilder.CreateSphere("expFlash", { diameter: 4.5, segments: 6 }, scene);
        expSphere.position.set(pos.x, pos.y, pos.z);
        const mExpMat = new StandardMaterial("expM", scene);
        mExpMat.diffuseColor = new Color3(1.0, 0.45, 0.05);
        mExpMat.emissiveColor = new Color3(1.0, 0.85, 0.25);
        expSphere.material = mExpMat;
        let expAge = 0;
        const expObs = scene.onBeforeRenderObservable.add(() => {
            expAge += engine.getDeltaTime() * 0.001;
            expSphere.scaling.scaleInPlace(1.07);
            mExpMat.alpha = Math.max(0, 1.0 - expAge * 4.5);
            if (expAge > 0.25) {
                scene.onBeforeRenderObservable.remove(expObs);
                expSphere.dispose();
            }
        });

        for (let s = 0; s < 10; s++) {
            const spl = MeshBuilder.CreateBox(`spl_${s}`,
                { width: 0.12, height: 0.12, depth: 0.5 }, scene);
            spl.position.set(pos.x, pos.y, pos.z);
            spl.material = barrelNormalMat;
            const svx = (Math.random() - 0.5) * 18.0;
            const svy = Math.random() * 12.0 + 4.0;
            const svz = (Math.random() - 0.5) * 18.0;
            let sage = 0;
            const sObs = scene.onBeforeRenderObservable.add(() => {
                const sdt = engine.getDeltaTime() * 0.001;
                sage += sdt;
                spl.position.x += svx * sdt;
                spl.position.y += (svy - 18.0 * sage) * sdt;
                spl.position.z += svz * sdt;
                spl.rotation.x += sdt * 6.0;
                spl.rotation.y += sdt * 4.0;
                if (sage > 1.2 || spl.position.y < 0) {
                    scene.onBeforeRenderObservable.remove(sObs);
                    spl.dispose();
                }
            });
        }
    }

    let enemyShootTimer = 6.0;

    const splashMat = new StandardMaterial("splsh", scene);
    splashMat.diffuseColor = new Color3(0.8, 0.9, 1.0); splashMat.alpha = 0.55;

    // ─── TRAJECTORY ARC ──────────────────────────────────────────────────────
    const ARC_DOTS = 32;
    const arcMat = new StandardMaterial("arcMat", scene);
    arcMat.diffuseColor  = new Color3(1.0, 0.65, 0.15);
    arcMat.emissiveColor = new Color3(0.6, 0.35, 0.05);
    arcMat.alpha = 0.85;

    const impactMat = new StandardMaterial("impactMat", scene);
    impactMat.diffuseColor  = new Color3(1.0, 0.2, 0.05);
    impactMat.emissiveColor = new Color3(0.8, 0.15, 0.02);
    impactMat.alpha = 0.9;

    const arcDots: Mesh[] = [];
    for (let i = 0; i < ARC_DOTS; i++) {
        const isImpact = i === ARC_DOTS - 1;
        const d = MeshBuilder.CreateSphere(`arc${i}`,
            { diameter: isImpact ? 0.65 : 0.24, segments: 4 }, scene) as Mesh;
        d.material = isImpact ? impactMat : arcMat;
        d.isVisible = false; d.isPickable = false;
        arcDots.push(d);
    }

    // ─── PLAYER & CAMERA ──────────────────────────────────────────────────────
    const playerNode = new TransformNode("pNode", scene);
    playerNode.parent = shipMesh;
    const camera = new FreeCamera("cam", new Vector3(0, 0, 0), scene);
    camera.parent = playerNode;
    camera.attachControl(canvas, true);
    camera.keysUp=[]; camera.keysDown=[]; camera.keysLeft=[]; camera.keysRight=[];
    camera.minZ = 0.05;
    camera.maxZ = 8500; // Far horizon view distance for 7km archipelago
    camera.fov = 1.10; // Cinematic wide FOV (~63° vertical, ~93° horizontal)


    // ─── FIRST PERSON PIRATE HANDS (holding cannon) ───────────────────────────
    const fpHandsRoot = new TransformNode("fpHandsRoot", scene);
    fpHandsRoot.parent = camera;
    fpHandsRoot.position.set(0, -0.36, 0.52);

    const mSleeve = new StandardMaterial("sleeveMat", scene);
    mSleeve.diffuseColor = new Color3(0.12, 0.18, 0.32); // deep navy pirate coat
    mSleeve.emissiveColor = new Color3(0.04, 0.06, 0.10);

    const mCuff = new StandardMaterial("cuffMat", scene);
    mCuff.diffuseColor = new Color3(0.90, 0.88, 0.82); // white ruffled lace
    mCuff.emissiveColor = new Color3(0.25, 0.24, 0.20);

    const mGlove = new StandardMaterial("gloveMat", scene);
    mGlove.diffuseColor = new Color3(0.24, 0.14, 0.08); // weathered leather
    mGlove.emissiveColor = new Color3(0.06, 0.03, 0.01);

    for (const sx of [-1, 1]) {
        const armNode = new TransformNode(`arm_${sx}`, scene);
        armNode.parent = fpHandsRoot;
        armNode.position.set(sx * 0.30, -0.06, 0.08);

        // Sleeve cylinder angled forward-inward
        const sleeve = MeshBuilder.CreateCylinder(`sleeve_${sx}`,
            { height: 0.50, diameterTop: 0.18, diameterBottom: 0.22, tessellation: 10 }, scene);
        sleeve.parent = armNode;
        sleeve.material = mSleeve;
        sleeve.rotation.x = Math.PI / 2.4;
        sleeve.rotation.z = -sx * 0.32;

        // White ruffled cuff
        const cuff = MeshBuilder.CreateCylinder(`cuff_${sx}`,
            { height: 0.08, diameter: 0.23, tessellation: 10 }, scene);
        cuff.parent = sleeve;
        cuff.material = mCuff;
        cuff.position.set(0, 0.26, 0);

    // Weathered leather glove hand
        const hand = MeshBuilder.CreateBox(`hand_${sx}`,
            { width: 0.14, height: 0.11, depth: 0.20 }, scene);
        hand.parent = sleeve;
        hand.material = mGlove;
        hand.position.set(0, 0.36, 0);

        // Gripping fingers wrapped around handle
        const fingers = MeshBuilder.CreateCylinder(`fingers_${sx}`,
            { height: 0.15, diameter: 0.13, tessellation: 8 }, scene);
        fingers.parent = hand;
        fingers.material = mGlove;
        fingers.rotation.z = Math.PI / 2;
        fingers.position.set(0, 0.04, 0.05);
    }
    fpHandsRoot.setEnabled(false);

    // ─── 3D PIRATE AVATAR MODEL (Player Character) ───────────────────────────
    const EYE_H = 1.85;
    const pirateAvatar = buildPirateCharacter(scene, playerNode);
    pirateAvatar.position.y = -EYE_H; // feet stand on the deck
    pirateAvatar.setEnabled(false); // Disabled in first person so it never obstructs camera view!
    let isThirdPerson = false;
    // Third-person orbit angles (independent of FreeCamera.rotation so cannon-aim doesn't fight it)
    let tpYaw   = 0;   // horizontal orbit angle around player
    let tpPitch = 0.15; // vertical tilt (radians, 0 = level, positive = looking down slightly)

    // ─── FIRST PERSON HELD ITEMS (Minecraft Hotbar Viewmodels) ───────────────
    const fpItemsRoot = new TransformNode("fpItemsRoot", scene);
    fpItemsRoot.parent = camera;
    fpItemsRoot.position.set(0, -0.32, 0.52);

    // Slot 0: Cannonball (two gloved hands holding heavy iron cannonball)
    const fpBallNode = new TransformNode("fpBallNode", scene);
    fpBallNode.parent = fpItemsRoot;
    const carriedBall = MeshBuilder.CreateSphere("carriedBall", { diameter: 0.32, segments: 8 }, scene);
    carriedBall.parent = fpBallNode;
    const mCarriedBall = new StandardMaterial("cbm", scene);
    mCarriedBall.diffuseColor = new Color3(0.12, 0.12, 0.14);
    mCarriedBall.emissiveColor = new Color3(0.04, 0.04, 0.05);
    carriedBall.material = mCarriedBall;
    for (const sx of [-1, 1]) {
        const cHand = MeshBuilder.CreateBox(`cbHand_${sx}`,
            { width: 0.12, height: 0.08, depth: 0.18 }, scene);
        cHand.parent = fpBallNode; cHand.material = mGlove;
        cHand.position.set(sx * 0.18, -0.06, 0);
        cHand.rotation.z = -sx * 0.45;
    }

    // Slot 1: Mallet / Hammer (right hand holding shipwright's mallet)
    const fpHammerNode = new TransformNode("fpHammerNode", scene);
    fpHammerNode.parent = fpItemsRoot;
    fpHammerNode.position.set(0.24, -0.05, 0);

    const hammerHandle = MeshBuilder.CreateCylinder("hHandle",
        { height: 0.55, diameter: 0.05, tessellation: 8 }, scene);
    hammerHandle.parent = fpHammerNode;
    const mWood = new StandardMaterial("hWood", scene);
    mWood.diffuseColor = new Color3(0.35, 0.20, 0.08);
    hammerHandle.material = mWood;
    hammerHandle.rotation.x = Math.PI / 3;

    const hammerHead = MeshBuilder.CreateBox("hHead",
        { width: 0.16, height: 0.14, depth: 0.24 }, scene);
    hammerHead.parent = hammerHandle; hammerHead.material = mWood;
    hammerHead.position.set(0, 0.25, 0);

    const hammerHand = MeshBuilder.CreateBox("hHand",
        { width: 0.12, height: 0.09, depth: 0.16 }, scene);
    hammerHand.parent = fpHammerNode; hammerHand.material = mGlove;
    hammerHand.position.set(0, -0.15, -0.08);

    // Slot 2: Wooden Plank (two hands carrying a heavy oak repair plank)
    const fpPlankNode = new TransformNode("fpPlankNode", scene);
    fpPlankNode.parent = fpItemsRoot;
    const heldPlank = MeshBuilder.CreateBox("heldPlank",
        { width: 0.65, height: 0.12, depth: 0.28 }, scene);
    heldPlank.parent = fpPlankNode;
    const mPlank = new StandardMaterial("plankM", scene);
    mPlank.diffuseColor = new Color3(0.68, 0.46, 0.22);
    heldPlank.material = mPlank;
    heldPlank.position.set(0, 0.02, 0);
    for (const sx of [-1, 1]) {
        const pHand = MeshBuilder.CreateBox(`pHand_${sx}`,
            { width: 0.11, height: 0.08, depth: 0.16 }, scene);
        pHand.parent = fpPlankNode; pHand.material = mGlove;
        pHand.position.set(sx * 0.32, -0.06, 0);
    }

    // Slot 3: Bucket (right hand holding a wooden bilge bucket)
    const fpBucketNode = new TransformNode("fpBucketNode", scene);
    fpBucketNode.parent = fpItemsRoot;
    fpBucketNode.position.set(0.22, -0.05, 0);
    const heldBucket = MeshBuilder.CreateCylinder("heldBucket",
        { height: 0.36, diameterTop: 0.32, diameterBottom: 0.24, tessellation: 10 }, scene);
    heldBucket.parent = fpBucketNode; heldBucket.material = mWood;
    const bHand = MeshBuilder.CreateBox("bHand",
        { width: 0.11, height: 0.08, depth: 0.16 }, scene);
    bHand.parent = fpBucketNode; bHand.material = mGlove;
    bHand.position.set(0, 0.15, 0);

    // Water surface inside bucket when full
    const bucketWaterDisc = MeshBuilder.CreateDisc("bWaterDisc", { radius: 0.13, tessellation: 12 }, scene);
    bucketWaterDisc.parent = heldBucket;
    bucketWaterDisc.rotation.x = Math.PI / 2;
    bucketWaterDisc.position.set(0, 0.12, 0);
    const mWaterDisc = new StandardMaterial("bWaterMat", scene);
    mWaterDisc.diffuseColor = new Color3(0.25, 0.70, 0.95);
    mWaterDisc.emissiveColor = new Color3(0.08, 0.28, 0.45);
    mWaterDisc.alpha = 0.85;
    bucketWaterDisc.material = mWaterDisc;
    bucketWaterDisc.setEnabled(false);

    // Slot 4: Banana (held in right hand)
    const fpBananaNode = new TransformNode("fpBananaNode", scene);
    fpBananaNode.parent = fpItemsRoot;
    fpBananaNode.position.set(0.18, -0.06, 0.12);
    fpBananaNode.rotation.x = Math.PI / 4;
    const mFpBanana = new StandardMaterial("fpBananaMat", scene);
    mFpBanana.diffuseColor = new Color3(0.96, 0.84, 0.14);
    mFpBanana.emissiveColor = new Color3(0.35, 0.28, 0.05);
    const fpBanMesh = MeshBuilder.CreateCylinder("fpBanMesh",
        { height: 0.38, diameterTop: 0.07, diameterBottom: 0.09, tessellation: 6 }, scene);
    fpBanMesh.parent = fpBananaNode; fpBanMesh.material = mFpBanana;
    const fpBanStem = MeshBuilder.CreateCylinder("fpBanStem",
        { height: 0.08, diameter: 0.04, tessellation: 6 }, scene);
    fpBanStem.parent = fpBanMesh;
    const mStem = new StandardMaterial("stemMat", scene);
    mStem.diffuseColor = new Color3(0.35, 0.55, 0.2);
    fpBanStem.material = mStem;
    fpBanStem.position.set(0, 0.20, 0);
    const banHand = MeshBuilder.CreateBox("banHand",
        { width: 0.10, height: 0.08, depth: 0.12 }, scene);
    banHand.parent = fpBananaNode; banHand.material = mGlove;
    banHand.position.set(0, -0.06, -0.02);

    // Slot 5: Brass Spyglass (right hand holding telescope)
    const fpSpyglassNode = new TransformNode("fpSpyglassNode", scene);
    fpSpyglassNode.parent = fpItemsRoot;
    fpSpyglassNode.position.set(0.18, -0.08, 0.05);
    const spyCyl1 = MeshBuilder.CreateCylinder("spy1",
        { height: 0.30, diameter: 0.09, tessellation: 10 }, scene);
    spyCyl1.parent = fpSpyglassNode;
    const mBrass = new StandardMaterial("brassM", scene);
    mBrass.diffuseColor = new Color3(0.85, 0.68, 0.20);
    mBrass.emissiveColor = new Color3(0.25, 0.18, 0.05);
    spyCyl1.material = mBrass;
    spyCyl1.rotation.x = Math.PI / 2.2;
    const spyCyl2 = MeshBuilder.CreateCylinder("spy2",
        { height: 0.26, diameter: 0.07, tessellation: 10 }, scene);
    spyCyl2.parent = spyCyl1; spyCyl2.material = mBrass;
    spyCyl2.position.set(0, 0.26, 0);
    const spyHand = MeshBuilder.CreateBox("spyHand",
        { width: 0.10, height: 0.08, depth: 0.15 }, scene);
    spyHand.parent = fpSpyglassNode; spyHand.material = mGlove;
    spyHand.position.set(0, -0.08, -0.05);

    // Update initial Hotbar UI
    function updateHotbarUI() {
        for (let s = 0; s < 6; s++) {
            const slotEl = document.getElementById(`slot-btn-${s}`);
            if (slotEl) slotEl.classList.toggle("active", s === playerHotbar.selectedSlot);
        }
        const totalBalls = playerAmmo.stacks * 16 + playerAmmo.loose;
        const b0 = document.getElementById("mc-badge-0");
        if (b0) b0.textContent = `${totalBalls}`;
        const b2 = document.getElementById("mc-badge-2");
        if (b2) b2.textContent = `${playerHotbar.planksCarried}`;
        const b4 = document.getElementById("mc-badge-4");
        if (b4) b4.textContent = `${playerHotbar.foodCarried}`;

        const hpNum = document.getElementById("player-hp-num");
        if (hpNum) hpNum.textContent = `${Math.round(playerHotbar.health)} / 100`;
        const hpFill = document.getElementById("player-hp-fill") as HTMLElement;
        if (hpFill) hpFill.style.width = `${Math.max(0, Math.min(100, playerHotbar.health))}%`;
        const stNum = document.getElementById("player-stamina-num");
        if (stNum) stNum.textContent = `${Math.round(playerHotbar.stamina)}%`;
        const stFill = document.getElementById("player-stamina-fill") as HTMLElement;
        if (stFill) stFill.style.width = `${Math.max(0, Math.min(100, playerHotbar.stamina))}%`;
        const pPill = document.getElementById("player-planks-pill");
        if (pPill) pPill.textContent = `🪵 ${playerHotbar.planksCarried}/5 PLANKS · ${shipSupplies.planksInBarrel} DEPOT`;
        const fPill = document.getElementById("player-food-pill");
        if (fPill) fPill.textContent = `🍌 ${playerHotbar.foodCarried}/5 FOOD · ${shipSupplies.foodInBarrel} DEPOT`;

        // Pulse Mallet hotbar icon when ship is leaking so player knows to equip hammer
        const hasActiveLeaks = playerDamage.slots.some(s => s.active);
        const malletSlotEl = document.getElementById("slot-btn-1");
        if (malletSlotEl) {
            malletSlotEl.classList.toggle("leak-alert", hasActiveLeaks && playerHotbar.selectedSlot !== 1);
        }
    }
    updateHotbarUI();

    // Hotbar click events
    for (let s = 0; s < 6; s++) {
        const btn = document.getElementById(`slot-btn-${s}`);
        if (btn) {
            btn.addEventListener("click", () => {
                selectHotbarSlot(playerHotbar, s);
                updateHotbarUI();
                playItemSwitch();
            });
        }
    }

    const audioBtn = document.getElementById("audio-btn");
    if (audioBtn) {
        audioBtn.addEventListener("click", () => {
            resumeAudio();
            const isMuted = toggleAudioMute();
            audioBtn.textContent = isMuted ? "🔇" : "🔊";
            showToast(isMuted ? "🔇 Audio Muted" : "🔊 Audio Active", "normal");
        });
    }

    // ─── STORY MODE SYSTEMS & UI ─────────────────────────────────────────────
    const dialogueUI = new DialogueUI();
    const objectiveUI = new ObjectiveUI();
    const cutscenePlayer = new CutscenePlayer(scene, camera);
    cutscenePlayer.setShipNode(shipMesh);

    const weatherRenderer = new WeatherRenderer(scene, sun, amb, skyMat);
    let currentWeather: WeatherState = createDefaultWeatherState();

    const npcView = new NpcView(scene, shipMesh);
    let npcCrew = createDefaultNpcCrew();

    const krakenView = new KrakenView(scene);
    let krakenBossState: KrakenBossState = createDefaultKrakenBoss(1);
    krakenBossState.active = false; // inactive until beat S6/S7

    const beatsData = chapterBeatsData as ChapterBeats;
    const dialogueData = chapterDialogueData as ChapterDialogue;
    const cutscenesData = chapterCutscenesData as ChapterCutscenes;

    let currentStoryBeatId = beatsData.initialBeat;
    let storyBeatTimer = 0;

    function applyBeatActions(beatId: string) {
        currentStoryBeatId = beatId;
        storyBeatTimer = 0;
        const beat = beatsData.beats.find(b => b.id === beatId);
        if (!beat) return;

        for (const act of beat.enter) {
            if (act.do === "setObjective") {
                objectiveUI.setObjective(act.text);
            } else if (act.do === "say") {
                const line = dialogueData.lines[act.line];
                if (line) dialogueUI.playLine(line);
            } else if (act.do === "setWeather") {
                currentWeather.targetIntensity = act.intensity;
                currentWeather.transitionSpeed = Math.abs(currentWeather.stormIntensity - act.intensity) / Math.max(1, act.seconds);
            } else if (act.do === "playCutscene") {
                const cs = cutscenesData.cutscenes[act.id];
                if (cs) {
                    cutscenePlayer.play(cs);
                }
            } else if (act.do === "spawn") {
                if (act.type === "wreckage_drift") {
                    spawnDriftingWreckageTargets();
                    showToast("⚠️ DRIFTING WRECKAGE DETECTED DEAD AHEAD! MAN THE CANNONS!", "warning");
                }
            } else if (act.do === "startBoss") {
                krakenBossState = createDefaultKrakenBoss(act.phase as 1 | 2 | 3);
                krakenBossState.active = true;
                showToast("🦑 THE KRAKEN HAS RISEN FROM THE DEPTHS!", "warning");
            } else if (act.do === "startVote") {
                dialogueUI.showModalScene(
                    "Ship Council",
                    "The storm rages around us. Make your choice:",
                    act.options.map(o => ({
                        id: o.id,
                        label: o.label,
                        flagKey: o.flagKey,
                        flagValue: o.flagValue
                    }))
                );
            }
        }
    }

    dialogueUI.onChoiceSelected = (choiceId, flagKey, flagValue) => {
        showToast(`🗳️ Voted: ${choiceId} (${flagKey}=${flagValue})`, "normal");
        applyBeatActions("s5_the_quiet");
        // Re-lock mouse cursor back to gameplay immediately after choice is submitted
        try { canvas.requestPointerLock(); } catch { /* ignore */ }
    };

    cutscenePlayer.onCutsceneFinished = (cutsceneId) => {
        if (cutsceneId === "cutscene_s0_wake") {
            applyBeatActions("s1_the_wheel");
            cutscenePlayer.getLetterbox().showTitle("CHAPTER I", "THE NIGHT OF THE WIDOW'S LANTERN", 3500);
        } else if (cutsceneId === "cutscene_s3_rogue_wave") {
            // After rogue wave impact, advance to s4 council vote
            applyBeatActions("s4_lightning_chart");
        } else if (cutsceneId === "cutscene_s4_lightning_reveal") {
            // Cutscene completed, choice modal is already open
        } else if (cutsceneId === "cutscene_s6_kraken_rising") {
            // Boss cutscene done -> enter phase 1 boss battle
            applyBeatActions("s7a_phase1");
            cutscenePlayer.getLetterbox().showTitle("THE KRAKEN", "TERROR OF THE DEEP", 4000);
        }
    };

    // Initialize initial beat
    applyBeatActions(currentStoryBeatId);

    // Story Debug Panel: Instant jump to any beat
    new StoryDebugPanel(beatsData, (targetBeatId) => {
        applyBeatActions(targetBeatId);
        showToast(`📜 Jumped to Story Beat: ${targetBeatId}`, "normal");
    });

    // Player position and physics
    let isAtHelm = false;
    let isGrounded = true;
    let playerLocation: "ship" | "water" | "island" = "ship";
    let isMapOpen = false;

    // ─── FULLSCREEN NAUTICAL CHART & ADVENTURE MAP (M KEY) ──────────────────────
    function renderWorldMapChart() {
        const mCanvas = document.getElementById("map-canvas") as HTMLCanvasElement | null;
        if (!mCanvas) return;
        const ctx = mCanvas.getContext("2d");
        if (!ctx) return;

        const W = mCanvas.width, H = mCanvas.height;
        ctx.clearRect(0, 0, W, H);

        // Deep sea background
        ctx.fillStyle = "#091422";
        ctx.fillRect(0, 0, W, H);

        // Latitude & Longitude nautical grid lines
        ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 80) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y < H; y += 80) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        // Map coordinate transform: world spans [-3500, +3500]
        const worldRadius = 3500;
        const mapScale = (Math.min(W, H) * 0.44) / worldRadius;
        const cx = W / 2, cy = H / 2;

        // World Boundary circular rim
        ctx.strokeStyle = "rgba(217, 119, 6, 0.45)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(cx, cy, worldRadius * mapScale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // ── 1. Draw Chapter 1 Landmarks & Route ──
        // Route Polyline
        ctx.beginPath();
        for (let i = 0; i < chapterLevel.route.length; i++) {
            const pt = chapterLevel.route[i];
            const rx = cx + pt.pos[0] * mapScale;
            const ry = cy - pt.pos[1] * mapScale;
            if (i === 0) ctx.moveTo(rx, ry);
            else ctx.lineTo(rx, ry);
        }
        ctx.strokeStyle = "rgba(251, 191, 36, 0.65)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Route Waypoints
        for (const pt of chapterLevel.route) {
            const rx = cx + pt.pos[0] * mapScale;
            const ry = cy - pt.pos[1] * mapScale;
            ctx.beginPath();
            ctx.arc(rx, ry, 4, 0, Math.PI * 2);
            ctx.fillStyle = "#fbbf24";
            ctx.fill();
        }

        // Chapter 1 Landmarks
        for (const lm of chapterLevel.landmarks) {
            const pos = lm.pos || lm.center;
            if (!pos) continue;
            const lx = cx + pos[0] * mapScale;
            const ly = cy - pos[1] * mapScale;
            const lr = Math.max(5, (lm.radius || lm.ringRadius || 40) * mapScale);

            ctx.beginPath();
            ctx.arc(lx, ly, lr, 0, Math.PI * 2);
            if (lm.id === "lantern_isle") {
                ctx.fillStyle = "#15803d"; // lush island
                ctx.strokeStyle = "#86efac";
            } else if (lm.id === "maw_basin" || lm.id === "maw_teeth") {
                ctx.fillStyle = "rgba(45, 212, 191, 0.4)";
                ctx.strokeStyle = "#2dd4bf";
            } else {
                ctx.fillStyle = "#475569";
                ctx.strokeStyle = "#94a3b8";
            }
            ctx.lineWidth = 1.5;
            ctx.fill();
            ctx.stroke();

            ctx.font = "bold 9px 'Orbitron', sans-serif";
            ctx.fillStyle = "#f8fafc";
            ctx.textAlign = "center";
            ctx.fillText(lm.id.replace(/_/g, " ").toUpperCase(), lx, ly - lr - 4);
        }

        // ── 2. Enemy Warship Blip ──
        if (!enemyDamage.isSunk) {
            const ex = cx + enemyShipState.x * mapScale;
            const ey = cy - enemyShipState.z * mapScale;
            ctx.save();
            ctx.translate(ex, ey);
            ctx.rotate(enemyShipState.heading);
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.moveTo(0, -9);
            ctx.lineTo(6, 6);
            ctx.lineTo(0, 3);
            ctx.lineTo(-6, 6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            ctx.font = "bold 9px 'Rajdhani', sans-serif";
            ctx.fillStyle = "#fca5a5";
            ctx.textAlign = "center";
            ctx.fillText("HMS Dreadnought", ex, ey + 15);
        }

        // ── 3. Player Ship Blip ──
        const px = cx + shipState.x * mapScale;
        const py = cy - shipState.z * mapScale;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(shipState.heading);

        // Galleon icon
        ctx.fillStyle = "#fbbf24";
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(7, 7);
        ctx.lineTo(0, 4);
        ctx.lineTo(-7, 7);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        ctx.font = "bold 10px 'Orbitron', sans-serif";
        ctx.fillStyle = "#fbbf24";
        ctx.textAlign = "center";
        ctx.fillText("⭐ YOUR WARSHIP", px, py + 16);

        // Compass Rose in top corner
        ctx.save();
        ctx.translate(W - 60, 60);
        ctx.fillStyle = "rgba(251, 191, 36, 0.85)";
        ctx.font = "bold 12px 'Orbitron', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("N", 0, -22);
        ctx.beginPath();
        ctx.moveTo(0, -18); ctx.lineTo(6, 0); ctx.lineTo(0, 4); ctx.lineTo(-6, 0); ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function populateIslandSidebar() {
        const listEl = document.getElementById("island-list");
        if (!listEl) return;
        listEl.innerHTML = "";

        const countEl = document.getElementById("sidebar-island-count");
        if (countEl) countEl.textContent = worldMap.islands.length.toString();

        for (const isl of worldMap.islands) {
            const card = document.createElement("div");
            card.className = "island-card";

            const typeColor = isl.type === "fortress" ? "#eab308" : isl.type === "archipelago_hub" ? "#34d399" : "#fbbf24";
            const typeLabel = isl.type.replace("_", " ");

            card.innerHTML = `
                <div class="ic-header">
                    <span class="ic-name">${isl.name}</span>
                    <span class="ic-type" style="color:${typeColor}">${typeLabel}</span>
                </div>
                <div class="ic-coords">📍 Pos: (${isl.x}, ${isl.z}) · Size: ${isl.radius}m Radius · Peak: +${isl.height}m</div>
                <div class="ic-resources">
                    <span>🪵 ${isl.resources.woodPlanks}</span>
                    <span>🍌 ${isl.resources.bananas}</span>
                    <span>💣 ${isl.resources.cannonballs}</span>
                    <span style="color:#fbbf24">🪙 ${isl.resources.ancientGold}g</span>
                </div>
                ${isl.mission ? `
                <div class="ic-mission">
                    <div class="ic-m-title">📜 ${isl.mission.title} (${isl.mission.difficulty})</div>
                    <div class="ic-m-desc">${isl.mission.description}</div>
                    <div class="ic-m-reward">Reward: +${isl.mission.rewardGold} Gold 💰</div>
                </div>` : ""}
            `;
            listEl.appendChild(card);
        }
    }

    function toggleWorldMap() {
        isMapOpen = !isMapOpen;
        const modal = document.getElementById("world-map-modal");
        if (!modal) return;

        if (isMapOpen) {
            modal.classList.add("open");
            document.exitPointerLock();
            renderWorldMapChart();
            populateIslandSidebar();
            showToast("🗺️ Chart Opened! Review islands, resources & quests", "normal");
        } else {
            modal.classList.remove("open");
            canvas.requestPointerLock();
        }
    }

    const mapCloseBtn = document.getElementById("map-close-btn");
    if (mapCloseBtn) {
        mapCloseBtn.addEventListener("click", () => {
            if (isMapOpen) toggleWorldMap();
        });
    }


    // Ship-relative coordinates (when on ship)
    const pPos = new Vector3(0, POOP_DECK_Y + 1.85, -12.5);
    // World coordinates (when swimming in water or walking on islands)
    const pWorldPos = new Vector3(0, POOP_DECK_Y + 1.85, -12.5);
    const pVel = new Vector3(0, 0, 0);
    const GRAVITY = 14.0, JUMP_V = 5.5;

    // ─── LADDER BOARDING DETECTION ───────────────────────────────────────────
    const getNearLadder = (): { side: "port" | "starboard"; dist: number } | null => {
        const cosH = Math.cos(shipState.heading);
        const sinH = Math.sin(shipState.heading);

        // Ladder world positions on port and starboard
        for (const side of ["port", "starboard"] as const) {
            const lx = side === "port" ? -SHIP_LADDER_X : SHIP_LADDER_X;
            const lz = SHIP_LADDER_Z;
            const ladderWorldX = shipState.x + lx * cosH + lz * sinH;
            const ladderWorldZ = shipState.z - lx * sinH + lz * cosH;
            const ladderWorldY = shipMesh.position.y + 1.8;

            const curX = pWorldPos.x;
            const curY = pWorldPos.y;
            const curZ = pWorldPos.z;

            if (playerLocation === "ship") {
                const dxLocal = pPos.x - lx;
                const dzLocal = pPos.z - lz;
                const dLocal = Math.sqrt(dxLocal * dxLocal + dzLocal * dzLocal);
                if (dLocal < 2.4) {
                    return { side, dist: dLocal };
                }
            } else {
                const dx = curX - ladderWorldX;
                const dy = curY - ladderWorldY;
                const dz = curZ - ladderWorldZ;
                const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (d < LADDER_INTERACT_RADIUS + 0.8) {
                    return { side, dist: d };
                }
            }
        }
        return null;
    };

    // ─── INPUT HANDLING ──────────────────────────────────────────────────────
    const keys = new Set<string>();

    const getBarrelDist = () => {
        const dx = pPos.x - 0, dz = pPos.z - 0.5;
        return Math.sqrt(dx * dx + dz * dz);
    };

    const getWheelDist = () => {
        const dx = pPos.x - 0, dz = pPos.z - (-14.0);
        return Math.sqrt(dx * dx + dz * dz);
    };

    const BILGE_INTERACT_RADIUS = 2.4;
    const getBilgeDist = () => {
        const dx = pPos.x - 0, dz = pPos.z - (-3.2);
        return Math.sqrt(dx * dx + dz * dz);
    };

    const getPlankBarrelDist = () => {
        const dx = pPos.x - 0, dz = pPos.z - (-1.6);
        return Math.sqrt(dx * dx + dz * dz);
    };

    const getFoodBarrelDist = () => {
        const dx = pPos.x - (-2.2), dz = pPos.z - (-1.6);
        return Math.sqrt(dx * dx + dz * dz);
    };

    const nearLeak = (): { slot: typeof playerDamage.slots[0]; dist: number } | null => {
        let bestDist = 2.5;
        let bestSlot: typeof playerDamage.slots[0] | null = null;
        for (const slot of playerDamage.slots) {
            if (slot.active) {
                const dx = pPos.x - slot.localPos.x;
                const dz = pPos.z - slot.localPos.z;
                const d = Math.sqrt(dx * dx + dz * dz);
                if (d < bestDist) {
                    bestDist = d;
                    bestSlot = slot;
                }
            }
        }
        return bestSlot ? { slot: bestSlot, dist: bestDist } : null;
    };

    const nearCannon = (): { c: CannonState; h: typeof shipHandles.cannons[0]; dist: number } | null => {
        let bestDist = CANNON_INTERACT_RADIUS;
        let best: { c: CannonState; h: typeof shipHandles.cannons[0]; dist: number } | null = null;
        for (const c of cannonShip.cannons) {
            const lp = cannonLocalPos(c.side, c.index);
            const dx = pPos.x - lp.x, dz = pPos.z - lp.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            if (dist < bestDist) {
                bestDist = dist;
                const h = shipHandles.cannons.find(h => h.side === c.side && h.index === c.index)!;
                best = { c, h, dist };
            }
        }
        return best;
    };

    type InteractTarget =
        | { type: "none" }
        | { type: "helm" }
        | { type: "cannon"; nc: NonNullable<ReturnType<typeof nearCannon>> }
        | { type: "barrel" }
        | { type: "plankBarrel" }
        | { type: "foodBarrel" }
        | { type: "bilge" }
        | { type: "patch"; slot: typeof playerDamage.slots[0] }
        | { type: "ladder"; side: "port" | "starboard" };

    const getInteractTarget = (): InteractTarget => {
        if (activeCannon || isAtHelm) return { type: "none" };

        // If player is swimming in ocean, ladders are highest priority to board the ship
        if (playerLocation !== "ship") {
            const nearLad = getNearLadder();
            if (nearLad) {
                return { type: "ladder", side: nearLad.side };
            }
        }

        if (playerLocation === "ship") {
            if (getWheelDist() < 2.5) return { type: "helm" };

            const nc = nearCannon();
            const bDist = getBarrelDist();
            const pbDist = getPlankBarrelDist();
            const fbDist = getFoodBarrelDist();
            const nLeak = nearLeak();
            const nearGrate = getBilgeDist() < BILGE_INTERACT_RADIUS;

            if (nLeak) return { type: "patch", slot: nLeak.slot };
            if (pbDist < 2.2) return { type: "plankBarrel" };
            if (fbDist < 2.2) return { type: "foodBarrel" };
            if (nc && bDist < BARREL_INTERACT_RADIUS) {
                return nc.dist < bDist ? { type: "cannon", nc } : { type: "barrel" };
            }
            if (nc) return { type: "cannon", nc };
            if (bDist < BARREL_INTERACT_RADIUS) return { type: "barrel" };
            if (nearGrate) return { type: "bilge" };

            // When on ship, only offer ladder if right at the outer gunwale edge (X > 4.6)
            if (Math.abs(pPos.x) >= 4.6) {
                const nearLad = getNearLadder();
                if (nearLad) {
                    return { type: "ladder", side: nearLad.side };
                }
            }
        }

        return { type: "none" };
    };

    function triggerShipHit(hx: number, hy: number, hz: number) {
        cameraShake = 0.65;
        playHullImpact();
        createExplosionVFX({ x: hx, y: hy, z: hz });

        // Blast damage to player if close (< 4.5m)
        const pWorld = playerNode.getAbsolutePosition();
        const distToPlayer = Math.sqrt((hx - pWorld.x)**2 + (hy - pWorld.y)**2 + (hz - pWorld.z)**2);
        if (distToPlayer < CANNONBALL_SPLASH_RADIUS) {
            const hurt = damagePlayer(playerHotbar, CANNONBALL_PLAYER_DAMAGE);
            cameraShake = 0.85;
            const vign = document.getElementById("damage-vignette")!;
            vign.classList.add("hurt");
            setTimeout(() => vign.classList.remove("hurt"), 320);
            updateHotbarUI();

            if (hurt.died) {
                showToast("☠️ YOU WERE SLAIN BY CANNONFIRE! Respawning on deck...", "warning");
                setTimeout(() => {
                    respawnPlayer(playerHotbar);
                    playerLocation = "ship";
                    playerNode.parent = shipMesh;
                    pPos.set(0, POOP_DECK_Y + 1.85, -12.5);
                    pVel.set(0, 0, 0);
                    isGrounded = true;
                    updateHotbarUI();
                    showToast("⚓ Respawned at the helm!", "success");
                }, 3000);
            } else {
                showToast(`💥 HIT BY CANNONBALL! -${CANNONBALL_PLAYER_DAMAGE}% HP! (${playerHotbar.health} HP left)`, "warning");
            }
        }

        // Convert to player ship-local space
        const dx = hx - shipState.x;
        const dz = hz - shipState.z;
        const ch = Math.cos(-shipState.heading);
        const sh = Math.sin(-shipState.heading);
        const localHit = {
            x: dx * ch - dz * sh,
            y: hy - shipMesh.position.y,
            z: dx * sh + dz * ch,
        };

        const pDmgRes = applyDamageHit(playerDamage, localHit, 1);
        if (pDmgRes.slotActivated) {
            showToast(`💥 CANNONBALL STRUCK OUR SHIP! Breached Hull at Z=${localHit.z.toFixed(1)}m (Level ${pDmgRes.slotActivated.severity} Leak)! Grab Mallet & Planks to Repair!`, "warning");
        } else if (pDmgRes.upgraded) {
            showToast("💥 CANNONBALL STRUCK OUR SHIP! Expanded Leak on Our Hull!", "warning");
        } else {
            showToast("💥 CANNONBALL STRUCK OUR SHIP!", "warning");
        }
    }

    function isAimingOverboard(pos: Vector3, lookYaw: number): boolean {
        const fwdX = Math.sin(lookYaw);
        const fwdZ = Math.cos(lookYaw);
        // Port side railing
        if (pos.x < -2.1 && fwdX < -0.2) return true;
        // Starboard side railing
        if (pos.x > 2.1 && fwdX > 0.2) return true;
        // Stern (aft) railing
        if (pos.z < -14.2 && fwdZ < -0.2) return true;
        // Bow (fore) railing
        if (pos.z > 13.5 && fwdZ > 0.2) return true;
        // Forecastle side rails
        if (pos.z > 10.0) {
            if (pos.x < -1.7 && fwdX < -0.2) return true;
            if (pos.x > 1.7 && fwdX > 0.2) return true;
        }
        return false;
    }

    function tryStartRepair(slotId: number) {
        if (playerHotbar.selectedSlot !== 1) {
            showToast("⚠️ Equip the Mallet (Slot 2) to repair leaks!", "warning");
            return;
        }
        if (isRepairing) {
            showToast("🔨 Repair already in progress — hold still!", "warning");
            return;
        }
        if (repairCooldownEnd > Date.now()) {
            const secLeft = ((repairCooldownEnd - Date.now()) / 1000).toFixed(1);
            showToast(`⏳ Hammer cooldown — wait ${secLeft}s before next repair!`, "warning");
            return;
        }
        if (playerHotbar.planksCarried <= 0) {
            showToast("⚠️ Out of planks! Fetch planks from the Planks Depot (poop deck).", "warning");
            return;
        }
        const targetSlot = playerDamage.slots.find(s => s.id === slotId);
        if (!targetSlot || !targetSlot.active) {
            showToast("✅ Hull at this location is intact!", "success");
            return;
        }

        // Start 5-second repair
        isRepairing = true;
        repairSlotId = slotId;
        repairAnimTimer = 0;
        repairStrikeTimer = 0;
        repairStartPos.copyFrom(pPos);
        hammerSwing = 1.0;
        playPlankPlacement();
        playHammerStrike();

        const vis = playerLeakVisuals.get(slotId);
        if (vis) spawnHammerSparks(vis.root.getAbsolutePosition());

        const rpEl = document.getElementById("repair-progress");
        if (rpEl) rpEl.classList.add("active");
        const rpFill = document.getElementById("rp-bar-fill");
        if (rpFill) rpFill.style.width = "0%";
        const rpLabel = document.getElementById("rp-label");
        if (rpLabel) rpLabel.textContent = `🔨 REPAIRING... 0% (${REPAIR_DURATION.toFixed(1)}s)`;

        showToast("🔨 Repairing hull breach — hold still for 5 seconds!", "success");
    }

    function handleBucketScoop() {
        if (playerHotbar.selectedSlot !== 3) {
            showToast("⚠️ Equip the Bucket (Slot 4) to bail water!", "warning");
            return;
        }
        if (bucketFull) {
            showToast("💧 Bucket is already full of bilge water! Walk to rail & dump overboard!", "warning");
            return;
        }
        if (playerDamage.waterLevel <= 0) {
            showToast("✅ Ship bilge is dry — no water to scoop!", "normal");
            return;
        }
        if (bucketCooldownEnd > Date.now()) {
            showToast("💧 Wait a moment between bucket scoops!", "warning");
            return;
        }

        const scoop = Math.min(playerDamage.waterLevel, BUCKET_CAPACITY);
        playerDamage.waterLevel = Math.max(0, playerDamage.waterLevel - scoop);
        bucketHeldWater = scoop;
        bucketFull = true;
        bucketSwing = 1.0;
        bucketCooldownEnd = Date.now() + (BUCKET_COOLDOWN * 1000);
        cameraShake = Math.max(cameraShake, 0.05);

        bucketWaterDisc.setEnabled(true);
        playBucketScoop();

        const pAbs = playerNode.getAbsolutePosition();
        spawnBucketSplash(pAbs.x, pAbs.y - EYE_H + 0.3, pAbs.z);

        showToast(`💧 Scooped ${Math.round(scoop * 100)}% bilge water from ship bottom! Walk to railing & dump OVERBOARD!`, "success");
    }

    function handleBucketDump() {
        if (playerHotbar.selectedSlot !== 3) return;
        if (!bucketFull) {
            // Directly scoop water from bottom of ship!
            handleBucketScoop();
            return;
        }
        if (bucketCooldownEnd > Date.now()) {
            showToast("💧 Bucket swinging — wait a moment!", "warning");
            return;
        }

        const lookYaw = isThirdPerson ? tpYaw : camera.rotation.y;
        const isOverboard = isAimingOverboard(pPos, lookYaw);

        bucketFull = false;
        bucketSwing = 1.0;
        bucketCooldownEnd = Date.now() + (BUCKET_COOLDOWN * 1000);
        bucketWaterDisc.setEnabled(false);

        const fwdX = Math.sin(lookYaw), fwdZ = Math.cos(lookYaw);
        const cosH = Math.cos(shipState.heading), sinH = Math.sin(shipState.heading);

        if (isOverboard) {
            // SUCCESS: Dumped overboard into the sea!
            const dumpedPct = Math.round(bucketHeldWater * 100);
            bucketHeldWater = 0;

            const slx = pPos.x + fwdX * 3.5;
            const slz = pPos.z + fwdZ * 3.5;
            const wx = shipState.x + slx * cosH + slz * sinH;
            const wz = shipState.z - slx * sinH + slz * cosH;
            spawnBucketSplash(wx, 0.2, wz);
            playBucketDumpOverboard();

            isBailing = true;
            setTimeout(() => { isBailing = false; }, 1500);
            showToast(`🌊 SWOOSH! Dumped ${dumpedPct}% bilge water overboard into the ocean!`, "success");
        } else {
            // SOT FAIL: Dumped water back inside ship!
            const spilledPct = Math.round(bucketHeldWater * 100);
            playerDamage.waterLevel = Math.min(1.0, playerDamage.waterLevel + bucketHeldWater);
            bucketHeldWater = 0;

            const dlx = pPos.x + fwdX * 1.2;
            const dlz = pPos.z + fwdZ * 1.2;
            const wx = shipState.x + dlx * cosH + dlz * sinH;
            const wz = shipState.z - dlx * sinH + dlz * cosH;
            spawnBucketSplash(wx, pPos.y - EYE_H + 0.3, wz);
            playBucketSpillInside();

            showToast(`💦 SPLASH! You dumped the water BACK INSIDE the boat! (+${spilledPct}% flood)`, "warning");
        }
    }

    window.addEventListener("keydown", e => {
        resumeAudio();
        keys.add(e.code);

        // E: Interact / Mount / Take / Dismount
        if (e.code === "KeyE") {
            if (activeCannon) {
                // Dismount cannon
                activeCannon = null; activeHandle = null;
                fpHandsRoot.setEnabled(false);
                fpItemsRoot.setEnabled(!isThirdPerson);
                pirateAvatar.setEnabled(isThirdPerson);
                arcDots.forEach(d => d.isVisible = false);
                pPos.y = MAIN_DECK_Y + EYE_H;
                pVel.y = 0;
                isGrounded = true;
                camera.attachControl(canvas, true);
                camera.keysUp = []; camera.keysDown = []; camera.keysLeft = []; camera.keysRight = [];
            } else if (isAtHelm) {
                isAtHelm = false; shipInput.rudder = 0;
            } else {
                const target = getInteractTarget();
                if (target.type === "helm") {
                    isAtHelm = true;
                    isGrounded = false;
                    camera.rotation.y = 0; camera.rotation.x = 0;
                } else if (target.type === "cannon") {
                    activeCannon = target.nc.c; activeHandle = target.nc.h;
                    isGrounded = false;
                    fpHandsRoot.setEnabled(true);
                    fpItemsRoot.setEnabled(false);
                    const baseAngle = activeCannon.side === "L" ? -Math.PI / 2 : Math.PI / 2;
                    camera.rotation.y = baseAngle + activeCannon.aimYaw;
                    camera.rotation.x = -activeCannon.aimPitch;
                    camera.detachControl();
                } else if (target.type === "barrel") {
                    if (playerAmmo.stacks >= 2) {
                        showToast("⚠️ Inventory Full! Carrying max 2 Stacks (32 Balls).", "warning");
                    } else if (cannonShip.barrelStacks <= 0) {
                        showToast("⚠️ Central Ammo Depot is Empty!", "warning");
                    } else {
                        pickupFromBarrel(playerAmmo, cannonShip);
                        renderPlayerAmmo(playerAmmo);
                        renderBarrelHUD(cannonShip.barrelStacks);
                        updateHotbarUI();
                        playAmmoPickup();
                        showToast(`📦 Picked up 1 Stack (+16 Balls) from Depot! (${playerAmmo.stacks}/2 Stacks carried)`, "success");
                    }
                } else if (target.type === "plankBarrel") {
                    const taken = takePlanksFromBarrel(playerHotbar, shipSupplies, 1);
                    if (taken > 0) {
                        updateHotbarUI();
                        playPlankPickup();
                        showToast(`🪵 Took 1 Plank from Depot! (${playerHotbar.planksCarried}/5 Carried)`, "success");
                    } else if (shipSupplies.planksInBarrel <= 0) {
                        showToast("⚠️ Planks Depot is Empty!", "warning");
                    } else {
                        showToast("⚠️ Carrying max planks (5/5)!", "warning");
                    }
                } else if (target.type === "foodBarrel") {
                    const taken = takeFoodFromBarrel(playerHotbar, shipSupplies, 1);
                    if (taken > 0) {
                        updateHotbarUI();
                        playFoodPickup();
                        showToast(`🍌 Took 1 Banana from Provisions! (${playerHotbar.foodCarried}/5 Carried · ${shipSupplies.foodInBarrel} in Barrel)`, "success");
                    } else if (shipSupplies.foodInBarrel <= 0) {
                        showToast("⚠️ Provisions Barrel is Empty!", "warning");
                    } else {
                        showToast("⚠️ Carrying max bananas (5/5)!", "warning");
                    }
                } else if (target.type === "bilge") {
                    handleBucketScoop();
                } else if (target.type === "patch") {
                    tryStartRepair(target.slot.id);
                } else if (target.type === "ladder") {
                    // Board ship or climb down ladder
                    if (playerLocation !== "ship") {
                        // Board from ocean / shore onto main deck
                        playerLocation = "ship";
                        playerNode.parent = shipMesh;
                        const lx = target.side === "port" ? -4.2 : 4.2;
                        pPos.set(lx, MAIN_DECK_Y + EYE_H, SHIP_LADDER_Z);
                        pVel.set(0, 0, 0);
                        isGrounded = true;
                        playLadderClimb();
                        showToast(`⚓ Boarded ship via ${target.side} ladder!`, "success");
                    } else {
                        // Climb down ladder into ocean
                        const cosH = Math.cos(shipState.heading);
                        const sinH = Math.sin(shipState.heading);
                        const lx = target.side === "port" ? -SHIP_LADDER_X - 1.2 : SHIP_LADDER_X + 1.2;
                        const lz = SHIP_LADDER_Z;
                        pWorldPos.x = shipState.x + lx * cosH + lz * sinH;
                        pWorldPos.z = shipState.z - lx * sinH + lz * cosH;
                        pWorldPos.y = WATERLINE_Y + 0.5;
                        playerLocation = "water";
                        playerNode.parent = null;
                        pVel.set(0, 0, 0);
                        playLadderClimb();
                        playWaterSplash(0.6);
                        showToast(`🌊 Climbed down ${target.side} ladder into ocean!`, "normal");
                    }
                }
            }
        }

        // F: Deposit Stack / Store Planks / Store Food
        if (e.code === "KeyF" && !activeCannon && !isAtHelm) {
            const target = getInteractTarget();
            if (target.type === "barrel") {
                if (playerAmmo.stacks <= 0 && playerAmmo.loose <= 0) {
                    showToast("⚠️ You have no cannonballs in inventory to store!", "warning");
                } else if (cannonShip.barrelStacks >= BARREL_STACK_CAPACITY) {
                    showToast("⚠️ Ammo Depot is at maximum capacity (20 Stacks)!", "warning");
                } else {
                    depositToBarrel(playerAmmo, cannonShip);
                    renderPlayerAmmo(playerAmmo);
                    renderBarrelHUD(cannonShip.barrelStacks);
                    updateHotbarUI();
                    playAmmoPickup();
                    showToast(`📦 Stored 1 Stack in Depot! (${cannonShip.barrelStacks}/20 Stacks stored)`, "success");
                }
            } else if (target.type === "plankBarrel") {
                const stored = storePlanksInBarrel(playerHotbar, shipSupplies, 1);
                if (stored > 0) {
                    updateHotbarUI();
                    playPlankPickup();
                    showToast(`🪵 Stored 1 Plank in Depot! (${shipSupplies.planksInBarrel}/20 Stored)`, "success");
                } else {
                    showToast("⚠️ No carried planks to store!", "warning");
                }
            } else if (target.type === "foodBarrel") {
                const stored = storeFoodInBarrel(playerHotbar, shipSupplies, 1);
                if (stored > 0) {
                    updateHotbarUI();
                    playFoodPickup();
                    showToast(`🍌 Stored 1 Banana in Provisions! (${shipSupplies.foodInBarrel}/20 Stored)`, "success");
                } else {
                    showToast("⚠️ No carried bananas to store!", "warning");
                }
            }
        }

        // Hotbar selection with number keys 1 to 6
        if (e.code === "Digit1") { selectHotbarSlot(playerHotbar, 0); updateHotbarUI(); playItemSwitch(); }
        if (e.code === "Digit2") { selectHotbarSlot(playerHotbar, 1); updateHotbarUI(); playItemSwitch(); }
        if (e.code === "Digit3") { selectHotbarSlot(playerHotbar, 2); updateHotbarUI(); playItemSwitch(); }
        if (e.code === "Digit4") { selectHotbarSlot(playerHotbar, 3); updateHotbarUI(); playItemSwitch(); }
        if (e.code === "Digit5") { selectHotbarSlot(playerHotbar, 4); updateHotbarUI(); playItemSwitch(); }
        if (e.code === "Digit6") { selectHotbarSlot(playerHotbar, 5); updateHotbarUI(); playItemSwitch(); }

        // M: Toggle Fullscreen Nautical World Map & Adventure Chart
        if (e.code === "KeyM") {
            toggleWorldMap();
        }

        // F3: Toggle Chapter 1 Scenery Debug Overlay
        if (e.code === "F3") {
            const dbgPanel = document.getElementById("story-debug-panel");
            if (dbgPanel) {
                const isHidden = dbgPanel.style.display === "none";
                dbgPanel.style.display = isHidden ? "flex" : "none";
                showToast(isHidden ? "🛠️ Scenery Debug Overlay: ON" : "🛠️ Scenery Debug Overlay: OFF", "normal");
            }
        }

        // F4: Teleport to Next Route Point
        if (e.code === "F4") {
            let nextPtIdx = 0;
            let minDist = Infinity;
            for (let i = 0; i < chapterLevel.route.length; i++) {
                const pt = chapterLevel.route[i];
                const d = Math.hypot(shipState.x - pt.pos[0], shipState.z - pt.pos[1]);
                if (d < minDist) {
                    minDist = d;
                    nextPtIdx = (i + 1) % chapterLevel.route.length;
                }
            }
            const targetPt = chapterLevel.route[nextPtIdx];
            currentRouteWaypointIndex = nextPtIdx;
            shipState.x = targetPt.pos[0];
            shipState.z = targetPt.pos[1];
            shipState.speed = 0;
            showToast(`🚀 Teleported to Route ${targetPt.id.toUpperCase()} (${targetPt.pos[0]}, ${targetPt.pos[1]})`, "success");
        }

        // Escape: Close Map if open
        if (e.code === "Escape") {
            if (isMapOpen) {
                toggleWorldMap();
            }
        }

        // T: Test simulated incoming cannonball strike on our ship
        if (e.code === "KeyT" && !activeCannon && !isAtHelm) {
            const targetSlot = playerDamage.slots.find(s => !s.active) || playerDamage.slots[0];
            const ch = Math.cos(shipState.heading);
            const sh = Math.sin(shipState.heading);
            const wx = shipState.x + targetSlot.localPos.x * ch + targetSlot.localPos.z * sh;
            const wy = shipMesh.position.y + targetSlot.localPos.y;
            const wz = shipState.z - targetSlot.localPos.x * sh + targetSlot.localPos.z * ch;
            triggerShipHit(wx, wy, wz);
        }

        // V: Toggle First-Person / Third-Person Camera
        if (e.code === "KeyV" && !activeCannon && !isAtHelm) {
            isThirdPerson = !isThirdPerson;
            if (isThirdPerson) {
                tpYaw = camera.rotation.y;
                tpPitch = Math.max(-0.2, Math.min(0.45, camera.rotation.x || 0.15));
            } else {
                camera.rotation.y = tpYaw;
                camera.rotation.x = tpPitch;
                camera.position.set(0, 0, 0);
            }
            pirateAvatar.setEnabled(isThirdPerson);
            fpItemsRoot.setEnabled(!isThirdPerson);
            showToast(isThirdPerson ? "🎥 Third-Person Camera (Press [V] for First-Person)" : "🎥 First-Person Camera (Press [V] for Third-Person)", "normal");
        }


        // R: Load Ammo from Player Inventory into Cannon
        if (e.code === "KeyR") {
            const itarget = getInteractTarget();
            const targetCannon = activeCannon || (itarget.type === "cannon" ? itarget.nc.c : null);
            if (targetCannon) {
                if (targetCannon.ammoLoaded >= CANNON_STACK_SIZE) {
                    showToast("⚠️ Cannon is already fully loaded (16/16 Balls)!", "warning");
                } else if (playerAmmo.stacks <= 0 && playerAmmo.loose <= 0) {
                    showToast("⚠️ No carried cannonballs! Press [E] at the Ammo Depot to fetch stacks.", "warning");
                } else {
                    const loaded = loadCannonFromPlayer(targetCannon, playerAmmo);
                    if (loaded > 0) playCannonReload();
                    renderPlayerAmmo(playerAmmo);
                    if (activeCannon) renderCannonStationHUD(activeCannon);
                    showToast(`⚡ Loaded ${loaded} balls into Cannon! (${targetCannon.ammoLoaded}/16 Balls)`, "success");
                }
            }
        }

        if (e.code === "Space" && !isAtHelm && !activeCannon && isGrounded) {
            pVel.y = JUMP_V;
            isGrounded = false;
        }

        if (isAtHelm) {
            if (e.code === "KeyW") shipInput.sail = Math.min(1, shipInput.sail + 0.5);
            if (e.code === "KeyS") shipInput.sail = Math.max(0, shipInput.sail - 0.5);
        }
    });

    window.addEventListener("keyup", e => keys.delete(e.code));

    // Mouse look — cannon aim OR free-look (first & third person)
    window.addEventListener("mousemove", e => {
        if (document.pointerLockElement !== canvas) return;
        if (activeCannon) {
            aimCannon(activeCannon, e.movementX * 0.002, -e.movementY * 0.002);
        } else if (isThirdPerson) {
            // Orbit camera around player for 3rd-person
            tpYaw   += e.movementX * 0.003;
            tpPitch  = Math.max(-0.3, Math.min(0.7, tpPitch + e.movementY * 0.003));
            // Note: + movementY so mouse-up = camera drops lower/behind (natural 3P feel)
        } else {
            // Classic first-person look — standard (non-inverted)
            camera.rotation.y += e.movementX * 0.002;
            camera.rotation.x  = Math.max(-1.4, Math.min(1.4,
                camera.rotation.x + e.movementY * 0.002));
        }
    });

    // Fire Cannon
    const doFire = () => {
        if (!activeCannon || !activeHandle) return;
        if (activeCannon.ammoLoaded <= 0) {
            showToast("⚠️ CANNON OUT OF AMMO (0/16)! Press [R] to Load Ammo or [E] to fetch from Depot.", "warning");
            return;
        }
        const result = fireCannon(activeCannon, cannonShip, shipState.heading);
        if (!result.fired) {
            return; // Still reloading
        }
        playCannonFire(false);

        const shipVx = Math.sin(shipState.heading) * shipState.speed;
        const shipVz = Math.cos(shipState.heading) * shipState.speed;
        const lp = cannonLocalPos(activeCannon.side, activeCannon.index);
        const ps = createProjectile(
            shipState.x, shipMesh.position.y, shipState.z,
            shipState.heading, shipVx, shipVz,
            lp.x, lp.z, lp.y,
            result.worldAimYaw, result.aimPitch, result.muzzleSpeed, 0,
        );

        const muzzlePos = activeHandle.muzzleTip.getAbsolutePosition();
        ps.x = muzzlePos.x;
        ps.y = muzzlePos.y;
        ps.z = muzzlePos.z;

        const bMesh = MeshBuilder.CreateSphere("ball", { diameter: 0.38, segments: 6 }, scene) as Mesh;
        bMesh.position.set(ps.x, ps.y, ps.z);
        const bMat = new StandardMaterial("bm", scene);
        bMat.diffuseColor = new Color3(0.08, 0.08, 0.08);
        bMesh.material = bMat;
        projectiles.push({ state: ps, mesh: bMesh, firedFrom: activeCannon, firedBy: "player" });

        // Trigger recoil kick
        activeHandle.recoilZ = 0.55;

        // Update station HUD immediately
        renderCannonStationHUD(activeCannon);

        if (activeCannon.ammoLoaded === 0) {
            showToast("⚠️ Last cannonball fired! Cannon is now EMPTY (0/16).", "warning");
        }
    };

    canvas.addEventListener("mousedown", e => {
        resumeAudio();
        if (e.button === 0) {
            if (activeCannon) {
                doFire();
            } else {
                const target = getInteractTarget();
                if (target.type === "patch") {
                    tryStartRepair(target.slot.id);
                } else if (playerHotbar.selectedSlot === 1) {
                    if (isRepairing) {
                        showToast("🔨 Repair already in progress — hold still!", "warning");
                    } else if (repairCooldownEnd > Date.now()) {
                        const secLeft = ((repairCooldownEnd - Date.now()) / 1000).toFixed(1);
                        showToast(`⏳ Hammer cooldown — ${secLeft}s remaining`, "warning");
                    } else {
                        hammerSwing = 1.0;
                        playHammerStrike();
                    }
                } else if (playerHotbar.selectedSlot === 3) {
                    handleBucketDump();
                } else if (playerHotbar.selectedSlot === 4) {
                    if (isEatingBanana) {
                        // Already eating!
                        return;
                    } else if (playerHotbar.health >= playerHotbar.maxHealth) {
                        showToast("💚 Health is already full (100/100)!", "normal");
                    } else if (playerHotbar.foodCarried <= 0) {
                        showToast("⚠️ Out of bananas! Restock at Provisions Barrel (main deck).", "warning");
                    } else {
                        isEatingBanana = true;
                        bananaEatTimer = BANANA_EAT_DURATION;
                        bananaBitePhase = 0;
                        playEatBite();
                        showToast("🍌 Munching banana...", "normal");
                    }
                }

            }
        }
        if (e.button === 2) {
            if (playerHotbar.selectedSlot === 5) {
                isZoomed = true;
            }
        }
    });

    canvas.addEventListener("mouseup", e => {
        if (e.button === 2) {
            isZoomed = false;
        }
    });

    window.addEventListener("wheel", e => {
        if (activeCannon) return;
        const dir = e.deltaY > 0 ? 1 : -1;
        let nextSlot = (playerHotbar.selectedSlot + dir) % 6;
        if (nextSlot < 0) nextSlot += 6;
        selectHotbarSlot(playerHotbar, nextSlot);
        updateHotbarUI();
        playItemSwitch();
    });
    canvas.addEventListener("click", () => {
        if (dialogueUI.isModalOpen() || isMapOpen) return;
        canvas.requestPointerLock();
    });

    // Initial HUD Renders
    renderPlayerAmmo(playerAmmo);
    renderBarrelHUD(cannonShip.barrelStacks);

    // ─── RENDER LOOP ─────────────────────────────────────────────────────────
    let time = 0, wheelAngle = 0;

    scene.onBeforeRenderObservable.add(() => {
        const dt = Math.min(engine.getDeltaTime() * 0.001, 0.05);
        time += dt;
        wMat.setFloat("time", time);

        // Helm Steering
        if (isAtHelm) {
            shipInput.rudder = 0;
            if (keys.has("KeyA")) shipInput.rudder = -1;
            if (keys.has("KeyD")) shipInput.rudder = 1;
        }
        stepShip(shipState, shipInput, dt);
        stepCannons(cannonShip, dt);

        // ── Buoyancy & Wave Physics ───────────────────────────────────────────
        const cosH = Math.cos(shipState.heading), sinH = Math.sin(shipState.heading);
        const gp = (lx: number, lz: number) => {
            const wx = shipState.x + lx*cosH + lz*sinH;
            const wz = shipState.z - lx*sinH + lz*cosH;
            return heightAt(wx, wz, time);
        };
        const yF = gp(0, SHIP_L/2), yB = gp(0, -SHIP_L/2);
        const yL = gp(-SHIP_W/2, 0), yR = gp(SHIP_W/2, 0);
        const heave = (yF + yB + yL + yR) / 4;
        const pitch = Math.atan2(yB - yF, SHIP_L) * 0.18;
        const roll  = Math.atan2(yL - yR, SHIP_W) * 0.18;

        // ── Ship Damage, Buoyancy & Motility Penalties ────────────────────────
        stepShipDamage(playerDamage, dt, isBailing);
        stepShipDamage(enemyDamage, dt);

        updateLeakVisuals(playerDamage, playerLeakVisuals, true, time);
        updateLeakVisuals(enemyDamage, enemyLeakVisuals, false, time);

        // ── Step Autonomous Enemy Ship Simulation ─────────────────────────────
        if (!enemyDamage.isSunk) {
            enemyShipInput = stepCirclePatrolAi(enemyShipState);
            stepShip(enemyShipState, enemyShipInput, dt);

            // Speed & turn motility penalties based on flood
            const eSpeedMult = calcSpeedMultiplier(enemyDamage.waterLevel);
            const eTurnMult  = calcTurnMultiplier(enemyDamage.waterLevel);
            enemyShipState.speed *= eSpeedMult;
            enemyShipState.yawRate *= eTurnMult;
        }

        // ── Ship-to-Ship Collision (ellipse approximation + elastic momentum) ──
        // Use an ellipse (half-length=17, half-width=5.5) instead of a fixed circle
        // so ships only collide when truly overlapping, not just approaching.
        if (!enemyDamage.isSunk) {
            const cdx = enemyShipState.x - shipState.x;
            const cdz = enemyShipState.z - shipState.z;
            const dist = Math.sqrt(cdx * cdx + cdz * cdz);

            // Compute an angular-dependent minimum separation:
            // When bow-to-bow (along long axis): need ~17m separation
            // When beam-to-beam (along short axis): need ~6m separation
            // Approximate: project separation vector onto player ship's long axis
            const pFwdX = Math.sin(shipState.heading);
            const pFwdZ = Math.cos(shipState.heading);
            const dotLong = Math.abs(cdx * pFwdX + cdz * pFwdZ) / (dist + 0.001);
            // dotLong ≈ 1 = ships are bow-to-bow, dotLong ≈ 0 = broadside
            const MIN_DIST = 6 + dotLong * 12; // ranges from 6m (broadside) to 18m (bow-to-bow)

            if (dist < MIN_DIST && dist > 0.01) {
                const overlap = MIN_DIST - dist;
                const nx = cdx / dist;
                const nz = cdz / dist;

                // Separate ships: push proportionally to their speed (slower ship pushed more)
                const totalSpeed = shipState.speed + enemyShipState.speed + 0.01;
                const playerShare = enemyShipState.speed / totalSpeed;
                const enemyShare  = shipState.speed / totalSpeed;
                shipState.x      -= nx * overlap * playerShare;
                shipState.z      -= nz * overlap * playerShare;
                enemyShipState.x += nx * overlap * enemyShare;
                enemyShipState.z += nz * overlap * enemyShare;

                // Elastic momentum transfer along collision normal
                const pVelX = pFwdX * shipState.speed;
                const pVelZ = pFwdZ * shipState.speed;
                const eFwdX = Math.sin(enemyShipState.heading);
                const eFwdZ = Math.cos(enemyShipState.heading);
                const eVelX = eFwdX * enemyShipState.speed;
                const eVelZ = eFwdZ * enemyShipState.speed;

                const v1n = pVelX * nx + pVelZ * nz;
                const v2n = eVelX * nx + eVelZ * nz;

                // Exchange normal components (50% damping — ships aren't billiard balls)
                const impulse = (v1n - v2n) * 0.5;
                shipState.speed      = Math.max(0, shipState.speed - impulse * (nx * pFwdX + nz * pFwdZ));
                enemyShipState.speed = Math.max(0, enemyShipState.speed + impulse * (nx * eFwdX + nz * eFwdZ));

                // Feedback (throttled)
                if (overlap > 0.4) {
                    cameraShake = Math.max(cameraShake, Math.min(0.65, overlap * 0.05));
                    if (!collisionToastCooldown) {
                        collisionToastCooldown = true;
                        playShipCollision();
                        showToast("⚓ COLLISION! Ships hit each other!", "warning");
                        setTimeout(() => { collisionToastCooldown = false; }, 3000);
                    }
                }
            }
        }

        // ── Ship Collision Against Chapter 1 Scenery Landmarks ──────────────
        for (const col of chapterColliders) {
            const dx = shipState.x - col.x;
            const dz = shipState.z - col.z;
            const distSq = dx * dx + dz * dz;
            const minDist = col.radius + SHIP_COLLISION_RADIUS;
            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq) || 0.001;
                const penetration = minDist - dist;
                const nx = dx / dist;
                const nz = dz / dist;

                shipState.x += nx * penetration;
                shipState.z += nz * penetration;
                shipState.speed = Math.max(0, shipState.speed * 0.4 - 1.5);

                cameraShake = Math.max(cameraShake, 0.45);
                if (!collisionToastCooldown) {
                    collisionToastCooldown = true;
                    playShipCollision();
                    showToast(`⚠️ COLLISION! Struck reef or rock pillar!`, "warning");
                    setTimeout(() => { collisionToastCooldown = false; }, 2500);
                }
            }
        }

        // Storm wall inward push beyond playRadius (2000m)
        const shipDistFromOrigin = Math.sqrt(shipState.x * shipState.x + shipState.z * shipState.z);
        if (shipDistFromOrigin > chapterLevel.bounds.playRadius) {
            const pushDirX = -shipState.x / shipDistFromOrigin;
            const pushDirZ = -shipState.z / shipDistFromOrigin;
            shipState.x += pushDirX * 0.8;
            shipState.z += pushDirZ * 0.8;
        }


        // ── Enemy Buoyancy & Wave Physics ─────────────────────────────────────
        const eCosH = Math.cos(enemyShipState.heading), eSinH = Math.sin(enemyShipState.heading);
        const egp = (lx: number, lz: number) => {
            const wx = enemyShipState.x + lx * eCosH + lz * eSinH;
            const wz = enemyShipState.z - lx * eSinH + lz * eCosH;
            return heightAt(wx, wz, time);
        };
        const eyF = egp(0, SHIP_L / 2), eyB = egp(0, -SHIP_L / 2);
        const eyL = egp(-SHIP_W / 2, 0), eyR = egp(SHIP_W / 2, 0);
        const eHeave = (eyF + eyB + eyL + eyR) / 4;
        const ePitch = Math.atan2(eyB - eyF, SHIP_L) * 0.18;
        const eRoll  = Math.atan2(eyL - eyR, SHIP_W) * 0.18;

        const playerBuoyancy = calcBuoyancyOffset(playerDamage.waterLevel);
        const enemyBuoyancy = calcBuoyancyOffset(enemyDamage.waterLevel);
        const enemyActiveInStory = (currentStoryBeatId === "s5b_reavers" || currentStoryBeatId === "s5c_the_quiet" || currentStoryBeatId === "s6_rising") && !enemyDamage.isSunk;
        enemyMesh.setEnabled(enemyActiveInStory);

        if (enemyActiveInStory) {
            enemyMesh.position.set(enemyShipState.x, eHeave + 1.2 + enemyBuoyancy, enemyShipState.z);

            if (enemyDamage.isSinking) {
                enemyMesh.rotation.set(
                    ePitch + enemyDamage.sinkTimer * 0.04,
                    enemyShipState.heading,
                    eRoll + Math.sin(time * 2) * 0.15 + enemyDamage.sinkTimer * 0.03
                );
                if (enemyDamage.isSunk) {
                    enemyMesh.setEnabled(false);
                }
            } else {
                enemyMesh.rotation.set(ePitch, enemyShipState.heading, eRoll);
            }
        }

        // Animate enemy ship components
        const eTargetWheel = enemyShipInput.rudder * 1.3;
        enemyShipHandles.steeringWheel.rotation.z += (eTargetWheel - enemyShipHandles.steeringWheel.rotation.z) * 3.0 * dt;
        enemyShipHandles.rudder.rotation.y = -enemyShipHandles.steeringWheel.rotation.z * 0.35;
        enemyShipHandles.pirateFlag.rotation.y = Math.sin(time * 4) * 0.22;

        // ── Enemy Combat AI (Broadside Cannon Fire) ──────────────────────────
        if (!enemyDamage.isSunk && !enemyDamage.isSinking) {
            enemyShootTimer -= dt;
            const distToPlayerShip = Vector3.Distance(
                new Vector3(enemyShipState.x, 0, enemyShipState.z),
                new Vector3(shipState.x, 0, shipState.z)
            );
            // De-aggro and stop attacking if player moves beyond 220 meters
            if (enemyShootTimer <= 0 && distToPlayerShip <= AI_COMBAT_ATTACK_RANGE) {
                enemyShootTimer = 8.5 + Math.random() * 4.0;

                const pTargetX = shipState.x + (Math.random() - 0.5) * 6.0;
                const pTargetZ = shipState.z + (Math.random() - 0.5) * 8.0;

                // Pick broadside cannon side that faces player
                const toPlayerX = shipState.x - enemyShipState.x;
                const toPlayerZ = shipState.z - enemyShipState.z;
                const localPx = toPlayerX * eCosH - toPlayerZ * eSinH;
                const fireSide = localPx < 0 ? -4.5 : 4.5;
                const fireZ = (Math.floor(Math.random() * 3) - 1) * 3.5;

                const eOriginX = enemyShipState.x + fireSide * eCosH + fireZ * eSinH;
                const eOriginY = enemyMesh.position.y + 4.2;
                const eOriginZ = enemyShipState.z - fireSide * eSinH + fireZ * eCosH;

                const edx = pTargetX - eOriginX;
                const edz = pTargetZ - eOriginZ;
                const eDist = Math.sqrt(edx * edx + edz * edz);
                const eAimYaw = Math.atan2(edx, edz);

                const sin2t = Math.min(0.95, (eDist * CANNON_GRAVITY) / (CANNON_MUZZLE_SPEED * CANNON_MUZZLE_SPEED));
                const ePitch = Math.asin(sin2t) * 0.5 + 0.035;

                const eCosP = Math.cos(ePitch);
                const eSinP = Math.sin(ePitch);
                const evx = CANNON_MUZZLE_SPEED * eCosP * Math.sin(eAimYaw) + Math.sin(enemyShipState.heading) * enemyShipState.speed;
                const evy = CANNON_MUZZLE_SPEED * eSinP;
                const evz = CANNON_MUZZLE_SPEED * eCosP * Math.cos(eAimYaw) + Math.cos(enemyShipState.heading) * enemyShipState.speed;

                const ePs: ProjectileState = {
                    x: eOriginX, y: eOriginY, z: eOriginZ,
                    vx: evx, vy: evy, vz: evz,
                    dead: false,
                    ownerShipId: 99,
                };

                const ebMesh = MeshBuilder.CreateSphere("eBall", { diameter: 0.42, segments: 6 }, scene) as Mesh;
                ebMesh.position.set(ePs.x, ePs.y, ePs.z);
                const ebMat = new StandardMaterial("ebm", scene);
                ebMat.diffuseColor = new Color3(0.12, 0.06, 0.04);
                ebMat.emissiveColor = new Color3(0.4, 0.15, 0.05);
                ebMesh.material = ebMat;

                projectiles.push({ state: ePs, mesh: ebMesh, firedBy: "enemy" });
                playCannonFire(true);

                // Enemy muzzle flash smoke
                const eMuzzle = MeshBuilder.CreateSphere("emFlash", { diameter: 2.8, segments: 6 }, scene);
                eMuzzle.position.set(eOriginX, eOriginY, eOriginZ);
                const emMat = new StandardMaterial("emMat", scene);
                emMat.diffuseColor = new Color3(1.0, 0.7, 0.2);
                emMat.emissiveColor = new Color3(1.0, 0.4, 0.05);
                eMuzzle.material = emMat;
                let emAge = 0;
                const emObs = scene.onBeforeRenderObservable.add(() => {
                    emAge += engine.getDeltaTime() * 0.001;
                    eMuzzle.scaling.scaleInPlace(1.08);
                    emMat.alpha = Math.max(0, 1.0 - emAge * 3.5);
                    if (emAge > 0.3) {
                        scene.onBeforeRenderObservable.remove(emObs);
                        eMuzzle.dispose();
                    }
                });

                showToast("⚠️ ENEMY BROADSIDE FIRED! Incoming Cannonball!", "warning");
            }
        }

        // Speed & turn motility penalties based on flood
        const speedMult = calcSpeedMultiplier(playerDamage.waterLevel);
        const turnMult  = calcTurnMultiplier(playerDamage.waterLevel);
        shipState.speed *= speedMult;
        shipState.yawRate *= turnMult;

        shipMesh.position.set(shipState.x, heave + playerBuoyancy, shipState.z);
        shipMesh.rotation.set(pitch, shipState.heading, roll);

        // ── Player Walking, Sprinting & Swimming Physics ──────────────────────
        if (!isAtHelm && !activeCannon) {
            const cy = camera.rotation.y;
            let mx = 0, mz = 0;
            if (keys.has("KeyW")) { mx += Math.sin(cy); mz += Math.cos(cy); }
            if (keys.has("KeyS")) { mx -= Math.sin(cy); mz -= Math.cos(cy); }
            if (keys.has("KeyA")) { mx -= Math.cos(cy); mz += Math.sin(cy); }
            if (keys.has("KeyD")) { mx += Math.cos(cy); mz -= Math.sin(cy); }
            const len = Math.sqrt(mx * mx + mz * mz);

            const isShiftPressed = keys.has("ShiftLeft") || keys.has("ShiftRight");
            const isSwimmingLoc = playerLocation === "water";
            const stamRes = stepPlayerStamina(playerHotbar, isShiftPressed, len > 0.001, isSwimmingLoc, dt);
            updateHotbarUI();

            if (isRepairing) {
                // Lock movement during repair hammering
                mx = 0; mz = 0;
            }

            const isSprinting = stamRes.isSprinting;

            // ── Multi-Surface Player Physics: Ship Deck, Ocean Swimming, and Island Exploration ──
            if (playerLocation === "ship") {
                const moveSpeed = isSprinting ? SPRINT_RUN_SPEED : WALK_SPEED;
                if (len > 0.001 && !isRepairing) {
                    pPos.x += (mx / len) * moveSpeed * dt;
                    pPos.z += (mz / len) * moveSpeed * dt;
                }

                const targetDeckY = getDeckY(pPos.z);
                const standY = targetDeckY + EYE_H;
                pVel.y -= GRAVITY * dt;
                pPos.y += pVel.y * dt;

                if (pPos.y <= standY + 0.05) {
                    pPos.y = standY;
                    pVel.y = 0;
                    isGrounded = true;
                } else {
                    isGrounded = false;
                }

                // Check if player intentionally leaped over railing into the ocean / shore!
                const isOffDeck = (Math.abs(pPos.x) > 5.5) || (pPos.z > 17.5) || (pPos.z < -17.5);
                if (isOffDeck && pPos.y <= standY + 0.1) {
                    // Convert local ship position to world coordinates and detach
                    const cosH = Math.cos(shipState.heading);
                    const sinH = Math.sin(shipState.heading);
                    pWorldPos.x = shipState.x + pPos.x * cosH + pPos.z * sinH;
                    pWorldPos.z = shipState.z - pPos.x * sinH + pPos.z * cosH;
                    pWorldPos.y = shipMesh.position.y + pPos.y;

                    playerNode.parent = null; // now in world space!
                    camera.rotation.y += shipState.heading; // preserve world heading

                    const ground = getTerrainHeight(pWorldPos.x, pWorldPos.z, worldMap);
                    if (ground.elevation > 0.4) {
                        playerLocation = "island";
                        showToast("🏝️ Leaped onto the island shore!", "success");
                    } else {
                        playerLocation = "water";
                        playWaterJump();
                        showToast("🌊 Splash! Jumped into the ocean! (Swim to ladder [E] to board)", "normal");
                    }
                }
            } else if (playerLocation === "island") {
                // Moving across island terrain (walking / sprinting)
                const ground = getTerrainHeight(pWorldPos.x, pWorldPos.z, worldMap);
                const isWater = ground.elevation <= 0.4;

                const walkSpeed = isSprinting ? SPRINT_RUN_SPEED : WALK_SPEED;
                if (len > 0.001) {
                    pWorldPos.x += (mx / len) * walkSpeed * dt;
                    pWorldPos.z += (mz / len) * walkSpeed * dt;
                }

                const newGround = getTerrainHeight(pWorldPos.x, pWorldPos.z, worldMap);
                const standY = Math.max(WATERLINE_Y, newGround.elevation) + EYE_H;

                pVel.y -= GRAVITY * dt;
                pWorldPos.y += pVel.y * dt;

                if (pWorldPos.y <= standY + 0.05) {
                    pWorldPos.y = standY;
                    pVel.y = 0;
                    isGrounded = true;
                } else {
                    isGrounded = false;
                }

                if (isWater && pWorldPos.y <= WATERLINE_Y + EYE_H + 0.2) {
                    playerLocation = "water";
                    playWaterSplash(0.5);
                    showToast("🌊 Entered coastal shallows & swimming!", "normal");
                }
            } else {
                // Ocean swimming physics (fast swimming & sprint swimming)
                const currentSwimSpeed = isSprinting ? SPRINT_SWIM_SPEED : SWIM_SPEED;
                if (len > 0.001) {
                    pWorldPos.x += (mx / len) * currentSwimSpeed * dt;
                    pWorldPos.z += (mz / len) * currentSwimSpeed * dt;
                }

                const ground = getTerrainHeight(pWorldPos.x, pWorldPos.z, worldMap);
                if (ground.elevation > 0.4) {
                    playerLocation = "island";
                    isGrounded = true;
                    showToast("🏝️ Stepped ashore onto land!", "success");
                } else {
                    // Floating in ocean water waves
                    const waveH = heightAt(pWorldPos.x, pWorldPos.z, time);
                    const targetWaterY = waveH + 1.15; // chest/head above water
                    pWorldPos.y += (targetWaterY - pWorldPos.y) * 4.0 * dt;
                    pVel.y = 0;
                    isGrounded = true; // can jump out of water
                }
            }

            // First-person held items animation & bob
            const activeItem = getHotbarItemType(playerHotbar.selectedSlot);
            fpBallNode.setEnabled(activeItem === "cannonball" && !activeCannon && !isThirdPerson);
            fpHammerNode.setEnabled(activeItem === "hammer" && !activeCannon && !isThirdPerson);
            fpPlankNode.setEnabled(activeItem === "plank" && !activeCannon && !isThirdPerson);
            fpBucketNode.setEnabled(activeItem === "bucket" && !activeCannon && !isThirdPerson);
            fpBananaNode.setEnabled(activeItem === "banana" && !activeCannon && !isThirdPerson);
            fpSpyglassNode.setEnabled(activeItem === "spyglass" && !activeCannon && !isThirdPerson);
            bucketWaterDisc.setEnabled(bucketFull && activeItem === "bucket" && !activeCannon && !isThirdPerson);

            const pirateRightArm = scene.getTransformNodeByName("pirateRightArm");
            const tpMallet = scene.getTransformNodeByName("tpMallet");
            const tpBucket = scene.getTransformNodeByName("tpBucket");
            const tpBanana = scene.getTransformNodeByName("tpBanana");

            if (isThirdPerson) {
                // Avatar faces the direction the player is moving (or the orbit yaw when still)
                pirateAvatar.rotation.y = len > 0.001
                    ? Math.atan2(mx / (dt || 1), mz / (dt || 1))   // movement direction in local space
                    : tpYaw; // face the camera when idle
                pirateAvatar.rotation.z = len > 0.001 ? Math.sin(time * 10) * 0.04 : 0;

                if (tpMallet) tpMallet.setEnabled(activeItem === "hammer" && !activeCannon);
                if (tpBucket) tpBucket.setEnabled(activeItem === "bucket" && !activeCannon);
                if (tpBanana) tpBanana.setEnabled(activeItem === "banana" && !activeCannon);

                if (pirateRightArm) {
                    if (bananaEatTimer > 0) {
                        const chew = Math.sin((BANANA_EAT_DURATION - bananaEatTimer) * 16) * 0.12;
                        pirateRightArm.rotation.x = -1.25 + chew;
                        pirateRightArm.rotation.z = -0.32;
                    } else if (isRepairing) {
                        const hCycle = (time * 8) % (Math.PI * 2);
                        pirateRightArm.rotation.x = -0.3 - Math.max(0, Math.sin(hCycle)) * 1.1;
                        pirateRightArm.rotation.z = 0;
                    } else if (hammerSwing > 0) {
                        pirateRightArm.rotation.x = -Math.sin(hammerSwing * Math.PI) * 0.9;
                        pirateRightArm.rotation.z = 0;
                    } else if (bucketSwing > 0) {
                        pirateRightArm.rotation.x = -Math.sin(bucketSwing * Math.PI) * 0.75;
                        pirateRightArm.rotation.z = 0;
                    } else if (len > 0.001) {
                        pirateRightArm.rotation.x = Math.sin(time * 8) * 0.25;
                        pirateRightArm.rotation.z = 0;
                    } else {
                        pirateRightArm.rotation.x = 0;
                        pirateRightArm.rotation.z = 0;
                    }
                }
            }

            const bob = Math.sin(time * 8) * (len > 0.001 ? 0.025 : 0.006);
            fpItemsRoot.position.y = -0.32 + bob;

            // Hammer swing animation (First Person)
            if (isRepairing) {
                const hCycle = (time * 8) % (Math.PI * 2);
                const hAngle = Math.max(0, Math.sin(hCycle)) * 1.15;
                fpHammerNode.rotation.x = hAngle;
                fpHammerNode.position.z = -hAngle * 0.15;
            } else if (hammerSwing > 0) {
                hammerSwing = Math.max(0, hammerSwing - dt * 4.5);
                const hAngle = Math.sin(hammerSwing * Math.PI) * 0.95;
                fpHammerNode.rotation.x = hAngle;
                fpHammerNode.position.z = -hAngle * 0.15;
            } else {
                fpHammerNode.rotation.x = 0;
                fpHammerNode.position.z = 0;
            }

            // Bucket swing animation
            if (bucketSwing > 0) {
                bucketSwing = Math.max(0, bucketSwing - dt * 3.5);
                const bAngle = Math.sin(bucketSwing * Math.PI) * 0.75;
                fpBucketNode.rotation.x = -bAngle;
            } else {
                fpBucketNode.rotation.x = 0;
            }

            // Banana eating animation
            if (bananaEatTimer > 0) {
                bananaEatTimer = Math.max(0, bananaEatTimer - dt);
                const progress = 1.0 - (bananaEatTimer / BANANA_EAT_DURATION);
                const lift = Math.sin(progress * Math.PI);
                const biteSnap = Math.sin(progress * Math.PI * 4);

                fpBananaNode.position.y = lift * 0.22 - Math.max(0, biteSnap) * 0.035;
                fpBananaNode.position.z = -lift * 0.14;
                fpBananaNode.rotation.x = lift * 0.45 + Math.sin(progress * Math.PI * 4) * 0.10;
                fpBananaNode.rotation.z = -lift * 0.20;

                if (progress > 0.45) {
                    fpBananaNode.scaling.set(0.85, 0.72, 0.85);
                } else {
                    fpBananaNode.scaling.set(1.0, 1.0, 1.0);
                }

                if (progress >= 0.45 && bananaBitePhase === 0) {
                    bananaBitePhase = 1;
                    playEatBite();
                }

                if (bananaEatTimer <= 0) {
                    isEatingBanana = false;
                    fpBananaNode.scaling.set(1.0, 1.0, 1.0);
                    fpBananaNode.position.set(0, 0, 0);
                    fpBananaNode.rotation.set(0, 0, 0);
                    if (pirateRightArm) {
                        pirateRightArm.rotation.set(0, 0, 0);
                    }

                    const res = eatFood(playerHotbar);
                    if (res.ate) {
                        playEatGulp();
                        const vign = document.getElementById("damage-vignette");
                        if (vign) {
                            vign.classList.add("heal");
                            setTimeout(() => vign.classList.remove("heal"), 450);
                        }
                        cameraShake = Math.max(cameraShake, 0.04);
                        updateHotbarUI();
                        showToast(`🍌 Delicious! Ate a Banana! +${res.healed} HP (${Math.round(playerHotbar.health)}/100 HP)`, "success");
                    }
                }
            } else {
                fpBananaNode.scaling.set(1.0, 1.0, 1.0);
                fpBananaNode.position.set(0, 0, 0);
                fpBananaNode.rotation.set(0, 0, 0);
            }

            // Wide Cinematic FOV (expanded for grand pirate atmosphere + zoomed spyglass)
            camera.fov = isZoomed ? 0.25 : (isThirdPerson ? 1.18 : 1.10);

        } else {
            fpBallNode.setEnabled(false);
            fpHammerNode.setEnabled(false);
            fpPlankNode.setEnabled(false);
            fpBucketNode.setEnabled(false);
            fpBananaNode.setEnabled(false);
            fpSpyglassNode.setEnabled(false);
            isGrounded = false;
        }

        // ── Cannon FPS Sighting Position ──────────────────────────────────────
        // Dynamically align gunner and camera directly behind the breech bore axis
        if (activeCannon && activeHandle) {
            const baseAngle = activeCannon.side === "L" ? -Math.PI / 2 : Math.PI / 2;
            const currentYaw = baseAngle + activeCannon.aimYaw;

            // Eye position dynamically orbits directly behind the cannon breech and handles:
            // Stand 1.45m behind the mount center along the reverse aim direction
            const standDist = 1.45;
            const standX = activeHandle.mount.position.x - Math.sin(currentYaw) * standDist;
            const standZ = activeHandle.mount.position.z - Math.cos(currentYaw) * standDist;
            pPos.set(standX, MAIN_DECK_Y + 1.15, standZ);

            // Camera aims along the beam direction + aimYaw (LOCAL to playerNode/shipMesh)
            // NEVER add shipState.heading here — camera inherits heading from shipMesh!
            camera.rotation.y = currentYaw;
            camera.rotation.x = -activeCannon.aimPitch;

            // Recoil kick on first-person hands
            fpHandsRoot.position.z = 0.52 - activeHandle.recoilZ * 0.35;
        }

        if (playerLocation === "ship") {
            playerNode.position.copyFrom(pPos);
            playerNode.rotation.x = -pitch;
            playerNode.rotation.z = -roll;
        } else {
            playerNode.position.copyFrom(pWorldPos);
            playerNode.rotation.x = 0;
            playerNode.rotation.z = 0;
        }

        // ── Ship Animations ───────────────────────────────────────────────────
        const targetWheelAngle = shipInput.rudder * 1.3;
        wheelAngle += (targetWheelAngle - wheelAngle) * 3.5 * dt;
        shipHandles.steeringWheel.rotation.z = wheelAngle + Math.sin(time * 0.4) * 0.025;
        shipHandles.rudder.rotation.y = -wheelAngle * 0.35;
        shipHandles.pirateFlag.rotation.y = Math.sin(time * 4) * 0.22;

        // ── Cannons Animation (Mount Yaw + Barrel Pitch + Recoil) ─────────────
        for (const h of shipHandles.cannons) {
            const cs = cannonShip.cannons.find(c => c.side === h.side && c.index === h.index)!;
            const baseAngle = h.side === "L" ? -Math.PI / 2 : Math.PI / 2;

            // Unmanned cannons gently settle back to neutral rest angles
            if (cs !== activeCannon) {
                cs.aimYaw += (0 - cs.aimYaw) * Math.min(1, dt * 2.5);
                cs.aimPitch += (5 * DEG - cs.aimPitch) * Math.min(1, dt * 2.5);
            }

            // 1. Mount swivels in Yaw to match aim
            h.mount.rotation.y = baseAngle + cs.aimYaw;

            // 2. Barrel tilts in Pitch to match elevation
            h.barrelPivot.rotation.x = -cs.aimPitch;

            // 3. Recoil recovery
            if (h.recoilZ > 0) {
                h.recoilZ = Math.max(0, h.recoilZ - dt * 2.2);
            }
            h.barrel.position.z = -h.recoilZ;

            // Highlight active cannon
            const isActive = activeCannon?.side === h.side && activeCannon?.index === h.index;
            (h.barrel.material as StandardMaterial).emissiveColor =
                isActive ? new Color3(0.24, 0.12, 0.02) : new Color3(0.02, 0.02, 0.024);
        }

        // ── Dynamic Trajectory Arc ────────────────────────────────────────────
        if (activeCannon && activeHandle) {
            const muzzleWorldPos = activeHandle.muzzleTip.getAbsolutePosition();
            let sx2 = muzzleWorldPos.x;
            let sy  = muzzleWorldPos.y;
            let sz2 = muzzleWorldPos.z;

            const shipVx = Math.sin(shipState.heading) * shipState.speed;
            const shipVz = Math.cos(shipState.heading) * shipState.speed;
            const beamOffset = activeCannon.side === "L" ? -Math.PI / 2 : Math.PI / 2;
            const worldYaw = shipState.heading + beamOffset + activeCannon.aimYaw;

            const cosP = Math.cos(activeCannon.aimPitch);
            const sinP = Math.sin(activeCannon.aimPitch);

            const vx0 = CANNON_MUZZLE_SPEED * cosP * Math.sin(worldYaw) + shipVx;
            let vy0 = CANNON_MUZZLE_SPEED * sinP;
            const vz0 = CANNON_MUZZLE_SPEED * cosP * Math.cos(worldYaw) + shipVz;

            const simDt = 0.08;
            let dotIdx = 0;

            for (let i = 0; i < ARC_DOTS * 2 && dotIdx < ARC_DOTS; i++) {
                vy0 -= CANNON_GRAVITY * simDt;
                sx2 += vx0 * simDt;
                sy  += vy0 * simDt;
                sz2 += vz0 * simDt;

                if (i % 2 === 0) {
                    arcDots[dotIdx].position.set(sx2, Math.max(0.18, sy), sz2);
                    arcDots[dotIdx].isVisible = true;
                    dotIdx++;
                }

                if (sy <= 0) break;
            }

            for (let i = dotIdx; i < ARC_DOTS; i++) arcDots[i].isVisible = false;
        } else {
            arcDots.forEach(d => d.isVisible = false);
        }

        // ── Projectiles Simulation & Collision ────────────────────────────────
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const pb = projectiles[i];
            const prev = { x: pb.state.x, y: pb.state.y, z: pb.state.z };
            const splashed = stepProjectile(pb.state, dt);
            const curr = { x: pb.state.x, y: pb.state.y, z: pb.state.z };
            pb.mesh.position.set(curr.x, curr.y, curr.z);

            if (pb.firedBy === "enemy") {
                // Enemy projectile: check collision with player ship
                const playerBox = makeShipBox(shipState.x, shipMesh.position.y + 1.2, shipState.z, shipState.heading);
                const pt = sweptHit(prev, curr, playerBox, 0, 1);
                if (pt !== null) {
                    pb.state.dead = true;
                    const hx = prev.x + (curr.x - prev.x) * pt;
                    const hy = prev.y + (curr.y - prev.y) * pt;
                    const hz = prev.z + (curr.z - prev.z) * pt;
                    triggerShipHit(hx, hy, hz);
                }
            } else {
                // Check collision against drifting wreckage obstacles (Beat S2)
                for (const dw of driftingWreckages) {
                    if (dw.dead) continue;
                    const dWreck = Math.hypot(curr.x - dw.x, curr.z - dw.z);
                    if (dWreck <= dw.radius && curr.y >= -2 && curr.y <= 6) {
                        pb.state.dead = true;
                        dw.dead = true;
                        dw.mesh.dispose();
                        cameraShake = 0.4;
                        playHullImpact();
                        createExplosionVFX(curr);
                        showToast("💥 WRECKAGE DESTROYED! Channel clearing!", "success");

                        // Check if all wreckage cleared -> trigger Beat S3 breach
                        const remaining = driftingWreckages.filter(w => !w.dead).length;
                        if (remaining === 0) {
                            showToast("⚓ All obstacles cleared! Full speed ahead!", "success");
                            setTimeout(() => {
                                applyBeatActions("s3_breach");
                            }, 1200);
                        }
                        break;
                    }
                }

                // Check collision against active Kraken tentacles
                if (krakenBossState.active) {
                    for (const tentacle of krakenBossState.tentacles) {
                        const hitRes = testCannonballTentacleHit(curr, CANNONBALL_RADIUS, tentacle, shipMesh.position, performance.now() / 1000);
                        if (hitRes.hit) {
                            pb.state.dead = true;
                            cameraShake = 0.5;
                            playHullImpact();
                            createExplosionVFX(curr);

                            tentacle.hp -= hitRes.damage;
                            if (tentacle.hp <= 0) {
                                tentacle.state = "SEVERED";
                                tentacle.stateTimer = 0;
                                krakenBossState.severedCount++;
                                showToast(`🦑 TENTACLE SEVERED! (${krakenBossState.severedCount}/${krakenBossState.targetSevered})`, "warning");
                                if (krakenBossState.severedCount >= krakenBossState.targetSevered) {
                                    applyBeatActions("s8_the_wave");
                                }
                            } else {
                                tentacle.state = "WOUNDED";
                                tentacle.stateTimer = 0;
                                if (hitRes.isWeakPoint) {
                                    showToast("⚡ CRITICAL WEAK POINT HIT! (3x Damage)", "warning");
                                } else {
                                    showToast(`💥 Tentacle Hit! (${tentacle.hp}/${tentacle.maxHp} HP)`, "normal");
                                }
                            }
                            break;
                        }
                    }
                }

                // Player projectile: check collision with moving enemy ship
                const enemyBox = makeShipBox(
                    enemyShipState.x,
                    enemyMesh.position.y + 1.2,
                    enemyShipState.z,
                    enemyShipState.heading
                );
                const t = sweptHit(prev, curr, enemyBox, 0, 1);
                if (t !== null) {
                    pb.state.dead = true;
                    enemyHitFlash = 0.4;
                    const hf = document.getElementById("hflash")!;
                    hf.classList.add("flash");
                    setTimeout(() => hf.classList.remove("flash"), 90);

                    // Impact point
                    const hx = prev.x + (curr.x - prev.x) * t;
                    const hy = prev.y + (curr.y - prev.y) * t;
                    const hz = prev.z + (curr.z - prev.z) * t;

                    // Camera Shake & Explosion VFX
                    cameraShake = 0.45;
                    playHullImpact();
                    createExplosionVFX({ x: hx, y: hy, z: hz });

                    // Convert to enemy ship-local space (accounting for heading rotation)
                    const edx = hx - enemyShipState.x;
                    const edz = hz - enemyShipState.z;
                    const localHit = {
                        x: edx * Math.cos(-enemyShipState.heading) - edz * Math.sin(-enemyShipState.heading),
                        y: hy - enemyMesh.position.y,
                        z: edx * Math.sin(-enemyShipState.heading) + edz * Math.cos(-enemyShipState.heading),
                    };

                    // Apply damage to enemy ship
                    const dmgRes = applyDamageHit(enemyDamage, localHit, 1);

                    // Award XP and level up cannon
                    if (pb.firedFrom) {
                        const hitRes = recordCannonHit(pb.firedFrom);
                        if (hitRes.leveledUp) {
                            showLevelUpToast(hitRes.newLevel);
                        } else {
                            if (dmgRes.slotActivated) {
                                showToast(`💥 DIRECT HIT! Breached Enemy Hull (Level ${dmgRes.slotActivated.severity} Leak)!`, "warning");
                            } else if (dmgRes.upgraded) {
                                showToast("💥 CRITICAL HIT! Expanded Enemy Breach!", "warning");
                            } else {
                                showToast("💥 DIRECT HIT on Enemy Ship!", "warning");
                            }
                        }
                    }
                }
            }

            if (pb.state.dead || splashed) {
                if (splashed) {
                    playWaterSplash(0.7);
                    const sp = MeshBuilder.CreateSphere("sp", { diameter: 3.5, segments: 4 }, scene);
                    sp.position.set(curr.x, 0.15, curr.z);
                    sp.material = splashMat;
                    setTimeout(() => sp.dispose(), 650);
                }
                pb.mesh.dispose();
                projectiles.splice(i, 1);
            }
        }

        if (enemyHitFlash > 0) {
            enemyHitFlash = Math.max(0, enemyHitFlash - dt);
            enemyShipHandles.pirateFlag.scaling.setAll(enemyHitFlash > 0 ? 1.3 : 1.0);
        }

        // ── Barrel Proximity Glow ─────────────────────────────────────────────
        const itarget = getInteractTarget();
        shipHandles.ammoBarrel.material = (itarget.type === "barrel") ? barrelGlowMat : barrelNormalMat;
        shipHandles.plankBarrel.material = (itarget.type === "plankBarrel") ? barrelGlowMat : barrelNormalMat;
        shipHandles.foodBarrel.material = (itarget.type === "foodBarrel") ? barrelGlowMat : barrelNormalMat;

        // ── Camera positioning (shake + 1P/3P) ────────────────────────────────
        const shakeX = cameraShake > 0 ? (Math.random() - 0.5) * cameraShake : 0;
        const shakeY = cameraShake > 0 ? (Math.random() - 0.5) * cameraShake : 0;
        cameraShake = Math.max(0, cameraShake - dt * 2.8);

        if (!cutscenePlayer.active) {
            if (isThirdPerson && !activeCannon) {
                // Over-the-shoulder 3rd-person camera:
                // Camera orbits around player, positioned behind the right shoulder
                // so character is on the left side of the screen and crosshair is on the right
                const ARM = 3.2; // comfortable distance behind player
                const SHOULDER = 0.65; // offset to right shoulder
                const cosP = Math.cos(tpPitch);
                const sinP = Math.sin(tpPitch);
                const rightX = Math.cos(tpYaw);
                const rightZ = -Math.sin(tpYaw);

                // In playerNode coordinates:
                // Forward is (sin(tpYaw), 0, cos(tpYaw))
                // Right is (cos(tpYaw), 0, -sin(tpYaw))
                camera.position.x = -Math.sin(tpYaw) * ARM * cosP + rightX * SHOULDER + shakeX;
                camera.position.y = 0.35 + ARM * sinP + shakeY;
                camera.position.z = -Math.cos(tpYaw) * ARM * cosP + rightZ * SHOULDER;
                camera.rotation.y = tpYaw;
                camera.rotation.x = tpPitch;
                camera.rotation.z = 0;
            } else if (isThirdPerson && activeCannon) {
                const ARM2 = 2.4;
                const SHOULDER_C = 0.50;
                const baseAngle = activeCannon.side === "L" ? -Math.PI / 2 : Math.PI / 2;
                const canYaw = baseAngle + activeCannon.aimYaw;
                const cosP = Math.cos(activeCannon.aimPitch);
                const sinP = Math.sin(activeCannon.aimPitch);
                const rightX = Math.cos(canYaw);
                const rightZ = -Math.sin(canYaw);

                camera.position.x = -Math.sin(canYaw) * ARM2 * cosP + rightX * SHOULDER_C + shakeX;
                camera.position.y = 0.35 - ARM2 * sinP + shakeY;
                camera.position.z = -Math.cos(canYaw) * ARM2 * cosP + rightZ * SHOULDER_C;
                camera.rotation.y = canYaw;
                camera.rotation.x = -activeCannon.aimPitch;
                camera.rotation.z = 0;
            } else {
                // First-person
                camera.position.x = shakeX;
                camera.position.y = shakeY;
                camera.position.z = 0;
            }
        }


        // ── Minimap Tactical Radar ────────────────────────────────────────────
        const mmCanvas = document.getElementById("minimap-canvas") as HTMLCanvasElement | null;
        if (mmCanvas) {
            const ctx = mmCanvas.getContext("2d");
            if (ctx) {
                const W = mmCanvas.width, H = mmCanvas.height;
                const cx = W / 2, cy = H / 2;
                const scale = 0.42;

                ctx.clearRect(0, 0, W, H);

                // Ocean background
                ctx.fillStyle = "#0c1829";
                ctx.beginPath();
                ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
                ctx.fill();

                // ── Animated sonar sweep ───────────────────────────────────────
                const sweepAngle = (time * 1.2) % (Math.PI * 2);
                ctx.save();
                ctx.translate(cx, cy);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, cx - 3, sweepAngle - 0.55, sweepAngle);
                ctx.closePath();
                const sweepAlpha = 0.12 + Math.abs(Math.sin(time * 2.5)) * 0.06;
                ctx.fillStyle = `rgba(56,189,248,${sweepAlpha})`;
                ctx.fill();
                ctx.restore();

                // Range rings with subtle pulse
                const ringPulse = 0.12 + Math.sin(time * 4) * 0.04;
                for (const rr of [cx * 0.42, cx * 0.78]) {
                    ctx.strokeStyle = `rgba(56, 189, 248, ${ringPulse})`;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath();
                    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                // Cardinal direction labels (N/S/E/W)
                ctx.font = "bold 8px 'Orbitron', sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                // N
                ctx.fillStyle = "#fbbf24"; // gold for North
                ctx.fillText("N", cx, 12);
                // S
                ctx.fillStyle = "rgba(255,255,255,0.45)";
                ctx.fillText("S", cx, H - 12);
                // E
                ctx.fillText("E", W - 12, cy);
                // W
                ctx.fillText("W", 12, cy);
                ctx.textAlign = "left";
                ctx.textBaseline = "alphabetic";

                // Archipelago Islands & Sea Crags on Tactical Radar
                for (const island of worldMap.islands) {
                    const idx = (island.x - shipState.x) * scale;
                    const idz = -(island.z - shipState.z) * scale;
                    const iRawDist = Math.sqrt(idx * idx + idz * idz);
                    const maxRadarR = cx - 8;

                    if (iRawDist < maxRadarR + island.radius * scale) {
                        const ix = cx + idx;
                        const iy = cy + idz;
                        const ir = Math.max(3, island.radius * scale);

                        ctx.save();
                        // Shallow water lagoon / reef halo
                        ctx.beginPath();
                        ctx.arc(ix, iy, ir * 1.25, 0, Math.PI * 2);
                        ctx.fillStyle = "rgba(45, 212, 191, 0.22)";
                        ctx.fill();

                        // Island body (sand for tropical/atoll, grey for crags/fortress)
                        ctx.beginPath();
                        ctx.arc(ix, iy, ir, 0, Math.PI * 2);
                        if (island.type === "fortress") {
                            ctx.fillStyle = "#eab308"; // golden fortress
                            ctx.strokeStyle = "#ca8a04";
                        } else if (island.type === "rock_needle" || island.type === "crag") {
                            ctx.fillStyle = "#64748b"; // rock crag
                            ctx.strokeStyle = "#475569";
                        } else {
                            ctx.fillStyle = "#d97706"; // tropical sand/palm
                            ctx.strokeStyle = "#b45309";
                        }
                        ctx.lineWidth = 1.2;
                        ctx.fill();
                        ctx.stroke();

                        // Central Fort beacon dot
                        if (island.hasLootCache) {
                            ctx.beginPath();
                            ctx.arc(ix, iy, 2.5, 0, Math.PI * 2);
                            ctx.fillStyle = "#fef08a";
                            ctx.fill();
                        }
                        ctx.restore();
                    }
                }

                // ── Story Chapter Route Polyline & Waypoints on Tactical Radar ──
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, cx - 6, 0, Math.PI * 2);
                ctx.clip();

                // Draw connecting dashed golden course line
                ctx.beginPath();
                for (let i = 0; i < chapterLevel.route.length; i++) {
                    const pt = chapterLevel.route[i];
                    const rpx = cx + (pt.pos[0] - shipState.x) * scale;
                    const rpy = cy - (pt.pos[1] - shipState.z) * scale;
                    if (i === 0) ctx.moveTo(rpx, rpy);
                    else ctx.lineTo(rpx, rpy);
                }
                ctx.strokeStyle = "rgba(251, 191, 36, 0.75)";
                ctx.lineWidth = 2.0;
                ctx.setLineDash([4, 3]);
                ctx.shadowColor = "#fbbf24";
                ctx.shadowBlur = 6;
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.shadowBlur = 0;

                // Draw waypoints
                for (let i = 0; i < chapterLevel.route.length; i++) {
                    const pt = chapterLevel.route[i];
                    const rpx = cx + (pt.pos[0] - shipState.x) * scale;
                    const rpy = cy - (pt.pos[1] - shipState.z) * scale;
                    const isNextWp = (i === currentRouteWaypointIndex);

                    ctx.beginPath();
                    ctx.arc(rpx, rpy, isNextWp ? 4.5 : 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = isNextWp ? "#fef08a" : "rgba(251, 191, 36, 0.85)";
                    ctx.fill();

                    if (isNextWp) {
                        ctx.strokeStyle = "#f59e0b";
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }
                }
                ctx.restore();


                // Enemy Ship Blip on Tactical Minimap
                if (!enemyDamage.isSunk) {
                    const edx = (enemyShipState.x - shipState.x) * scale;
                    const edz = -(enemyShipState.z - shipState.z) * scale;
                    const eRawDist = Math.sqrt(edx * edx + edz * edz);
                    const maxBlipR = cx - 14;
                    // Clamp to edge if out of range
                    const ex = cx + (eRawDist > maxBlipR ? edx / eRawDist * maxBlipR : edx);
                    const ey = cy + (eRawDist > maxBlipR ? edz / eRawDist * maxBlipR : edz);
                    const isEdgeClipped = eRawDist > maxBlipR;

                    ctx.save();
                    ctx.translate(ex, ey);
                    if (!isEdgeClipped) ctx.rotate(enemyShipState.heading);

                    const eColor = enemyDamage.isSinking ? "#f59e0b" : "#ef4444";
                    ctx.fillStyle = eColor;
                    ctx.shadowColor = eColor;
                    ctx.shadowBlur = isEdgeClipped ? 12 : 8;

                    if (isEdgeClipped) {
                        // Arrow pointing toward edge
                        ctx.beginPath();
                        ctx.arc(0, 0, 5, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        ctx.beginPath();
                        ctx.moveTo(0, -8);
                        ctx.lineTo(5, 5);
                        ctx.lineTo(0, 3);
                        ctx.lineTo(-5, 5);
                        ctx.closePath();
                        ctx.fill();
                    }
                    ctx.shadowBlur = 0;
                    ctx.restore();

                    if (!isEdgeClipped) {
                        const realDist = Math.hypot(enemyShipState.x - shipState.x, enemyShipState.z - shipState.z);
                        ctx.font = "bold 8px 'Rajdhani', sans-serif";
                        ctx.fillStyle = enemyDamage.isSinking ? "#fde68a" : "#fca5a5";
                        ctx.fillText(`${realDist.toFixed(0)}m`, ex + 7, ey + 3);
                    }
                }

                // Player Ship Arrow in Center — drawn in local ship space
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(shipState.heading);

                // Active Hull Leaks — dual ring sonar pings
                const activePlayerLeaks = playerDamage.slots.filter(s => s.active);
                for (const leak of activePlayerLeaks) {
                    const lx = leak.localPos.x * scale * 2.2;
                    const lz = -leak.localPos.z * scale * 2.2;
                    // Outer expanding ping
                    const pingPct = (time * 0.9) % 1.0;
                    const pingR = 4 + pingPct * 10;
                    const pingAlpha = 1 - pingPct;
                    ctx.strokeStyle = `rgba(239, 68, 68, ${pingAlpha * 0.9})`;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(lx, lz, pingR, 0, Math.PI * 2);
                    ctx.stroke();
                    // Inner dot (solid)
                    const dotPulse = 0.7 + Math.sin(time * 8 + leak.id) * 0.3;
                    ctx.fillStyle = `rgba(239, 68, 68, ${dotPulse})`;
                    ctx.shadowColor = "#ef4444";
                    ctx.shadowBlur = 6;
                    ctx.beginPath();
                    ctx.arc(lx, lz, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }

                // Ship hull outline (shows player footprint)
                ctx.strokeStyle = "rgba(56,189,248,0.30)";
                ctx.lineWidth = 1.2;
                const hw = 3.2 * scale * 2.2, hl = 14.0 * scale * 2.2;
                ctx.strokeRect(-hw, -hl, hw * 2, hl * 2);

                // Player character blip — moves with player deck position (or world position when swimming/on island)
                let px: number, pz: number, charFacingYaw: number;
                if (playerLocation === "ship") {
                    px = pPos.x * scale * 2.2;
                    pz = -pPos.z * scale * 2.2;
                    charFacingYaw = isThirdPerson ? pirateAvatar.rotation.y : camera.rotation.y;
                } else {
                    // Convert world coordinates to ship-local radar space
                    const dxW = pWorldPos.x - shipState.x;
                    const dzW = pWorldPos.z - shipState.z;
                    const ch0 = Math.cos(-shipState.heading);
                    const sh0 = Math.sin(-shipState.heading);
                    const localX = dxW * ch0 - dzW * sh0;
                    const localZ = dxW * sh0 + dzW * ch0;
                    px = localX * scale * 2.2;
                    pz = -localZ * scale * 2.2;
                    charFacingYaw = (isThirdPerson ? pirateAvatar.rotation.y : camera.rotation.y) - shipState.heading;
                }

                ctx.save();
                ctx.translate(px, pz);
                ctx.rotate(charFacingYaw);

                // FOV vision cone pointing forward
                ctx.fillStyle = "rgba(56, 189, 248, 0.22)";
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, 16, -Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45);
                ctx.closePath();
                ctx.fill();

                // Directional player arrow
                ctx.fillStyle = "#38bdf8";
                ctx.shadowColor = "#38bdf8";
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(0, -9);
                ctx.lineTo(5.5, 6);
                ctx.lineTo(0, 3);
                ctx.lineTo(-5.5, 6);
                ctx.closePath();
                ctx.fill();
                ctx.shadowBlur = 0;

                // Inner core dot
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(0, 0, 2, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();

                ctx.restore();
            }
        }

        // ── Frame-by-Frame Repair Simulation & Anti-Spam Animation ───────────
        if (isRepairing) {
            const targetSlot = playerDamage.slots.find(s => s.id === repairSlotId);
            const hammerEquipped = (playerHotbar.selectedSlot === 1) && !activeCannon;
            const distToStart = Vector3.Distance(pPos, repairStartPos);
            let distToSlot = 999;
            if (targetSlot) {
                const dx = targetSlot.localPos.x - pPos.x;
                const dz = targetSlot.localPos.z - pPos.z;
                distToSlot = Math.sqrt(dx * dx + dz * dz);
            }

            if (!targetSlot || !targetSlot.active || !hammerEquipped || distToSlot > 3.2 || distToStart > 1.2) {
                // Cancelled if moved away or unequipped hammer
                isRepairing = false;
                repairAnimTimer = 0;
                const rpEl = document.getElementById("repair-progress");
                if (rpEl) rpEl.classList.remove("active");
                showToast("⚠️ Repair cancelled — you moved away or unequipped hammer!", "warning");
            } else {
                repairAnimTimer += dt;
                repairStrikeTimer += dt;

                // Rhythmic sparks and screen kick on hammer strike
                if (repairStrikeTimer >= 0.75) {
                    repairStrikeTimer -= 0.75;
                    hammerSwing = 1.0;
                    const vis = playerLeakVisuals.get(repairSlotId);
                    if (vis) spawnHammerSparks(vis.root.getAbsolutePosition());
                    cameraShake = Math.max(cameraShake, 0.04);
                    playHammerStrike();
                }

                // Update UI progress
                const pct = Math.min(100, (repairAnimTimer / REPAIR_DURATION) * 100);
                const rpFill = document.getElementById("rp-bar-fill");
                if (rpFill) rpFill.style.width = `${pct}%`;
                const rpLabel = document.getElementById("rp-label");
                if (rpLabel) rpLabel.textContent = `🔨 REPAIRING... ${Math.round(pct)}% (${Math.max(0, REPAIR_DURATION - repairAnimTimer).toFixed(1)}s)`;

                // Finished 5 seconds
                if (repairAnimTimer >= REPAIR_DURATION) {
                    isRepairing = false;
                    repairAnimTimer = 0;
                    const rpEl = document.getElementById("repair-progress");
                    if (rpEl) rpEl.classList.remove("active");

                    if (playerHotbar.planksCarried > 0) {
                        patchDamageSlot(playerDamage, repairSlotId, 1.0);
                        playerHotbar.planksCarried = Math.max(0, playerHotbar.planksCarried - 1);
                        updateHotbarUI();
                        playRepairComplete();
                        // 5-second anti-spam delay
                        repairCooldownEnd = Date.now() + (REPAIR_COOLDOWN * 1000);

                        const vis = playerLeakVisuals.get(repairSlotId);
                        if (vis) spawnHammerSparks(vis.root.getAbsolutePosition());

                        showToast(`🔨 Hull breach fully sealed with 1 plank! (${playerHotbar.planksCarried} planks remaining)`, "success");
                    } else {
                        showToast("⚠️ Out of planks during repair!", "warning");
                    }
                }
            }
        }

        // ── Bucket overboard hint (show when bucket equipped + full) ─────────────
        const bucketHint = document.getElementById("bucket-aim-hint");
        if (bucketHint) {
            const bucketActive = playerHotbar.selectedSlot === 3 && bucketFull && !activeCannon;
            if (bucketActive) {
                const lookYaw = isThirdPerson ? tpYaw : camera.rotation.y;
                const isOverboard = isAimingOverboard(pPos, lookYaw);
                if (isOverboard) {
                    bucketHint.textContent = "🌊 [CLICK] DUMP WATER OVERBOARD INTO SEA";
                    bucketHint.className = "show overboard";
                } else {
                    bucketHint.textContent = "⚠️ AIMING INSIDE BOAT — WALK TO RAILING TO DUMP!";
                    bucketHint.className = "show warning";
                }
            } else {
                bucketHint.className = "";
            }
        }

        // ── 2D Screen Damage Waypoint ─────────────────────────────────────────
        // ONLY visible when hammer is equipped in hand
        const hammerEquipped = (playerHotbar.selectedSlot === 1) && !activeCannon;
        const activeLeaks2 = playerDamage.slots.filter(s => s.active);
        const dwEl = document.getElementById("damage-waypoint");
        if (dwEl) {
            if (activeLeaks2.length === 0 || !hammerEquipped) {
                dwEl.classList.remove("visible", "on-screen", "edge");
            } else {
                // Find the closest leak to the player
                let closestSlot2: DamageSlot | null = null;
                let minDist2 = Infinity;
                for (const slot of activeLeaks2) {
                    const dx = slot.localPos.x - pPos.x;
                    const dz = slot.localPos.z - pPos.z;
                    const d = Math.sqrt(dx * dx + dz * dz);
                    if (d < minDist2) { minDist2 = d; closestSlot2 = slot; }
                }

                if (closestSlot2) {
                    const vis2 = playerLeakVisuals.get(closestSlot2.id);
                    if (vis2) {
                        const leakWorld2 = vis2.root.getAbsolutePosition();
                        const W = engine.getRenderWidth();
                        const H = engine.getRenderHeight();
                        const MARGIN = 60; // px from edge when clamped

                        const vport2 = camera.viewport.toGlobal(W, H);
                        const sp = Vector3.Project(
                            leakWorld2,
                            Matrix.IdentityReadOnly,
                            scene.getTransformMatrix(),
                            vport2
                        );

                        const badge2  = document.getElementById("dw-badge")!;
                        const icon2   = document.getElementById("dw-icon")!;
                        const text2   = document.getElementById("dw-text")!;
                        const dist2El = document.getElementById("dw-dist")!;
                        const arrowEl = dwEl.querySelector(".dw-arrow") as HTMLElement | null;

                        const isNear2  = minDist2 < 2.5;

                        badge2.classList.toggle("near", isNear2);
                        icon2.textContent  = isNear2 ? (isRepairing ? "🔧" : "🔨") : "⚠️";
                        text2.textContent  = isNear2
                            ? (isRepairing ? "REPAIRING..." : "[CLICK / E] REPAIR")
                            : `HULL BREACH #${closestSlot2.id}`;
                        dist2El.textContent = `${minDist2.toFixed(1)}m`;

                        // Is the leak on-screen in front of us?
                        const onScreen = sp.z > 0 && sp.z < 1
                            && sp.x > MARGIN && sp.x < W - MARGIN
                            && sp.y > MARGIN && sp.y < H - MARGIN;

                        if (onScreen) {
                            // ── On-screen: hover the badge above the leak ──
                            dwEl.classList.add("visible", "on-screen");
                            dwEl.classList.remove("edge");
                            dwEl.style.left = `${sp.x}px`;
                            dwEl.style.top  = `${sp.y}px`;
                            if (arrowEl) arrowEl.style.transform = "";
                        } else {
                            // ── Off-screen / behind camera: edge-clamp with pointing arrow ──
                            dwEl.classList.add("visible", "edge");
                            dwEl.classList.remove("on-screen");

                            // Compute screen-space direction from center → leak
                            const sx = sp.z < 0 ? W - sp.x : sp.x;
                            const sy = sp.z < 0 ? H - sp.y : sp.y;

                            const cx = W / 2, cy = H / 2;
                            const dx2 = sx - cx, dy2 = sy - cy;

                            // Clamp to screen rect with margin
                            const scaleX = Math.abs(dx2) > 0.001 ? (W / 2 - MARGIN) / Math.abs(dx2) : Infinity;
                            const scaleY = Math.abs(dy2) > 0.001 ? (H / 2 - MARGIN) / Math.abs(dy2) : Infinity;
                            const clampScale = Math.min(scaleX, scaleY, 1.0);

                            const ex = cx + dx2 * clampScale;
                            const ey = cy + dy2 * clampScale;

                            dwEl.style.left = `${ex}px`;
                            dwEl.style.top  = `${ey}px`;

                            // Rotate the arrow to point toward the leak from the edge
                            const angle = Math.atan2(dy2, dx2) * (180 / Math.PI) + 90;
                            if (arrowEl) arrowEl.style.transform = `rotate(${angle}deg)`;
                        }
                    }
                }
            }
        }

        // ── GUI Updates ───────────────────────────────────────────────────────
        const kn = shipState.speed * 1.944;
        const hdeg = ((shipState.heading * 180 / Math.PI) + 360) % 360;

        (document.getElementById("speedo-val")!).textContent = kn.toFixed(1);
        (document.getElementById("spbar-fill")! as HTMLElement).style.width = Math.min(100, kn / 24 * 100) + "%";

        const tape = document.getElementById("compass-tape")! as HTMLElement;
        tape.textContent = "N···NE···E···SE···S···SW···W···NW···N";
        tape.style.left = `${90 - (hdeg / 360) * 260}px`;
        (document.getElementById("hdg-val")!).textContent = hdeg.toFixed(0).padStart(3, "0") + "°";

        // Route Waypoint Compass Guidance & Distance
        const currentTargetWp = chapterLevel.route[currentRouteWaypointIndex];
        if (currentTargetWp) {
            const dxWp = currentTargetWp.pos[0] - shipState.x;
            const dzWp = currentTargetWp.pos[1] - shipState.z;
            const distToWp = Math.hypot(dxWp, dzWp);

            // Bearing to target waypoint in degrees (0 = North, 90 = East)
            const targetBearingRad = Math.atan2(dxWp, dzWp);
            const targetBearingDeg = (targetBearingRad * 180 / Math.PI + 360) % 360;

            // Difference relative to ship heading (-180 to 180)
            const diffDeg = (targetBearingDeg - hdeg + 540) % 360 - 180;

            const pipEl = document.getElementById("compass-waypoint-pip");
            if (pipEl) {
                pipEl.style.display = "block";
                // Center is at 110px in a 220px wide dial. Dial displays ~180 degrees span
                const dialCenter = 110;
                const pxPerDeg = 220 / 180;
                const clampedOffset = Math.max(-100, Math.min(100, diffDeg * pxPerDeg));
                pipEl.style.left = `${dialCenter + clampedOffset}px`;
            }

            const distEl = document.getElementById("wp-dist-val");
            if (distEl) {
                distEl.textContent = `${currentTargetWp.id.toUpperCase()}: ${Math.round(distToWp)}M`;
            }

            // Floating 3D lantern marker animation & fade
            waypointMarker.position.x = currentTargetWp.pos[0];
            waypointMarker.position.z = currentTargetWp.pos[1];
            waypointMarker.position.y = 8 + Math.sin(performance.now() / 600) * 2;
            // Fade out when within 150m
            const fadeAlpha = Math.max(0.15, Math.min(0.9, (distToWp - 80) / 150));
            wpMat.alpha = fadeAlpha;

            // Advance waypoint when reached (< 90m)
            if (distToWp < 90 && currentRouteWaypointIndex < chapterLevel.route.length - 1) {
                currentRouteWaypointIndex++;
                showToast(`📍 Reached Waypoint: ${currentTargetWp.id.toUpperCase()}`, "success");
            }
        }

        // Animate floating drifting wreckage targets
        const nowMs = performance.now();
        for (const dw of driftingWreckages) {
            if (dw.dead) continue;
            dw.mesh.position.y = 0.5 + Math.sin(nowMs / 800 + dw.id) * 0.45;
            dw.mesh.rotation.z = Math.sin(nowMs / 1200 + dw.id) * 0.08;

            // If player ship collides with un-destroyed wreckage
            const distToShip = Math.hypot(shipState.x - dw.x, shipState.z - dw.z);
            if (distToShip < (SHIP_L / 2 + dw.radius) * 0.8) {
                shipState.speed *= 0.35; // violent deceleration
                cameraShake = 0.75;
                // Explode & destroy wreckage
                dw.dead = true;
                dw.mesh.dispose();
                triggerShipHit(dw.x, shipMesh.position.y + 1.2, dw.z);
                createExplosionVFX({ x: dw.x, y: 1.5, z: dw.z });
                if (!collisionToastCooldown) {
                    collisionToastCooldown = true;
                    showToast("⚠️ HULL BREACHED BY WRECKAGE! Equip Mallet & Planks [2] to repair, or Bail [3]!", "warning");
                    setTimeout(() => { collisionToastCooldown = false; }, 3000);
                }
            }
        }

        document.querySelectorAll(".sail-seg").forEach((el, i) => {
            el.classList.toggle("active", shipInput.sail >= (i + 1) / 5 - 0.01);
        });

        // Prompts
        let showPrompt = false, promptKey = "E", promptText = "";

        if (itarget.type === "helm") {
            showPrompt = true; promptKey = "E"; promptText = "Take the Helm";
        } else if (itarget.type === "barrel") {
            showPrompt = true; promptKey = "E / F";
            promptText = `AMMO DEPOT (${cannonShip.barrelStacks}/20 Stacks) · [E] Take Stack · [F] Store Stack`;
        } else if (itarget.type === "plankBarrel") {
            showPrompt = true; promptKey = "E / F";
            promptText = `PLANKS DEPOT (${shipSupplies.planksInBarrel}/20 Stored) · [E] Take Plank · [F] Store Plank`;
        } else if (itarget.type === "foodBarrel") {
            showPrompt = true; promptKey = "E / F";
            promptText = `PROVISIONS DEPOT (${shipSupplies.foodInBarrel}/20 Stored) · [E] Take Banana · [F] Store Banana`;
        } else if (itarget.type === "bilge") {
            showPrompt = true; promptKey = "E";
            promptText = "CARGO BILGE · [E] Bail Bilge Water (-2%/s)";
        } else if (itarget.type === "patch") {
            showPrompt = true; promptKey = "LEFT CLICK / R";
            promptText = `HULL LEAK (Severity ${itarget.slot.severity}) · [Click] Hammer Plank to Seal (${playerHotbar.planksCarried} Planks Left)`;
        } else if (itarget.type === "cannon") {
            showPrompt = true;
            const sideName = itarget.nc.c.side === "L" ? "Port" : "Starboard";
            promptKey = "E / R";
            promptText = `${sideName} Cannon #${itarget.nc.c.index + 1} (${itarget.nc.c.ammoLoaded}/16 Balls) · [E] Man · [R] Load Stack`;
        } else if (itarget.type === "ladder") {
            showPrompt = true; promptKey = "E";
            if (playerLocation === "ship") {
                promptText = `CLIMB DOWN ${itarget.side.toUpperCase()} LADDER INTO OCEAN`;
            } else {
                promptText = `BOARD SHIP VIA ${itarget.side.toUpperCase()} LADDER`;
            }
        } else if (playerHotbar.selectedSlot === 3 && !activeCannon && !isAtHelm) {
            showPrompt = true;
            if (!bucketFull) {
                if (playerDamage.waterLevel > 0) {
                    promptKey = "LEFT CLICK";
                    promptText = `WATER BUCKET · [Left Click] Scoop Bilge Water from Bottom (${Math.round(playerDamage.waterLevel * 100)}% Flood)`;
                } else {
                    promptKey = "🪣";
                    promptText = "WATER BUCKET · Bilge is Dry (0% Flood)";
                }
            } else {
                promptKey = "LEFT CLICK";
                promptText = "FULL BUCKET · Aim Overboard & [Left Click] to Dump into Ocean";
            }
        } else if (playerHotbar.selectedSlot === 4 && !activeCannon && !isAtHelm) {
            showPrompt = true; promptKey = "LEFT CLICK";
            promptText = `BANANA (${playerHotbar.foodCarried}/5 Carried) · [Left Click] Eat to Restore +35 HP`;
        }

        const ip = document.getElementById("interact-prompt")!;
        ip.classList.toggle("visible", showPrompt);
        (document.getElementById("ip-key") as HTMLElement).textContent = promptKey;
        (document.getElementById("ip-text") as HTMLElement).textContent = promptText;

        // Update Damage & Bilge HUD
        const pInflow = calcInflowRate(playerDamage);
        const pWaterPct = Math.round(playerDamage.waterLevel * 100);
        (document.getElementById("bilge-pct")!).textContent = `${pWaterPct}%`;
        const bFill = document.getElementById("bilge-fill") as HTMLElement;
        bFill.style.width = `${pWaterPct}%`;
        bFill.classList.toggle("danger", pWaterPct > 50);
        (document.getElementById("planks-val")!).textContent = `${playerDamage.planks}`;
        (document.getElementById("leak-rate-val")!).textContent =
            pInflow > 0 ? `Leaks: +${(pInflow * 100).toFixed(1)}%/s` : "Dry (0.0%/s)";

        // Update Kraken Boss Bar
        const kbBar = document.getElementById("kraken-boss-bar");
        if (kbBar) {
            kbBar.classList.toggle("visible", krakenBossState.active);
            if (krakenBossState.active) {
                const totalHp = krakenBossState.tentacles.reduce((sum, t) => sum + Math.max(0, t.hp), 0);
                const maxHp = krakenBossState.tentacles.reduce((sum, t) => sum + t.maxHp, 0);
                const pct = maxHp > 0 ? (totalHp / maxHp) * 100 : 0;
                const kbFill = document.getElementById("kbb-fill");
                if (kbFill) kbFill.style.width = `${pct}%`;
                const kbSub = document.getElementById("kbb-sub");
                if (kbSub) {
                    kbSub.textContent = `SEVERED TENTACLES: ${krakenBossState.severedCount} / ${krakenBossState.targetSevered}`;
                }
            }
        }

        // Station Overlays
        document.getElementById("helm-ov")!.classList.toggle("visible", isAtHelm);
        document.getElementById("cannon-xhair")!.classList.toggle("visible", !!activeCannon);
        document.getElementById("crosshair")!.classList.toggle("hidden", !!activeCannon);

        const stationHud = document.getElementById("cannon-station-hud")!;
        stationHud.classList.toggle("visible", !!activeCannon);
        if (activeCannon) {
            renderCannonStationHUD(activeCannon);
        }

        // Story Mode: Cutscenes, Weather, and NPC Crew Simulation
        if (cutscenePlayer.active) {
            cutscenePlayer.update(dt);
        }

        storyBeatTimer += dt;
        const currentBeat = beatsData.beats.find(b => b.id === currentStoryBeatId);
        if (currentBeat && !cutscenePlayer.active) {
            for (const trig of currentBeat.triggers) {
                if (trig.when === "timeElapsed" && storyBeatTimer >= trig.s) {
                    applyBeatActions(trig.then);
                    break;
                } else if (trig.when === "hpBelow" && trig.entity === "ship_water" && playerDamage.waterLevel <= trig.pct && storyBeatTimer >= 5.0) {
                    applyBeatActions(trig.then);
                    break;
                }
            }
        }

        currentWeather = stepWeather(currentWeather, dt, shipState.x, shipState.z);
        weatherRenderer.update(currentWeather, shipMesh.position);

        const occupiedStations = new Set<string>();
        if (isAtHelm) occupiedStations.add("wheel");
        if (activeCannon) {
            occupiedStations.add(activeCannon.side === "L" ? "cannons_port" : "cannons_starboard");
        }
        if (isRepairing) occupiedStations.add("repairs");

        npcCrew = stepNpcCrew(npcCrew, occupiedStations, playerDamage.waterLevel, dt);
        npcView.updateCrew(npcCrew, time);

        // Kraken Boss State Machine & Animated Tentacles
        if (krakenBossState.active) {
            const krakenRes = stepKrakenBoss(krakenBossState, dt, shipMesh.position);
            krakenBossState = krakenRes.boss;
            krakenView.update(krakenBossState, shipMesh.position, performance.now() / 1000);

            // Handle tentacle slam damage events
            for (const slam of krakenRes.slamEvents) {
                cameraShake = 0.85;
                playHullImpact();
                triggerShipHit(slam.x + (Math.random() - 0.5) * 4, shipMesh.position.y + 2, slam.z + (Math.random() - 0.5) * 4);
                showToast("⚠️ KRAKEN TENTACLE SLAMMED THE SHIP!", "warning");
            }
        }

        (document.getElementById("fps")!).textContent = engine.getFps().toFixed(0) + " fps";
    });

    return scene;
};

const scene = createScene();
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());

const client = new Client("ws://localhost:2567");
client.joinOrCreate("match")
    .then(r  => console.log("Joined:", r.sessionId))
    .catch(e => console.warn("Solo mode:", e.message));
