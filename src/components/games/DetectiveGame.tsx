"use client";

import { useState } from "react";
import { CheckCircle2, Flag, FlagOff, ShieldCheck, XCircle } from "lucide-react";
import { fmt, resultMessage } from "@/lib/data";
import { btnBase } from "@/lib/theme";
import type { DetectiveGameData } from "@/types/games";
import { ResultScreen, StatPill, type BaseGameProps } from "./shared";

interface Props extends BaseGameProps {
  data: DetectiveGameData;
}

export default function DetectiveGame({ data, theme, ui, onFinish, onBack }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [checked, setChecked] = useState(false);

  const total = data.cases.length;
  const score = data.cases.filter((c) => selected.has(c.id) === c.isRedFlag).length;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCheck = () => {
    setChecked(true);
    onFinish(score, total);
  };

  const restart = () => {
    setSelected(new Set());
    setChecked(false);
  };

  if (checked) {
    return (
      <ResultScreen
        theme={theme}
        ui={ui}
        score={score}
        total={total}
        message={resultMessage(score, total)}
        onRestart={restart}
        onBack={onBack}
      >
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {data.cases.map((c) => {
            const flagged = selected.has(c.id);
            const right = flagged === c.isRedFlag;
            return (
              <div key={c.id} className={`rounded-xl border-l-4 border p-4 ${right ? theme.success : theme.error}`}>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
                  {right ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                  )}
                  {right ? ui.detective.youWereRight : ui.detective.youWereWrong}
                </div>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest opacity-70">{c.tag}</p>
                <p className="mt-1 text-sm font-medium">{c.text}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold">
                  {c.isRedFlag ? (
                    <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {c.isRedFlag ? ui.detective.redFlag : ui.detective.notRedFlag} ·{" "}
                  {flagged ? ui.detective.youFlagged : ui.detective.youDidNotFlag}
                </p>
                <p className="mt-2 text-sm opacity-85">{c.explanation}</p>
              </div>
            );
          })}
        </div>
      </ResultScreen>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm ${theme.muted}`}>{ui.detective.selectHint}</p>
        <StatPill theme={theme} label={ui.score} value={fmt(ui.detective.selected, { count: selected.size })} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {data.cases.map((c, i) => {
          const isOn = selected.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              aria-pressed={isOn}
              className={`relative flex flex-col rounded-xl border-2 p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                isOn
                  ? "border-rose-400 bg-rose-500/10"
                  : `${theme.border} ${theme.card} ${theme.cardHover}`
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] font-semibold uppercase tracking-widest ${theme.accentText}`}>
                  #{i + 1} · {c.tag}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    isOn ? "bg-rose-400 text-abyss-950" : `${theme.muted} border ${theme.border}`
                  }`}
                >
                  {isOn ? (
                    <Flag className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <FlagOff className="h-3 w-3" aria-hidden="true" />
                  )}
                  {isOn ? ui.detective.redFlag : ui.detective.notRedFlag}
                </span>
              </div>
              <p className="mt-3 text-sm sm:text-base">{c.text}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center">
        <button type="button" onClick={handleCheck} className={`${btnBase} ${theme.primaryBtn} px-8 py-3 text-base`}>
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          {ui.check}
        </button>
      </div>
    </div>
  );
}

