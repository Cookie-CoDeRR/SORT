/**
 * Procedural Web Audio API Sound Synthesizer for Sea of Real Thieves.
 * Generates all SFX procedurally in real-time with zero external asset dependencies.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let muted = false;

function getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtxClass) {
            audioCtx = new AudioCtxClass();
            masterGain = audioCtx.createGain();
            masterGain.gain.setValueAtTime(muted ? 0 : 0.85, audioCtx.currentTime);
            masterGain.connect(audioCtx.destination);

            // Pre-bake 2 seconds of high quality white noise
            const length = audioCtx.sampleRate * 2;
            noiseBuffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
            const channel = noiseBuffer.getChannelData(0);
            let seed = 12345;
            for (let i = 0; i < length; i++) {
                // High-performance deterministic LCG noise
                seed = (seed * 1664525 + 1013904223) | 0;
                channel[i] = (seed / 2147483648);
            }
        }
    }
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

export function resumeAudio(): void {
    const ctx = getContext();
    if (ctx && ctx.state === "suspended") {
        ctx.resume().then(() => {
            startOceanAmbience();
        }).catch(() => {});
    } else if (ctx && ctx.state === "running") {
        startOceanAmbience();
    }
}

export function isAudioMuted(): boolean {
    return muted;
}

export function toggleAudioMute(): boolean {
    muted = !muted;
    if (masterGain && audioCtx) {
        masterGain.gain.setValueAtTime(muted ? 0 : 0.85, audioCtx.currentTime);
    }
    return muted;
}

/**
 * Powerful Realistic Naval Cannon Shot:
 * 1. Supersonic muzzle shockwave crack
 * 2. Gunpowder explosion combustion roar
 * 3. Deep sub-bass punch & rumble
 * 4. Distant rolling ocean reverberation tail
 */
export function playCannonFire(isEnemy = false): void {
    const ctx = getContext();
    if (!ctx || !masterGain || muted) return;
    const now = ctx.currentTime;

    const baseVol = isEnemy ? 0.70 : 1.15;

    // 1. Supersonic Muzzle Shockwave Crack (sharp high-frequency pressure wave)
    if (noiseBuffer) {
        const crackSrc = ctx.createBufferSource();
        crackSrc.buffer = noiseBuffer;
        const crackFilter = ctx.createBiquadFilter();
        crackFilter.type = "highpass";
        crackFilter.frequency.setValueAtTime(isEnemy ? 1800 : 2500, now);
        const crackGain = ctx.createGain();
        crackGain.gain.setValueAtTime(baseVol * 1.35, now);
        crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        crackSrc.connect(crackFilter);
        crackFilter.connect(crackGain);
        crackGain.connect(masterGain);
        crackSrc.start(now);
        crackSrc.stop(now + 0.05);
    }

    // 2. Heavy Gunpowder Explosion Blast (turbulent combustion roar)
    if (noiseBuffer) {
        const roarSrc = ctx.createBufferSource();
        roarSrc.buffer = noiseBuffer;
        const roarFilter = ctx.createBiquadFilter();
        roarFilter.type = "bandpass";
        roarFilter.frequency.setValueAtTime(isEnemy ? 720 : 980, now);
        roarFilter.frequency.exponentialRampToValueAtTime(150, now + 0.45);
        roarFilter.Q.setValueAtTime(2.2, now);
        const roarGain = ctx.createGain();
        roarGain.gain.setValueAtTime(baseVol * 1.05, now);
        roarGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        roarSrc.connect(roarFilter);
        roarFilter.connect(roarGain);
        roarGain.connect(masterGain);
        roarSrc.start(now);
        roarSrc.stop(now + 0.55);
    }

    // 3. Sub-bass Ground-Shaking Detonation Boom
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(isEnemy ? 135 : 185, now);
    subOsc.frequency.exponentialRampToValueAtTime(24, now + 0.48);
    subGain.gain.setValueAtTime(baseVol * 1.0, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
    subOsc.connect(subGain);
    subGain.connect(masterGain);
    subOsc.start(now);
    subOsc.stop(now + 0.58);

    // 4. Distant Ocean Reverberation & Echo Tail (rolling thunder across the sea)
    if (noiseBuffer) {
        const echoSrc = ctx.createBufferSource();
        echoSrc.buffer = noiseBuffer;
        const echoFilter = ctx.createBiquadFilter();
        echoFilter.type = "lowpass";
        echoFilter.frequency.setValueAtTime(320, now + 0.08);
        echoFilter.frequency.linearRampToValueAtTime(75, now + 1.8);
        const echoGain = ctx.createGain();
        echoGain.gain.setValueAtTime(0.001, now);
        echoGain.gain.linearRampToValueAtTime(baseVol * 0.48, now + 0.07);
        echoGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        echoSrc.connect(echoFilter);
        echoFilter.connect(echoGain);
        echoGain.connect(masterGain);
        echoSrc.start(now);
        echoSrc.stop(now + 1.8);
    }
}


/**
 * Cannonball impact on ship hull: Heavy crunch + splintering oak crack
 */
export function playHullImpact(): void {
    const ctx = getContext();
    if (!ctx || !masterGain || muted) return;
    const now = ctx.currentTime;

    // Heavy thud
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.3);
    oscGain.gain.setValueAtTime(0.85, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.35);

    // Splintering wood crack
    if (noiseBuffer) {
        const nSrc = ctx.createBufferSource();
        nSrc.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(850, now);
        filter.Q.setValueAtTime(3.0, now);

        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.9, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        nSrc.connect(filter);
        filter.connect(nGain);
        nGain.connect(masterGain);
        nSrc.start(now);
        nSrc.stop(now + 0.28);
    }
}

