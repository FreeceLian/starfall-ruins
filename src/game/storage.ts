import { parseRecords, type Records } from './records';
export type Save = { version: 1; records: Records; volume: number; musicVolume: number; bestKills: number; bestTime: number; runs: number; wins: number; reducedMotion: boolean };
const defaults: Save = { version: 1, records: {}, volume: 0.35, musicVolume: 0.25, bestKills: 0, bestTime: 0, runs: 0, wins: 0, reducedMotion: false };
export const SAVE_KEY = 'starfall-ruins-v1';
export function parseSave(raw: string | null): Save {
  try {
    const s = JSON.parse(raw ?? '{}');
    const number = (key: keyof Save, fallback: number, max: number) => typeof s?.[key] === 'number' && Number.isFinite(s[key]) ? Math.max(0, Math.min(max, s[key])) : fallback;
    return { version: 1, records: parseRecords(s?.records), volume: number('volume', defaults.volume, 1), musicVolume: number('musicVolume', defaults.musicVolume, 1), bestKills: number('bestKills', 0, 1e7), bestTime: number('bestTime', 0, 660), runs: Math.floor(number('runs', 0, 1e7)), wins: Math.floor(number('wins', 0, 1e7)), reducedMotion: s?.reducedMotion === true };
  } catch { return { ...defaults, records: {} }; }
}
export function loadSave() { try { return parseSave(localStorage.getItem(SAVE_KEY)); } catch { return { ...defaults, records: {} }; } }
export function writeSave(save: Save) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; } }
