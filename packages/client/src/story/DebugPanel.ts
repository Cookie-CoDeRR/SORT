import { ChapterBeats } from "@corsair/shared";

export class StoryDebugPanel {
    private panel: HTMLElement;

    constructor(
        beatsData: ChapterBeats,
        onJumpBeat: (beatId: string) => void
    ) {
        this.panel = document.createElement("div");
        this.panel.id = "story-debug-panel";
        this.panel.innerHTML = `
            <style>
                #story-debug-panel {
                    position: absolute;
                    top: 80px;
                    left: 24px;
                    background: rgba(10, 15, 26, 0.92);
                    border: 1px solid rgba(234, 179, 8, 0.5);
                    border-radius: 8px;
                    padding: 10px 14px;
                    z-index: 150;
                    display: none;
                    flex-direction: column;
                    gap: 8px;
                    font-family: 'Rajdhani', sans-serif;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.8);
                }
                #story-debug-panel.open { display: flex; }
                .sdb-title {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 10px;
                    font-weight: 900;
                    letter-spacing: 1px;
                    color: #fbbf24;
                }
                .sdb-select {
                    background: #1e293b;
                    color: #fff;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-family: 'Rajdhani', sans-serif;
                    font-size: 13px;
                }
                .sdb-btn {
                    background: #d97706;
                    color: #fff;
                    border: none;
                    border-radius: 4px;
                    padding: 4px 10px;
                    cursor: pointer;
                    font-weight: 700;
                }
                .sdb-btn:hover { background: #b45309; }
                .sdb-toggle-btn {
                    position: absolute;
                    top: 10px;
                    right: 80px;
                    background: rgba(10, 15, 26, 0.8);
                    border: 1px solid rgba(234, 179, 8, 0.4);
                    color: #fbbf24;
                    font-family: 'Orbitron', sans-serif;
                    font-size: 10px;
                    font-weight: 700;
                    padding: 4px 10px;
                    border-radius: 6px;
                    cursor: pointer;
                    z-index: 90;
                }
            </style>
            <div class="sdb-title">🛠️ STORY BEAT DEBUGGER</div>
            <select class="sdb-select" id="sdb-beat-picker">
                ${beatsData.beats.map(b => `<option value="${b.id}">${b.id}</option>`).join("")}
            </select>
            <button class="sdb-btn" id="sdb-jump-btn">JUMP TO BEAT</button>
        `;
        document.body.appendChild(this.panel);

        const toggleBtn = document.createElement("button");
        toggleBtn.className = "sdb-toggle-btn";
        toggleBtn.textContent = "📜 STORY DEBUG";
        toggleBtn.onclick = () => {
            this.panel.classList.toggle("open");
        };
        document.body.appendChild(toggleBtn);

        const jumpBtn = document.getElementById("sdb-jump-btn")!;
        const picker = document.getElementById("sdb-beat-picker") as HTMLSelectElement;
        jumpBtn.onclick = () => {
            onJumpBeat(picker.value);
        };
    }
}
