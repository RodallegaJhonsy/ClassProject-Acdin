"use client";

import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { btnBase, type Theme } from "@/lib/theme";
import type { FinishHandler, UiStrings } from "@/types/games";

/** Props shared by every mini-game component. */
export interface BaseGameProps {
  theme: Theme;
  ui: UiStrings;
  onFinish: FinishHandler;
  onBack: () => void;
}

export function ProgressBar({ value, max, theme, label }: { value: number; max: number; theme: Theme; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={`h-2.5 w-full overflow-hidden rounded-full ${theme.progressTrack}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
    >
      <div className={`h-full rounded-full transition-all duration-300 ${theme.progressFill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatPill({ theme, label, value }: { theme: Theme; label: string; value: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${theme.card} ${theme.border}`}>
      <span className={theme.muted}>{label}</span>
      <span>{value}</span>
    </span>
  );
}

interface ResultProps {
  theme: Theme;
  ui: UiStrings;
  score: number;
  total: number;
  message: string;
  onRestart: () => void;
  onBack: () => void;
  restartLabel?: string;
  children?: ReactNode;
}

export function ResultScreen({ theme, ui, score, total, message, onRestart, onBack, restartLabel, children }: ResultProps) {
  return (
    <div className="animate-fadeIn">
      <div className={`rounded-2xl border p-6 text-center sm:p-8 ${theme.card} ${theme.border}`}>
        <span className={`mx-auto grid h-16 w-16 animate-pop place-items-center rounded-full ${theme.primaryBtn}`}>
          <Trophy className="h-8 w-8" aria-hidden="true" />
        </span>
        <p className={`mt-4 text-xs font-semibold uppercase tracking-widest ${theme.accentText}`}>{ui.resultsTitle}</p>
        <p className={`mt-1 text-sm ${theme.muted}`}>{ui.yourScore}</p>
        <p className={`text-5xl font-bold ${theme.heading}`}>
          {score}
          <span className={`text-2xl ${theme.muted}`}>/{total}</span>
        </p>
        <p className="mx-auto mt-3 max-w-md">{message}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={onRestart} className={`${btnBase} ${theme.primaryBtn}`}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {restartLabel ?? ui.playAgain}
          </button>
          <button type="button" onClick={onBack} className={`${btnBase} ${theme.secondaryBtn}`}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {ui.backToMenu}
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

