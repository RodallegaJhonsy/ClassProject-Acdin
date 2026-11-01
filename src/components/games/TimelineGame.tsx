"use client";

import { useState, type DragEvent } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, GripVertical, ListChecks, XCircle } from "lucide-react";
import { fmt, resultMessage, shuffle } from "@/lib/data";
import { btnBase } from "@/lib/theme";
import type { TimelineEvent, TimelineGameData } from "@/types/games";
import { ResultScreen, StatPill, type BaseGameProps } from "./shared";

interface Props extends BaseGameProps {
  data: TimelineGameData;
}

/** Shuffle until the order differs from the correct one (when possible). */
function scrambled(events: TimelineEvent[]): TimelineEvent[] {
  if (events.length < 2) return [...events];
  let result = shuffle(events);
  while (result.every((e, i) => e.id === events[i].id)) result = shuffle(events);
  return result;
}

/**
 * Reusable timeline ordering game (used by both Princess Diana and OceanGate).
 * The correct order is the order of `data.events` in games.json.
 */
export default function TimelineGame({ data, theme, ui, onFinish, onBack }: Props) {
  const [items, setItems] = useState<TimelineEvent[]>(() => scrambled(data.events));
  const [checked, setChecked] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const correctIndex = (id: string) => data.events.findIndex((e) => e.id === id);
  const score = items.filter((e, i) => correctIndex(e.id) === i).length;
  const total = data.events.length;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const onDragStart = (e: DragEvent<HTMLLIElement>, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const onDragOver = (e: DragEvent<HTMLLIElement>, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    move(dragIndex, index);
    setDragIndex(index);
  };

  const handleCheck = () => {
    setChecked(true);
    onFinish(score, total);
  };

  const restart = () => {
    setItems(scrambled(data.events));
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
        <h3 className={`mt-8 mb-3 flex items-center gap-2 text-lg font-semibold ${theme.heading}`}>
          <ListChecks className={`h-5 w-5 ${theme.accentText}`} aria-hidden="true" />
          {ui.timeline.reviewTitle}
        </h3>
        <ol className="space-y-3">
          {items.map((event, i) => {
            const ok = correctIndex(event.id) === i;
            return (
              <li key={event.id} className={`rounded-xl border-l-4 border p-4 ${ok ? theme.success : theme.error}`}>
                <div className="flex items-start gap-3">
                  {ok ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider">
                      #{i + 1} · {event.year} ·{" "}
                      {ok
                        ? ui.timeline.correctPosition
                        : fmt(ui.timeline.wrongPosition, { position: correctIndex(event.id) + 1 })}
                    </p>
                    <p className="mt-1 font-medium">{event.label}</p>
                    <p className="mt-1 text-sm opacity-80">{event.explanation}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </ResultScreen>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm ${theme.muted}`}>{ui.timeline.dragHint}</p>
        <StatPill theme={theme} label={ui.score} value={`? / ${total}`} />
      </div>

      <ol className="space-y-2.5">
        {items.map((event, i) => (
          <li
            key={event.id}
            draggable
            onDragStart={(e) => onDragStart(e, i)}
            onDragOver={(e) => onDragOver(e, i)}
            onDrop={(e) => e.preventDefault()}
            onDragEnd={() => setDragIndex(null)}
            className={`flex items-center gap-3 rounded-xl border p-3 transition sm:p-4 ${theme.card} ${theme.border} ${
              dragIndex === i ? "scale-[0.98] opacity-60 ring-2 ring-current" : ""
            }`}
          >
            <GripVertical
              className={`hidden h-5 w-5 shrink-0 cursor-grab active:cursor-grabbing sm:block ${theme.muted}`}
              aria-hidden="true"
            />
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${theme.primaryBtn}`}
            >
              {i + 1}
            </span>
            <p className="min-w-0 flex-1 text-sm sm:text-base">{event.label}</p>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                onClick={() => move(i, i - 1)}
                disabled={i === 0}
                aria-label={`${ui.timeline.moveUp}: ${event.label}`}
                className={`${btnBase} ${theme.secondaryBtn} h-9 w-9 p-0 disabled:opacity-30`}
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => move(i, i + 1)}
                disabled={i === items.length - 1}
                aria-label={`${ui.timeline.moveDown}: ${event.label}`}
                className={`${btnBase} ${theme.secondaryBtn} h-9 w-9 p-0 disabled:opacity-30`}
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex justify-center">
        <button type="button" onClick={handleCheck} className={`${btnBase} ${theme.primaryBtn} px-8 py-3 text-base`}>
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          {ui.check}
        </button>
      </div>
    </div>
  );
}

