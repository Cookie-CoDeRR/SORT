import {
    ChapterBeats,
    ChapterBeatsSchema,
    StoryBeat,
    StoryTrigger,
    StoryAction,
    StoryFlags,
    createDefaultStoryFlags,
} from "@corsair/shared";

export interface StoryDirectorState {
    currentBeatId: string;
    beatTimer: number; // seconds spent in current beat
    flags: StoryFlags & Record<string, boolean | string | number | null | undefined | object>;
    activeObjective: string;
    currentWeatherIntensity: number;
    activeVote: {
        id: string;
        options: Array<{ id: string; label: string; flagKey: string; flagValue: boolean | string | number }>;
        votes: Record<string, string>; // clientId -> optionId
    } | null;
    currentDialogueLine: string | null;
    completedObjectives: Set<string>;
}

export class StoryDirector {
    public chapter: ChapterBeats;
    public state: StoryDirectorState;
    public onAction?: (action: StoryAction) => void;

    constructor(chapterData: unknown) {
        this.chapter = ChapterBeatsSchema.parse(chapterData);
        this.state = {
            currentBeatId: this.chapter.initialBeat,
            beatTimer: 0,
            flags: createDefaultStoryFlags(),
            activeObjective: "",
            currentWeatherIntensity: 0.5,
            activeVote: null,
            currentDialogueLine: null,
            completedObjectives: new Set(),
        };

        // Enter the initial beat
        this.enterBeat(this.state.currentBeatId);
    }

    public getCurrentBeat(): StoryBeat | undefined {
        return this.chapter.beats.find(b => b.id === this.state.currentBeatId);
    }

    public jumpToBeat(beatId: string): boolean {
        const target = this.chapter.beats.find(b => b.id === beatId);
        if (!target) return false;

        const current = this.getCurrentBeat();
        if (current) {
            this.executeActions(current.exit);
        }

        this.enterBeat(beatId);
        return true;
    }

    public step(dt: number, worldContext?: { shipX?: number; shipZ?: number; shipWaterLevel?: number; allEnemiesDead?: boolean }): void {
        this.state.beatTimer += dt;
        this.state.flags.stats.timeSeconds += dt;

        const currentBeat = this.getCurrentBeat();
        if (!currentBeat) return;

        // Evaluate triggers
        for (const trigger of currentBeat.triggers) {
            if (this.evaluateTrigger(trigger, worldContext)) {
                if (trigger.when === "timeElapsed" && trigger.then === "say") {
                    // Scripted line bark
                    continue;
                }
                // Transition to destination beat or complete
                this.executeActions(currentBeat.exit);
                this.enterBeat(trigger.then);
                break;
            }
        }
    }

    private enterBeat(beatId: string): void {
        this.state.currentBeatId = beatId;
        this.state.beatTimer = 0;
        const beat = this.getCurrentBeat();
        if (!beat) return;

        this.executeActions(beat.enter);
    }

    private executeActions(actions: StoryAction[]): void {
        for (const act of actions) {
            switch (act.do) {
                case "setObjective":
                    this.state.activeObjective = act.text;
                    break;
                case "setWeather":
                    this.state.currentWeatherIntensity = act.intensity;
                    break;
                case "setFlag":
                    this.state.flags[act.key] = act.value;
                    break;
                case "say":
                    this.state.currentDialogueLine = act.line;
                    break;
                case "startVote":
                    this.state.activeVote = {
                        id: act.id,
                        options: act.options,
                        votes: {},
                    };
                    break;
                case "checkpoint":
                    // in-memory checkpoint saved
                    break;
            }

            if (this.onAction) {
                this.onAction(act);
            }
        }
    }

    public evaluateTrigger(trigger: StoryTrigger, context?: { shipX?: number; shipZ?: number; shipWaterLevel?: number; allEnemiesDead?: boolean }): boolean {
        switch (trigger.when) {
            case "timeElapsed":
                return this.state.beatTimer >= trigger.s;
            case "flagSet":
                return this.state.flags[trigger.key] === trigger.value;
            case "objectiveDone":
                return this.state.completedObjectives.has(trigger.id);
            case "shipInZone": {
                if (!context || context.shipX === undefined || context.shipZ === undefined) return false;
                const dx = context.shipX - trigger.x;
                const dz = context.shipZ - trigger.z;
                return Math.sqrt(dx * dx + dz * dz) <= trigger.r;
            }
            case "hpBelow":
                if (!context || context.shipWaterLevel === undefined) return false;
                return context.shipWaterLevel <= trigger.pct;
            case "allEnemiesDead":
                return !!context?.allEnemiesDead;
            case "voteResult":
                return this.state.activeVote !== null && Object.keys(this.state.activeVote.votes).length > 0;
            case "cutsceneFinished":
                // Client/Server cutscene lock release
                return this.state.beatTimer >= 3.0; // fallback duration
            default:
                return false;
        }
    }

    public castVote(clientId: string, optionId: string): void {
        if (!this.state.activeVote) return;
        this.state.activeVote.votes[clientId] = optionId;

        const opt = this.state.activeVote.options.find(o => o.id === optionId);
        if (opt) {
            this.state.flags[opt.flagKey] = opt.flagValue;
        }
    }
}
