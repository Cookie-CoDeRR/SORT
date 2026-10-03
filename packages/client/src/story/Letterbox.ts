export class CinematicLetterbox {
    private topBar: HTMLElement;
    private bottomBar: HTMLElement;
    private impactOverlay: HTMLElement;
    private titleCard: HTMLElement;
    private titleText: HTMLElement;
    private subtitleText: HTMLElement;

    constructor() {
        // Top black bar
        this.topBar = document.createElement("div");
        this.topBar.id = "cinematic-top-bar";
        this.topBar.style.position = "absolute";
        this.topBar.style.top = "0";
        this.topBar.style.left = "0";
        this.topBar.style.width = "100vw";
        this.topBar.style.height = "0";
        this.topBar.style.backgroundColor = "#000000";
        this.topBar.style.zIndex = "110";
        this.topBar.style.pointerEvents = "none";
        this.topBar.style.transition = "height 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)";
        document.body.appendChild(this.topBar);

        // Bottom black bar
        this.bottomBar = document.createElement("div");
        this.bottomBar.id = "cinematic-bottom-bar";
        this.bottomBar.style.position = "absolute";
        this.bottomBar.style.bottom = "0";
        this.bottomBar.style.left = "0";
        this.bottomBar.style.width = "100vw";
        this.bottomBar.style.height = "0";
        this.bottomBar.style.backgroundColor = "#000000";
        this.bottomBar.style.zIndex = "110";
        this.bottomBar.style.pointerEvents = "none";
        this.bottomBar.style.transition = "height 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)";
        document.body.appendChild(this.bottomBar);

        // Manga / Anime / Film Impact Frame Flash Overlay (Inversion / White / Blackout)
        this.impactOverlay = document.createElement("div");
        this.impactOverlay.id = "cinematic-impact-frame";
        this.impactOverlay.style.position = "absolute";
        this.impactOverlay.style.inset = "0";
        this.impactOverlay.style.backgroundColor = "#ffffff";
        this.impactOverlay.style.mixBlendMode = "difference"; // dramatic high-contrast impact flash
        this.impactOverlay.style.opacity = "0";
        this.impactOverlay.style.zIndex = "120";
        this.impactOverlay.style.pointerEvents = "none";
        this.impactOverlay.style.transition = "opacity 0.04s ease-out";
        document.body.appendChild(this.impactOverlay);

        // Cinematic Title Card
        this.titleCard = document.createElement("div");
        this.titleCard.id = "cinematic-title-card";
        this.titleCard.style.position = "absolute";
        this.titleCard.style.top = "50%";
        this.titleCard.style.left = "50%";
        this.titleCard.style.transform = "translate(-50%, -50%) scale(0.95)";
        this.titleCard.style.display = "flex";
        this.titleCard.style.flexDirection = "column";
        this.titleCard.style.alignItems = "center";
        this.titleCard.style.gap = "8px";
        this.titleCard.style.opacity = "0";
        this.titleCard.style.zIndex = "115";
        this.titleCard.style.pointerEvents = "none";
        this.titleCard.style.transition = "all 0.5s cubic-bezier(0.2, 0.9, 0.3, 1)";

        this.titleText = document.createElement("div");
        this.titleText.style.fontFamily = "'Orbitron', sans-serif";
        this.titleText.style.fontSize = "42px";
        this.titleText.style.fontWeight = "900";
        this.titleText.style.letterSpacing = "10px";
        this.titleText.style.color = "#fbbf24";
        this.titleText.style.textShadow = "0 0 30px rgba(251, 191, 36, 0.8), 0 4px 12px #000";

        this.subtitleText = document.createElement("div");
        this.subtitleText.style.fontFamily = "'Rajdhani', sans-serif";
        this.subtitleText.style.fontSize = "18px";
        this.subtitleText.style.fontWeight = "700";
        this.subtitleText.style.letterSpacing = "6px";
        this.subtitleText.style.color = "#94a3b8";
        this.subtitleText.style.textTransform = "uppercase";

        this.titleCard.appendChild(this.titleText);
        this.titleCard.appendChild(this.subtitleText);
        document.body.appendChild(this.titleCard);
    }

    public enterCinematic(barHeight: string = "72px") {
        this.topBar.style.height = barHeight;
        this.bottomBar.style.height = barHeight;
    }

    public exitCinematic() {
        this.topBar.style.height = "0";
        this.bottomBar.style.height = "0";
        this.hideTitle();
    }

    /**
     * Triggers rapid movie-grade impact frames (strobe invert flashes on hits or lightning)
     */
    public triggerImpactFrame(flashCount: number = 2) {
        let count = 0;
        const interval = setInterval(() => {
            count++;
            this.impactOverlay.style.opacity = count % 2 === 1 ? "0.9" : "0";
            if (count >= flashCount * 2) {
                clearInterval(interval);
                this.impactOverlay.style.opacity = "0";
            }
        }, 45); // 45ms per impact frame
    }

    public showTitle(title: string, subtitle: string = "", durationMs: number = 3500) {
        this.titleText.textContent = title;
        this.subtitleText.textContent = subtitle;
        this.titleCard.style.opacity = "1";
        this.titleCard.style.transform = "translate(-50%, -50%) scale(1.0)";

        setTimeout(() => {
            this.hideTitle();
        }, durationMs);
    }

    public hideTitle() {
        this.titleCard.style.opacity = "0";
        this.titleCard.style.transform = "translate(-50%, -50%) scale(0.95)";
    }
}
