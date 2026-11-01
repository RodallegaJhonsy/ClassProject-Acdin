import raw from "@/data/games.json";
import type { GamesData } from "@/types/games";

// Structural type check: compilation fails if games.json does not match GamesData.
export const data: GamesData = raw;

/** Replaces {key} placeholders in a template string. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function resultMessage(score: number, total: number): string {
  const ratio = total > 0 ? score / total : 0;
  if (ratio >= 0.8) return data.ui.resultExcellent;
  if (ratio >= 0.5) return data.ui.resultGood;
  return data.ui.resultTry;
}