/**
 * Cannonball or water splash: Rushing foaming wave splash into ocean
 */
export function playWaterSplash(volume = 0.7): void {
    const ctx = getContext();
    if (!ctx || !masterGain || muted || !noiseBuffer) return;
    const now = ctx.currentTime;

    const nSrc = ctx.createBufferSource();
    nSrc.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(380, now + 0.65);
    filter.Q.setValueAtTime(2.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    nSrc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    nSrc.start(now);
    nSrc.stop(now + 0.7);
}

let strikeCount = 0;

/**
 * Mallet/Hammer repair strike:
 * High metallic forged nail chime + splintering wood crunch + deep oak hull thwack
 */
export function playHammerStrike(): void {
    const ctx = getContext();
    if (!ctx || !masterGain || muted) return;
    const now = ctx.currentTime;
    strikeCount++;

    // Alternating organic nail resonance frequencies (1700-2350 Hz)
    const nailFreq = 1720 + ((strikeCount * 280) % 650);

    // 1. High metallic ring / forged iron nail strike
    const ringOsc = ctx.createOscillator();
    const ringGain = ctx.createGain();
    ringOsc.type = "sine";
    ringOsc.frequency.setValueAtTime(nailFreq, now);
    ringOsc.frequency.exponentialRampToValueAtTime(nailFreq * 0.85, now + 0.22);
    ringGain.gain.setValueAtTime(0.50, now);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    ringOsc.connect(ringGain);
    ringGain.connect(masterGain);
    ringOsc.start(now);
    ringOsc.stop(now + 0.25);

    // Second harmonic metallic ring
    const ring2 = ctx.createOscillator();
    const ring2G = ctx.createGain();
    ring2.type = "triangle";
    ring2.frequency.setValueAtTime(nailFreq * 1.58, now);
    ring2G.gain.setValueAtTime(0.24, now);
    ring2G.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    ring2.connect(ring2G);
    ring2G.connect(masterGain);
    ring2.start(now);
    ring2.stop(now + 0.16);

    // 2. Wood splintering / nail driving crunch (friction noise)
    if (noiseBuffer) {
        const crunchSrc = ctx.createBufferSource();
        crunchSrc.buffer = noiseBuffer;
        const crunchFilter = ctx.createBiquadFilter();
        crunchFilter.type = "bandpass";
        crunchFilter.frequency.setValueAtTime(1180, now);
        crunchFilter.Q.setValueAtTime(3.6, now);
        const crunchGain = ctx.createGain();
        crunchGain.gain.setValueAtTime(0.55, now);
        crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        crunchSrc.connect(crunchFilter);
        crunchFilter.connect(crunchGain);
        crunchGain.connect(masterGain);
        crunchSrc.start(now);
        crunchSrc.stop(now + 0.14);
    }

    // 3. Dense oak hull thwack (deep acoustic body contact)
    const woodOsc = ctx.createOscillator();
    const woodGain = ctx.createGain();
    woodOsc.type = "triangle";
    woodOsc.frequency.setValueAtTime(270, now);
    woodOsc.frequency.exponentialRampToValueAtTime(75, now + 0.13);
    woodGain.gain.setValueAtTime(0.78, now);
    woodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    woodOsc.connect(woodGain);
    woodGain.connect(masterGain);
    woodOsc.start(now);
    woodOsc.stop(now + 0.18);
}

/**
 * Placing heavy oak plank over hull breach:
 * Timber friction scrape + wood stress creak + solid frame thud
 */
export function playPlankPlacement(): void {
    const ctx = getContext();
    if (!ctx || !masterGain || muted) return;
    const now = ctx.currentTime;

    // 1. Wood on wood friction scrape
    if (noiseBuffer) {
        const scrapeSrc = ctx.createBufferSource();
        scrapeSrc.buffer = noiseBuffer;
        const scrapeFilter = ctx.createBiquadFilter();
        scrapeFilter.type = "bandpass";
        scrapeFilter.frequency.setValueAtTime(680, now);
        scrapeFilter.frequency.linearRampToValueAtTime(320, now + 0.28);
        scrapeFilter.Q.setValueAtTime(3.2, now);
        const scrapeGain = ctx.createGain();
        scrapeGain.gain.setValueAtTime(0.65, now);
        scrapeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        scrapeSrc.connect(scrapeFilter);
        scrapeFilter.connect(scrapeGain);
        scrapeGain.connect(masterGain);
        scrapeSrc.start(now);
        scrapeSrc.stop(now + 0.32);
    }

    // 2. Heavy oak timber creak
    const creakOsc = ctx.createOscillator();
    const creakGain = ctx.createGain();
    creakOsc.type = "sawtooth";
    creakOsc.frequency.setValueAtTime(140, now + 0.05);
    creakOsc.frequency.linearRampToValueAtTime(85, now + 0.25);
    creakGain.gain.setValueAtTime(0.28, now + 0.05);
    creakGain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
    creakOsc.connect(creakGain);
    creakGain.connect(masterGain);
    creakOsc.start(now + 0.05);
    creakOsc.stop(now + 0.30);

    // 3. Solid oak board thud against frame
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = "triangle";
    thudOsc.frequency.setValueAtTime(180, now + 0.20);
    thudOsc.frequency.exponentialRampToValueAtTime(50, now + 0.38);
    thudGain.gain.setValueAtTime(0.72, now + 0.20);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    thudOsc.connect(thudGain);
    thudGain.connect(masterGain);
    thudOsc.start(now + 0.20);
    thudOsc.stop(now + 0.42);
}


/**
 * Repair Completed: Triumphant naval bell chime (D major triad)
 */
export function playRepairComplete(): void {
    const ctx = getContext();
    if (!ctx || !masterGain || muted) return;
    const now = ctx.currentTime;

    // Arpeggio notes: D5 (587.33), F#5 (739.99), A5 (880.00), D6 (1174.66)
    const notes = [587.33, 739.99, 880.00, 1174.66];
    const outNode = masterGain;
    notes.forEach((freq, i) => {
        const noteTime = now + i * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, noteTime);
        gain.gain.setValueAtTime(0.35, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.5);
        osc.connect(gain);
        gain.connect(outNode);
        osc.start(noteTime);
        osc.stop(noteTime + 0.55);
    });
}

