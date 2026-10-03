import { WAVE_PARAMS } from "./constants.js";

const waves = WAVE_PARAMS.map(w => {
    const len = Math.sqrt(w.direction.x * w.direction.x + w.direction.z * w.direction.z);
    const k = (2 * Math.PI) / w.wavelength;
    return {
        ...w,
        dirX: w.direction.x / len,
        dirZ: w.direction.z / len,
        k,
        omega: Math.sqrt(9.8 * k)
    };
});

export function gerstnerDisplacement(x: number, z: number, t: number, stormIntensity: number = 1.0) {
    let dx = 0;
    let dy = 0;
    let dz = 0;
    
    const intensityFactor = 0.25 + 0.75 * Math.max(0, Math.min(1.0, stormIntensity));
    
    for (const w of waves) {
        const dot = w.dirX * x + w.dirZ * z;
        const phase = w.k * dot - w.omega * t;
        const cosPhase = Math.cos(phase);
        const sinPhase = Math.sin(phase);
        
        const amp = w.amplitude * intensityFactor;
        const steep = w.steepness * (0.6 + 0.4 * intensityFactor);
        
        dx += steep * amp * w.dirX * cosPhase;
        dy += amp * sinPhase;
        dz += steep * amp * w.dirZ * cosPhase;
    }
    
    return { dx, dy, dz };
}

export function heightAt(x: number, z: number, t: number, stormIntensity: number = 1.0): number {
    let x0 = x;
    let z0 = z;
    
    // Iterative solver to find the original undisplaced coords
    for (let i = 0; i < 3; i++) {
        const disp = gerstnerDisplacement(x0, z0, t, stormIntensity);
        x0 = x - disp.dx;
        z0 = z - disp.dz;
    }
    
    const finalDisp = gerstnerDisplacement(x0, z0, t, stormIntensity);
    return finalDisp.dy;
}

export function normalAt(x: number, z: number, t: number): { x: number, y: number, z: number } {
    let x0 = x;
    let z0 = z;
    
    for (let i = 0; i < 3; i++) {
        const disp = gerstnerDisplacement(x0, z0, t);
        x0 = x - disp.dx;
        z0 = z - disp.dz;
    }
    
    let nx = 0;
    let ny = 1;
    let nz = 0;
    
    for (const w of waves) {
        const dot = w.dirX * x0 + w.dirZ * z0;
        const phase = w.k * dot - w.omega * t;
        const cosPhase = Math.cos(phase);
        const sinPhase = Math.sin(phase);
        
        const WA = w.k * w.amplitude;
        const SWA = w.steepness * WA;
        
        nx -= w.dirX * WA * cosPhase;
        nz -= w.dirZ * WA * cosPhase;
        ny -= SWA * sinPhase;
    }
    
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    return { x: nx / len, y: ny / len, z: nz / len };
}
