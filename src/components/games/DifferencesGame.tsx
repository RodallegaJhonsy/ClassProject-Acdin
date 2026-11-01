"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Eye, ImageIcon, X } from "lucide-react";
import { fmt } from "@/lib/data";
import { btnBase } from "@/lib/theme";
import type { Difference, DifferencesGameData } from "@/types/games";
import { ProgressBar, ResultScreen, StatPill, type BaseGameProps } from "./shared";

interface Props extends BaseGameProps {
  data: DifferencesGameData;
}

interface Miss {
  id: number;
  x: number;
  y: number;
}

export default function DifferencesGame({ data, theme, ui, onFinish, onBack }: Props) {
  const [found, setFound] = useState<Set<string>>(() => new Set());
  const [misses, setMisses] = useState<Miss[]>([]);
  const [missCount, setMissCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const missId = useRef(0);
  const timers = useRef<number[]>([]);

  const total = data.differences.length;

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const hitTest = (px: number, py: number): Difference | undefined =>
    data.differences.find((d) => {
      if (found.has(d.id)) return false;
      const dx = px - d.x;
      // Convert % of height into % of width so the radius is circular.
      const dy = (py - d.y) / data.aspectRatio;
      return Math.hypot(dx, dy) <= d.radius;
    });

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (finished) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    const hit = hitTest(px, py);
    if (hit) {
      const next = new Set(found);
      next.add(hit.id);
      setFound(next);
      if (next.size === total) {
        setFinished(true);
        onFinish(total, total);
      }
    } else {
      const id = ++missId.current;
      setMissCount((c) => c + 1);
      setMisses((m) => [...m, { id, x: px, y: py }]);
      timers.current.push(
        window.setTimeout(() => setMisses((m) => m.filter((miss) => miss.id !== id)), 700),
      );
    }
  };

  const giveUp = () => {
    setFinished(true);
    onFinish(found.size, total);
  };

  const restart = () => {
    setFound(new Set());
    setMisses([]);
    setMissCount(0);
    setFinished(false);
  };

  const renderImage = (src: string, label: string) => (
    <figure className="min-w-0">
      <figcaption className={`mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest ${theme.accentText}`}>
        <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </figcaption>
      <div
        onClick={handleClick}
        className={`relative w-full touch-manipulation select-none overflow-hidden rounded-xl border-2 shadow-sm ${theme.border} ${
          finished ? "cursor-default" : "cursor-crosshair"
        }`}
        style={{ aspectRatio: String(data.aspectRatio) }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`${data.imageAlt} (${label})`} draggable={false} className="pointer-events-none h-full w-full" />
        {data.differences.map((d) => {
          const isFound = found.has(d.id);
          if (!isFound && !finished) return null;
          return (
            <span
              key={d.id}
              title={d.label}
              className={`pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-1/2 animate-pop rounded-full border-[3px] ${
                isFound ? "border-emerald-500 bg-emerald-400/15" : "border-dashed border-rose-500 bg-rose-400/15"
              }`}
              style={{ left: `${d.x}%`, top: `${d.y}%`, width: `${d.radius * 2}%` }}
            />
          );
        })}
        {misses.map((m) => (
          <X
            key={m.id}
            aria-hidden="true"
            className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-pop text-rose-600 drop-shadow"
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
            strokeWidth={3}
          />
        ))}
      </div>
    </figure>
  );

  const images = (
    <div className="grid gap-4 md:grid-cols-2">
      {renderImage(data.imageA, ui.differences.imageALabel)}
      {renderImage(data.imageB, ui.differences.imageBLabel)}
    </div>
  );

  if (finished) {
    const all = found.size === total;
    return (
      <ResultScreen
        theme={theme}
        ui={ui}
        score={found.size}
        total={total}
        message={all ? ui.differences.congrats : fmt(ui.differences.partial, { found: found.size, total })}
        onRestart={restart}
        onBack={onBack}
      >
        <div className="mt-6">{images}</div>
        <ul className="mt-4 flex flex-wrap gap-2">
          {data.differences.map((d) => (
            <li
              key={d.id}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${found.has(d.id) ? theme.success : theme.error}`}
            >
              {d.label}
            </li>
          ))}
        </ul>
      </ResultScreen>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <StatPill theme={theme} label={ui.score} value={fmt(ui.differences.found, { found: found.size, total })} />
          <StatPill theme={theme} label="" value={fmt(ui.differences.misses, { misses: missCount })} />
        </div>
        <button type="button" onClick={giveUp} className={`${btnBase} ${theme.secondaryBtn} px-3 py-2 text-xs`}>
          <Eye className="h-4 w-4" aria-hidden="true" />
          {ui.differences.giveUp}
        </button>
      </div>
      <ProgressBar value={found.size} max={total} theme={theme} label={ui.progress} />
      <div className="mt-5">{images}</div>
      <p className={`mt-4 text-xs italic ${theme.muted}`}>{ui.differences.placeholderNote}</p>
    </div>
  );
}