/**
 * Water Bucket Scoop: Swirling bilge water scooping sound
 */
export function playBucketScoop(): void {
    const ctx = getContext();
    if (!ctx || !masterGain || muted || !noiseBuffer) return;
    const now = ctx.currentTime;

    const nSrc = ctx.createBufferSource();
    nSrc.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.linearRampToValueAtTime(280, now + 0.45);
    filter.Q.setValueAtTime(3.5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.65, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    nSrc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    nSrc.start(now);
    nSrc.stop(now + 0.5);
}

/**
 * Water Bucket Dump Overboard: Grand tidal wave wash into the ocean
 */
export function playBucketDumpOverboard(): void {
    const ctx = getContext();
    if (!ctx || !masterGain || muted || !noiseBuffer) return;
    const now = ctx.currentTime;

    const nSrc = ctx.createBufferSource();
    nSrc.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.85);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

    nSrc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    nSrc.start(now);
    nSrc.stop(now + 0.95);
}

/**
 * Water Bucket Spill Inside Boat: Heavy wet slap on wooden deck
 */
export function playBucketSpillInside(): void {
    const ctx = getContext();
    if (!ctx || !masterGain || muted || !noiseBuffer) return;
    const now = ctx.currentTime;

    // Wood floor slap
    const slap = ctx.createOscillator();
    const slapGain = ctx.createGain();
    slap.type = "triangle";
    slap.frequency.setValueAtTime(220, now);
    slap.frequency.exponentialRampToValueAtTime(70, now + 0.2);
    slapGain.gain.setValueAtTime(0.65, now);
    slapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    slap.connect(slapGain);
    slapGain.connect(masterGain);
    slap.start(now);
    slap.stop(now + 0.25);

    // Wet puddle splash
    const nSrc = ctx.createBufferSource();
    nSrc.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(950, now);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.7, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    nSrc.connect(filter);
    filter.connect(nGain);
    nGain.connect(masterGain);
    nSrc.start(now);
    nSrc.stop(now + 0.4);
}

