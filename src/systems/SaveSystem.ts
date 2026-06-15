const SAVE_KEY = 'drakhart_save';

export interface SaveData {
  cardsCollected: string[];
  mechaUnlocked: boolean;
  dragonUnlocked: boolean;
  playerX: number;
  playerY: number;
  currentScene?: string;
}

export function saveGame(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // localStorage not available (e.g., incognito mode)
  }
}

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
