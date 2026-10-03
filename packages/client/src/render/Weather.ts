import {
    Scene,
    Vector3,
    Color3,
    Color4,
    ParticleSystem,
    DirectionalLight,
    HemisphericLight,
    StandardMaterial
} from "@babylonjs/core";
import { WeatherState } from "@corsair/shared";

export class WeatherRenderer {
    private scene: Scene;
    private rainSystem: ParticleSystem | null = null;
    private sunLight: DirectionalLight;
    private ambLight: HemisphericLight;
    private skyMat: StandardMaterial;
    private flashOverlay: HTMLElement;
    public reduceFlashing: boolean = false;

    constructor(
        scene: Scene,
        sunLight: DirectionalLight,
        ambLight: HemisphericLight,
        skyMat: StandardMaterial
    ) {
        this.scene = scene;
        this.sunLight = sunLight;
        this.ambLight = ambLight;
        this.skyMat = skyMat;

        // Create fullscreen DOM overlay for lightning / storm flashes (with photosensitivity toggle)
        this.flashOverlay = document.createElement("div");
        this.flashOverlay.id = "weather-flash-overlay";
        this.flashOverlay.style.position = "absolute";
        this.flashOverlay.style.inset = "0";
        this.flashOverlay.style.pointerEvents = "none";
        this.flashOverlay.style.zIndex = "90";
        this.flashOverlay.style.backgroundColor = "white";
        this.flashOverlay.style.opacity = "0";
        this.flashOverlay.style.transition = "opacity 0.05s ease-out";
        document.body.appendChild(this.flashOverlay);

        this.initRain();
    }

    private initRain() {
        // High-performance CPU/GPU rain particles around the player/ship
        const rain = new ParticleSystem("stormRain", 2500, this.scene);
        // Procedural particle noise texture or tiny white dot texture
        rain.emitter = new Vector3(0, 25, 0); // attached or followed dynamically
        rain.minEmitBox = new Vector3(-35, 0, -35);
        rain.maxEmitBox = new Vector3(35, 10, 35);

        rain.color1 = new Color4(0.8, 0.85, 0.95, 0.55);
        rain.color2 = new Color4(0.6, 0.7, 0.85, 0.35);
        rain.colorDead = new Color4(0.5, 0.6, 0.8, 0.0);

        rain.minSize = 0.12;
        rain.maxSize = 0.25;
        rain.minLifeTime = 0.7;
        rain.maxLifeTime = 1.2;

        rain.emitRate = 1800;
        rain.gravity = new Vector3(-4, -45, -2); // angled driving rain
        rain.direction1 = new Vector3(-2, -40, -1);
        rain.direction2 = new Vector3(-3, -50, -2);

        rain.minEmitPower = 1.0;
        rain.maxEmitPower = 2.0;
        rain.updateSpeed = 0.016;

        rain.start();
        this.rainSystem = rain;
    }

    public update(weather: WeatherState, centerPos: Vector3) {
        const intensity = Math.max(0, Math.min(1.0, weather.stormIntensity));

        // 1. Move rain emitter with player ship
        if (this.rainSystem) {
            this.rainSystem.emitter = new Vector3(centerPos.x, centerPos.y + 22, centerPos.z);
            this.rainSystem.emitRate = Math.floor(intensity * 2200);
            if (intensity < 0.05) {
                this.rainSystem.stop();
            } else if (!this.rainSystem.isStarted()) {
                this.rainSystem.start();
            }
        }

        // 2. Adjust lighting & atmosphere
        // Storm (intensity 1.0) = dark tempestuous teal/slate
        // Calm (intensity 0.0) = bright warm tropical sunlight
        const stormSun = new Color3(0.25, 0.35, 0.45);
        const calmSun = new Color3(1.0, 0.96, 0.82);
        this.sunLight.diffuse = Color3.Lerp(calmSun, stormSun, intensity);
        this.sunLight.intensity = (1.2 * (1.0 - intensity * 0.75));

        const stormAmb = new Color3(0.12, 0.18, 0.25);
        const calmAmb = new Color3(0.65, 0.85, 1.0);
        this.ambLight.diffuse = Color3.Lerp(calmAmb, stormAmb, intensity);
        this.ambLight.intensity = (0.7 * (1.0 - intensity * 0.6));

        // Sky atmosphere color
        const stormSky = new Color3(0.04, 0.07, 0.12);
        const calmSky = new Color3(0.36, 0.66, 0.98);
        this.skyMat.emissiveColor = Color3.Lerp(calmSky, stormSky, intensity);
        this.scene.clearColor = new Color4(
            this.skyMat.emissiveColor.r,
            this.skyMat.emissiveColor.g,
            this.skyMat.emissiveColor.b,
            1.0
        );

        // 3. Lightning flash rendering
        if (weather.isLightningStriking && weather.lightningIntensity > 0) {
            const flashPower = this.reduceFlashing ? weather.lightningIntensity * 0.2 : weather.lightningIntensity;
            this.flashOverlay.style.opacity = (flashPower * 0.7).toFixed(2);
            // Sky flash spike
            this.skyMat.emissiveColor = Color3.Lerp(
                this.skyMat.emissiveColor,
                new Color3(0.9, 0.95, 1.0),
                flashPower * 0.85
            );
            this.ambLight.intensity += flashPower * 1.5;
        } else {
            this.flashOverlay.style.opacity = "0";
        }
    }

    public destroy() {
        if (this.rainSystem) {
            this.rainSystem.dispose();
        }
        if (this.flashOverlay && this.flashOverlay.parentNode) {
            this.flashOverlay.parentNode.removeChild(this.flashOverlay);
        }
    }
}