/**
 * Ship-to-ship collision: Creaking wooden groan and heavy hull impact crunch
 */
export function playShipCollision(): void {
    const ctx = getContext();
    if (!ctx || !masterGain || muted) return;
    const now = ctx.currentTime;

    // Heavy hull crunch
    const crunch = ctx.createOscillator();
    const crunchGain = ctx.createGain();
    crunch.type = "sawtooth";
    crunch.frequency.setValueAtTime(85, now);
    crunch.frequency.exponentialRampToValueAtTime(30, now + 0.6);
    crunchGain.gain.setValueAtTime(0.75, now);
    crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    crunch.connect(crunchGain);
    crunchGain.connect(masterGain);
    crunch.start(now);
    crunch.stop(now + 0.65);

    // Creaking wood resonance
    if (noiseBuffer) {
        const nSrc = ctx.createBufferSource();
        nSrc.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(450, now);
        filter.Q.setValueAtTime(5.0, now);
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.8, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        nSrc.connect(filter);
        filter.connect(nGain);
        nGain.connect(masterGain);
        nSrc.start(now);
        nSrc.stop(now + 0.55);
    }
}

/**
 * Item switch / Hotbar slot change: Crisp UI wood click
 */
export function playItemSwitch(): void {
    const ctx = getContext();
    if (!ctx || !masterGain || muted) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.04);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
}

/**
 * Cannon Reloading: Realistic naval cannon loading sequence
 * 1. Heavy iron ball rolling into cast iron muzzle lip (scrape & rumble)
 * 2. Heavy clank as ball drops into bore
 * 3. Wooden ramrod friction slide down the bore (shhhk)
 * 4. Solid breech seating thump & metallic ring of loaded cannon
 */
