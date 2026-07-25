export interface SaveData {
  schemaVersion: 1;
  bestWave: number;
  victories: number;
  soundEnabled: boolean;
  reducedMotion: boolean;
}

const STORAGE_KEY = 'cosmic-defense-planetfall-save';

const defaultSave: SaveData = {
  schemaVersion: 1,
  bestWave: 0,
  victories: 0,
  soundEnabled: true,
  reducedMotion: false,
};

export class SaveService {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  get snapshot(): Readonly<SaveData> {
    return this.data;
  }

  setBestWave(wave: number): void {
    if (wave <= this.data.bestWave) return;
    this.data.bestWave = wave;
    this.persist();
  }

  recordVictory(): void {
    this.data.victories += 1;
    this.data.bestWave = Math.max(this.data.bestWave, 10);
    this.persist();
  }

  setSoundEnabled(enabled: boolean): void {
    this.data.soundEnabled = enabled;
    this.persist();
  }

  setReducedMotion(enabled: boolean): void {
    this.data.reducedMotion = enabled;
    this.persist();
  }

  private load(): SaveData {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...defaultSave };
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      if (parsed.schemaVersion !== 1) return { ...defaultSave };
      return {
        ...defaultSave,
        ...parsed,
        bestWave: Math.max(0, Math.min(10, Number(parsed.bestWave) || 0)),
        victories: Math.max(0, Number(parsed.victories) || 0),
      };
    } catch {
      return { ...defaultSave };
    }
  }

  private persist(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // The game remains playable if storage is unavailable.
    }
  }
}
