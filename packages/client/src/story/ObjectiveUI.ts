export class ObjectiveUI {
    private banner: HTMLElement;
    private textEl: HTMLElement;

    constructor() {
        this.banner = document.createElement("div");
        this.banner.id = "objective-ui-banner";
        this.banner.innerHTML = `
            <style>
                #objective-ui-banner {
                    position: absolute;
                    top: 24px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(180deg, rgba(28, 22, 16, 0.95) 0%, rgba(16, 12, 8, 0.96) 100%);
                    border: 1.5px solid #c5a059;
                    box-shadow: 0 4px 25px rgba(0,0,0,0.85), inset 0 0 10px rgba(0,0,0,0.8);
                    border-radius: 4px;
                    padding: 6px 22px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    z-index: 85;
                    pointer-events: none;
                    font-family: 'Cinzel', serif;
                }
                .obj-badge {
                    font-family: 'Cinzel', serif;
                    font-size: 10px;
                    font-weight: 900;
                    letter-spacing: 2px;
                    color: #d4af37;
                    background: rgba(212, 175, 55, 0.15);
                    border: 1px solid rgba(212, 175, 55, 0.4);
                    padding: 2px 8px;
                    border-radius: 2px;
                }
                .obj-text {
                    font-size: 14px;
                    font-weight: 700;
                    color: #f4ebd9;
                    letter-spacing: 0.5px;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.9);
                }
            </style>
            <span class="obj-badge">MISSION</span>
            <span class="obj-text" id="obj-current-text">Awaiting orders...</span>
        `;
        document.body.appendChild(this.banner);
        this.textEl = document.getElementById("obj-current-text")!;
    }

    public setObjective(text: string) {
        this.textEl.textContent = text;
        this.banner.style.animation = "none";
        // Trigger quick attention pop
        this.banner.animate([
            { transform: "translateX(-50%) scale(0.95)", opacity: 0.7 },
            { transform: "translateX(-50%) scale(1.05)", opacity: 1 },
            { transform: "translateX(-50%) scale(1.0)", opacity: 1 }
        ], { duration: 350 });
    }
}