export function playCannonReload(): void {
    const ctx = getContext();
    if (!ctx || !masterGain || muted) return;
    const now = ctx.currentTime;

    // 1. Heavy iron ball rolling into cast iron muzzle lip (scrape & rumble)
    if (noiseBuffer) {
        const rollSrc = ctx.createBufferSource();
        rollSrc.buffer = noiseBuffer;
        const rollFilter = ctx.createBiquadFilter();
        rollFilter.type = "bandpass";
        rollFilter.frequency.setValueAtTime(450, now);
        rollFilter.frequency.exponentialRampToValueAtTime(280, now + 0.22);
        rollFilter.Q.setValueAtTime(4.0, now);
        const rollGain = ctx.createGain();
        rollGain.gain.setValueAtTime(0.42, now);
        rollGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        rollSrc.connect(rollFilter);
        rollFilter.connect(rollGain);
        rollGain.connect(masterGain);
        rollSrc.start(now);
        rollSrc.stop(now + 0.24);
    }

    // Heavy iron clank as ball drops into the bore
    const clankOsc = ctx.createOscillator();
    const clankGain = ctx.createGain();
    clankOsc.type = "triangle";
    clankOsc.frequency.setValueAtTime(290, now + 0.08);
    clankOsc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
    clankGain.gain.setValueAtTime(0.55, now + 0.08);
    clankGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    clankOsc.connect(clankGain);
    clankGain.connect(masterGain);
    clankOsc.start(now + 0.08);
    clankOsc.stop(now + 0.22);

    // 2. Wooden ramrod friction slide down the bore (shhhk)
    if (noiseBuffer) {
        const ramSrc = ctx.createBufferSource();
        ramSrc.buffer = noiseBuffer;
        const ramFilter = ctx.createBiquadFilter();
        ramFilter.type = "bandpass";
        ramFilter.frequency.setValueAtTime(850, now + 0.24);
        ramFilter.frequency.linearRampToValueAtTime(480, now + 0.48);
        ramFilter.Q.setValueAtTime(3.5, now + 0.24);
        const ramGain = ctx.createGain();
        ramGain.gain.setValueAtTime(0.35, now + 0.24);
        ramGain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
        ramSrc.connect(ramFilter);
        ramFilter.connect(ramGain);
        ramGain.connect(masterGain);
        ramSrc.start(now + 0.24);
        ramSrc.stop(now + 0.52);
    }

    // 3. Solid breech seating thump (powder & ball firmly packed home)
    const seatOsc = ctx.createOscillator();
    const seatGain = ctx.createGain();
    seatOsc.type = "sine";
    seatOsc.frequency.setValueAtTime(180, now + 0.48);
    seatOsc.frequency.exponentialRampToValueAtTime(55, now + 0.65);
    seatGain.gain.setValueAtTime(0.70, now + 0.48);
    seatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
    seatOsc.connect(seatGain);
    seatGain.connect(masterGain);
    seatOsc.start(now + 0.48);
    seatOsc.stop(now + 0.68);

    // High metal resonant ping of the loaded cannon
    const pingOsc = ctx.createOscillator();
    const pingGain = ctx.createGain();
    pingOsc.type = "sine";
    pingOsc.frequency.setValueAtTime(1420, now + 0.50);
    pingGain.gain.setValueAtTime(0.25, now + 0.50);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
    pingOsc.connect(pingGain);
    pingGain.connect(masterGain);
    pingOsc.start(now + 0.50);
    pingOsc.stop(now + 0.72);
}


let oceanAmbienceStarted = false;

/**
 * Starts continuous procedural ocean wind & swell ambience.
 * Self-modulates using an LFO for a natural 7-second wave breathing cycle.
 */
export function startOceanAmbience(): void {
    if (oceanAmbienceStarted) return;
    const ctx = getContext();
    if (!ctx || !masterGain || !noiseBuffer) return;

    oceanAmbienceStarted = true;

    // Loop noise buffer continuously
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Lowpass filter modulated by LFO to create ocean swell waves
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(350, ctx.currentTime);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);

    // LFO (0.13 Hz = ~7.5 seconds per wave)
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.13, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(220, ctx.currentTime); // Swells between 130Hz and 570Hz
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    // Ambient gain (gentle background presence)
    const ambGain = ctx.createGain();
    ambGain.gain.setValueAtTime(0.12, ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(ambGain);
    ambGain.connect(masterGain);
    noiseSource.start();
}

