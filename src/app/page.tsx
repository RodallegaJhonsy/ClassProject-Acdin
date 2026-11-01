"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionSelector from "@/components/SectionSelector";
import GameCard from "@/components/GameCard";
import GameModal from "@/components/GameModal";
import { data } from "@/lib/data";
import type { ActiveGame, GameMeta, SectionKey } from "@/types/games";

const STORAGE_KEY = "acdin-progress-v1";

export interface ProgressEntry {
  best: number;
  total: number;
}
type Progress = Record<string, ProgressEntry>;

function gameId(g: ActiveGame): string {
  return `${g.section}.${g.game}`;
}

function isProgress(value: unknown): value is Progress {
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value).every(
    (v: unknown) =>
      typeof v === "object" &&
      v !== null &&
      typeof (v as { best?: unknown }).best === "number" &&
      typeof (v as { total?: unknown }).total === "number",
  );
}

interface CardDef {
  active: ActiveGame;
  meta: GameMeta;
}

const dianaCards: CardDef[] = [
  { active: { section: "princessDiana", game: "timeline" }, meta: data.princessDiana.games.timeline },
  { active: { section: "princessDiana", game: "differences" }, meta: data.princessDiana.games.differences },
  { active: { section: "princessDiana", game: "quiz" }, meta: data.princessDiana.games.quiz },
];

const oceanCards: CardDef[] = [
  { active: { section: "oceanGate", game: "submarine" }, meta: data.oceanGate.games.submarine },
  { active: { section: "oceanGate", game: "timeline" }, meta: data.oceanGate.games.timeline },
  { active: { section: "oceanGate", game: "detective" }, meta: data.oceanGate.games.detective },
];

export default function Home() {
  const [active, setActive] = useState<ActiveGame | null>(null);
  const [progress, setProgress] = useState<Progress>({});

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isProgress(parsed)) setProgress(parsed);
      }
    } catch {
      // Ignore corrupted storage.
    }
  }, []);

  const handleFinish = useCallback((game: ActiveGame, score: number, total: number) => {
    setProgress((prev) => {
      const id = gameId(game);
      const old = prev[id];
      const better = !old || score / total > old.best / old.total;
      if (!better) return prev;
      const next = { ...prev, [id]: { best: score, total } };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage may be unavailable (private mode); progress stays in memory.
      }
      return next;
    });
  }, []);

  const renderSection = (key: SectionKey, cards: CardDef[]) => {
    const section = data[key];
    const isDiana = key === "princessDiana";
    return (
      <section
        id={key}
        aria-labelledby={`${key}-title`}
        className={
          isDiana
            ? "scroll-mt-20 bg-gradient-to-b from-beige-50 to-beige-100 py-14 sm:py-20"
            : "scroll-mt-20 bg-gradient-to-b from-abyss-800 via-abyss-900 to-abyss-950 py-14 text-slate-100 sm:py-20"
        }
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <p
                className={
                  isDiana
                    ? "text-xs font-semibold uppercase tracking-[0.25em] text-gold-500"
                    : "text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300"
                }
              >
                {section.tagline}
              </p>
              <h2
                id={`${key}-title`}
                className={
                  isDiana
                    ? "mt-3 font-serif text-3xl text-royal-950 sm:text-4xl"
                    : "mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl"
                }
              >
                {section.title}
              </h2>
              <p className={isDiana ? "mt-4 max-w-2xl text-royal-800/80" : "mt-4 max-w-2xl text-cyan-50/75"}>
                {section.intro}
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={section.cover}
              alt={section.coverAlt}
              className={
                isDiana
                  ? "hidden aspect-[4/3] w-full rounded-2xl border border-gold-300/60 object-cover shadow-lg md:block"
                  : "hidden aspect-[4/3] w-full rounded-2xl border border-cyan-400/30 object-cover shadow-lg shadow-cyan-900/40 md:block"
              }
            />
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c, i) => (
              <GameCard
                key={gameId(c.active)}
                index={i + 1}
                meta={c.meta}
                section={key}
                progress={progress[gameId(c.active)]}
                ui={data.ui}
                onPlay={() => setActive(c.active)}
              />
            ))}
          </div>
        </div>
      </section>
    );
  };

  return (
    <main className="min-h-screen">
      <Header site={data.site} />
      <SectionSelector
        label={data.site.navLabel}
        sections={[
          { key: "princessDiana", label: data.princessDiana.shortTitle },
          { key: "oceanGate", label: data.oceanGate.shortTitle },
        ]}
      />
      {renderSection("princessDiana", dianaCards)}
      {renderSection("oceanGate", oceanCards)}
      <footer className="bg-abyss-950 px-4 py-8 text-center text-xs text-cyan-100/60">
        <p className="mx-auto max-w-3xl">{data.site.footer}</p>
      </footer>

      {active && (
        <GameModal
          key={gameId(active)}
          active={active}
          onClose={() => setActive(null)}
          onFinish={(score, total) => handleFinish(active, score, total)}
        />
      )}
    </main>
  );
}

