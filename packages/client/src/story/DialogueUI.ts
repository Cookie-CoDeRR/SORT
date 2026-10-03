import { DialogueLine } from "@corsair/shared";

export class DialogueUI {
    private container: HTMLElement;
    private barkBox: HTMLElement;
    private sceneBox: HTMLElement;
    private speakerEl: HTMLElement;
    private textEl: HTMLElement;
    private choicesContainer: HTMLElement;
    private barkTimeout: ReturnType<typeof setTimeout> | null = null;

    public onChoiceSelected?: (choiceId: string, flagKey: string, flagValue: boolean | string | number) => void;

    constructor() {
        // Create root UI container
        this.container = document.createElement("div");
        this.container.id = "dialogue-ui-root";
        this.container.innerHTML = `
            <style>
                #dialogue-ui-root {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    z-index: 105;
                    font-family: 'Cinzel', serif;
                }
                .dialogue-bark {
                    position: absolute;
                    bottom: 84px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(180deg, rgba(28, 22, 16, 0.96) 0%, rgba(16, 12, 8, 0.98) 100%);
                    border: 1.5px solid #c5a059;
                    box-shadow: 0 4px 25px rgba(0,0,0,0.9), inset 0 0 10px rgba(0,0,0,0.8);
                    border-radius: 4px;
                    padding: 8px 24px;
                    display: none;
                    align-items: center;
                    gap: 12px;
                    max-width: 680px;
                    pointer-events: none;
                    transition: all 0.25s cubic-bezier(.34,1.56,.64,1);
                }
                .dialogue-bark.show { display: flex; opacity: 1; }
                .db-speaker {
                    font-family: 'Cinzel', serif;
                    font-size: 12px;
                    font-weight: 900;
                    letter-spacing: 1.5px;
                    color: #d4af37;
                    text-transform: uppercase;
                }
                .db-text {
                    font-family: 'Cinzel', serif;
                    font-size: 15px;
                    font-weight: 600;
                    color: #f4ebd9;
                    letter-spacing: 0.5px;
                }

                .dialogue-scene-modal {
                    position: absolute;
                    bottom: 88px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(180deg, rgba(24, 18, 14, 0.97) 0%, rgba(14, 10, 8, 0.98) 100%);
                    backdrop-filter: blur(12px);
                    border: 2px solid #c5a059;
                    border-radius: 6px;
                    padding: 18px 28px;
                    display: none;
                    flex-direction: column;
                    gap: 10px;
                    min-width: 520px;
                    max-width: 680px;
                    pointer-events: auto;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.95), inset 0 0 15px rgba(0,0,0,0.8);
                }
                .dialogue-scene-modal.show { display: flex; }
                .ds-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .ds-speaker {
                    font-family: 'Cinzel', serif;
                    font-size: 14px;
                    font-weight: 900;
                    letter-spacing: 2px;
                    color: #d4af37;
                }
                .ds-text {
                    font-family: 'Cinzel', serif;
                    font-size: 16px;
                    line-height: 1.4;
                    color: #f4ebd9;
                    font-weight: 600;
                }
                .ds-choices {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-top: 6px;
                }
                .ds-choice-btn {
                    background: rgba(36, 26, 18, 0.85);
                    border: 1px solid rgba(197, 160, 89, 0.5);
                    border-radius: 4px;
                    padding: 9px 18px;
                    font-family: 'Cinzel', serif;
                    font-size: 14px;
                    font-weight: 700;
                    color: #e5c158;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.15s ease;
                }
                .ds-choice-btn:hover {
                    background: rgba(197, 160, 89, 0.25);
                    border-color: #f5d77f;
                    color: #fff;
                    transform: translateX(4px);
                }
            </style>
            <div class="dialogue-bark" id="d-bark">
                <span class="db-speaker" id="d-bark-speaker"></span>
                <span class="db-text" id="d-bark-text"></span>
            </div>
            <div class="dialogue-scene-modal" id="d-scene">
                <div class="ds-header">
                    <span class="ds-speaker" id="d-scene-speaker"></span>
                </div>
                <div class="ds-text" id="d-scene-text"></div>
                <div class="ds-choices" id="d-scene-choices"></div>
            </div>
        `;
        document.body.appendChild(this.container);

        this.barkBox = document.getElementById("d-bark")!;
        this.sceneBox = document.getElementById("d-scene")!;
        this.speakerEl = document.getElementById("d-scene-speaker")!;
        this.textEl = document.getElementById("d-scene-text")!;
        this.choicesContainer = document.getElementById("d-scene-choices")!;
    }

    private modalOpen: boolean = false;

    public isModalOpen(): boolean {
        return this.modalOpen;
    }

    public playLine(line: DialogueLine) {
        if (line.isBark) {
            // Non-blocking bark
            const spk = document.getElementById("d-bark-speaker")!;
            const txt = document.getElementById("d-bark-text")!;
            spk.textContent = line.speaker + ":";
            txt.textContent = line.text;

            this.barkBox.classList.add("show");
            if (this.barkTimeout) clearTimeout(this.barkTimeout);
            const dur = (line.duration || Math.max(3.0, line.text.length / 15)) * 1000;
            this.barkTimeout = setTimeout(() => {
                this.barkBox.classList.remove("show");
            }, dur);
        } else {
            // Blocking scene dialogue
            this.speakerEl.textContent = line.speaker;
            this.textEl.textContent = line.text;
            this.choicesContainer.innerHTML = "";

            if (line.choices && line.choices.length > 0) {
                this.modalOpen = true;
                if (document.exitPointerLock) {
                    try { document.exitPointerLock(); } catch { /* ignore */ }
                }
                for (const choice of line.choices) {
                    const btn = document.createElement("button");
                    btn.className = "ds-choice-btn";
                    btn.textContent = `▶ ${choice.label}`;
                    btn.onclick = () => {
                        this.modalOpen = false;
                        this.sceneBox.classList.remove("show");
                        if (this.onChoiceSelected) {
                            this.onChoiceSelected(choice.id, choice.flagKey, choice.flagValue);
                        }
                    };
                    this.choicesContainer.appendChild(btn);
                }
            } else {
                // Click to continue or auto dismiss
                const dur = (line.duration || 4.0) * 1000;
                setTimeout(() => {
                    this.sceneBox.classList.remove("show");
                }, dur);
            }

            this.sceneBox.classList.add("show");
        }
    }

    public showModalScene(speaker: string, text: string, choices: Array<{ id: string; label: string; flagKey: string; flagValue: boolean | string | number }>) {
        this.modalOpen = true;
        if (document.exitPointerLock) {
            try { document.exitPointerLock(); } catch { /* ignore */ }
        }
        this.speakerEl.textContent = speaker;
        this.textEl.textContent = text;
        this.choicesContainer.innerHTML = "";

        for (const choice of choices) {
            const btn = document.createElement("button");
            btn.className = "ds-choice-btn";
            btn.textContent = `▶ ${choice.label}`;
            btn.onclick = () => {
                this.modalOpen = false;
                this.sceneBox.classList.remove("show");
                if (this.onChoiceSelected) {
                    this.onChoiceSelected(choice.id, choice.flagKey, choice.flagValue);
                }
            };
            this.choicesContainer.appendChild(btn);
        }

        this.sceneBox.classList.add("show");
    }
}