/**
 * Plank pickup from depot: Heavy oak timber rustle & clunk
 */
export function playPlankPickup(): void {
    const ctx = getContext();
    if (!ctx || !masterGain || muted) return;
    const now = ctx.currentTime;

    // Wood crate friction
    if (noiseBuffer) {
        const rustleSrc = ctx.createBufferSource();
        rustleSrc.buffer = noiseBuffer;
        const rustleFilter = ctx.createBiquadFilter();
        rustleFilter.type = "bandpass";
        rustleFilter.frequency.setValueAtTime(820, now);
        rustleFilter.Q.setValueAtTime(2.5, now);
        const rustleGain = ctx.createGain();
        rustleGain.gain.setValueAtTime(0.42, now);
        rustleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        rustleSrc.connect(rustleFilter);
        rustleFilter.connect(rustleGain);
        rustleGain.connect(masterGain);
        rustleSrc.start(now);
        rustleSrc.stop(now + 0.16);
    }

    // Heavy oak board clunk
    for (const offset of [0.03, 0.12]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(offset === 0.03 ? 240 : 160, now + offset);
        gain.gain.setValueAtTime(0.55, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.10);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + offset);
        osc.stop(now + offset + 0.12);
    }
}

/**
 * Cannonball pickup from depot: Heavy cast iron clank
 */
export function playAmmoPickup(): void {
    const ctx = getContext();
    if (!ctx || !masterGain || muted) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
}

/**
 * Single crunchy bite / chew snap on a banana
 */
export function playEatBite(): void {
    const ctx = getContext();
    if (!ctx || !masterGain || muted) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
    g.gain.setValueAtTime(0.50, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.1);

    if (noiseBuffer) {
        const n = ctx.createBufferSource();
        n.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1550, now);
        filter.Q.setValueAtTime(3.5, now);
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.45, now);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        n.connect(filter);
        filter.connect(ng);
        ng.connect(masterGain);
        n.start(now);
        n.stop(now + 0.08);
    }
}

/**
 * Satisfying swallow gulp and soothing healing chime
 */
export function playEatGulp(): void {
    const ctx = getContext();
    if (!ctx || !masterGain || muted) return;
    const mg = masterGain;
    const now = ctx.currentTime;

    // Swallow gulp
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(g);
    g.connect(mg);
    osc.start(now);
    osc.stop(now + 0.15);

    // Refreshing healing resonance (F#5 -> B5 -> D#6)
    const notes = [739.99, 987.77, 1244.5];
    notes.forEach((freq, idx) => {
        const chime = ctx.createOscillator();
        const cg = ctx.createGain();
        chime.type = "sine";
        const t = now + 0.10 + idx * 0.09;
        chime.frequency.setValueAtTime(freq, t);
        cg.gain.setValueAtTime(0.28, t);
        cg.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        chime.connect(cg);
        cg.connect(mg);
        chime.start(t);
        chime.stop(t + 0.45);
    });
}


/**
 * Eat Food (Banana): Crunchy bite munch + satisfying gulp & healing resonance
 */
export function playEatFood(): void {
    playEatBite();
    setTimeout(() => playEatBite(), 140);
    setTimeout(() => playEatGulp(), 350);
}

/**
 * Provisions / Food pickup from barrel: Fruit crate rustle
 */
export function playFoodPickup(): void {
    const ctx = getContext();
    if (!ctx || !masterGain || muted) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.12);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
}

/**
 * Ladder Climb Rung Step: Oak creak + rope tension snap
 */
export function playLadderClimb(): void {
    const ctx = getContext();
    if (!ctx || !masterGain || muted) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.10);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.13);
}

/**
 * Water Jump / Dive In: Heavy splash plunge
 */
export function playWaterJump(): void {
    playWaterSplash(0.85);
}


