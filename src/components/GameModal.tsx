"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Info, Play } from "lucide-react";
import { data } from "@/lib/data";
import { btnBase, themes } from "@/lib/theme";
import type { ActiveGame, FinishHandler, GameMeta } from "@/types/games";
import TimelineGame from "@/components/games/TimelineGame";
import DifferencesGame from "@/components/games/DifferencesGame";
import QuizGame from "@/components/games/QuizGame";
import SubmarineGame from "@/components/games/SubmarineGame";
import DetectiveGame from "@/components/games/DetectiveGame";

interface Props {
  active: ActiveGame;
  onClose: () => void;
  onFinish: FinishHandler;
}

function getMeta(active: ActiveGame): GameMeta {
  return active.section === "princessDiana"
    ? data.princessDiana.games[active.game]
    : data.oceanGate.games[active.game];
}

export default function GameModal({ active, onClose, onFinish }: Props) {
  const theme = themes[active.section];
  const meta = getMeta(active);
  const ui = data.ui;
  const [started, setStarted] = useState(false);
  const sectionTitle = data[active.section].shortTitle;

  // Lock page scroll and support Escape to close.
  useEffect(() => {
    document.body.classList.add("modal-open");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const props = { theme, ui, onFinish, onBack: onClose };

  const renderGame = () => {
    if (active.section === "princessDiana") {
      const games = data.princessDiana.games;
      switch (active.game) {
        case "timeline":
          return <TimelineGame data={games.timeline} {...props} />;
        case "differences":
          return <DifferencesGame data={games.differences} {...props} />;
        case "quiz":
          return <QuizGame data={games.quiz} {...props} />;
      }
    }
    const games = data.oceanGate.games;
    switch (active.game) {
      case "submarine":
        return <SubmarineGame data={games.submarine} {...props} />;
      case "timeline":
        return <TimelineGame data={games.timeline} {...props} />;
      case "detective":
        return <DetectiveGame data={games.detective} {...props} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-6" role="presentation">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-modal-title"
        className={`relative flex h-full w-full max-w-4xl animate-fadeIn flex-col overflow-hidden shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-3xl ${theme.modalBg} ${theme.text}`}
      >
        <div className={`flex items-center gap-3 border-b px-4 py-3 sm:px-6 ${theme.border}`}>
          <button type="button" onClick={onClose} className={`${btnBase} ${theme.secondaryBtn} shrink-0 px-3 py-2`}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{ui.backToMenu}</span>
          </button>
          <div className="min-w-0 flex-1 text-right">
            <p className={`truncate text-[11px] font-semibold uppercase tracking-widest ${theme.accentText}`}>
              {sectionTitle}
            </p>
            <h2 id="game-modal-title" className={`truncate text-base sm:text-lg ${theme.heading} font-semibold`}>
              {meta.title}
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {started ? (
            renderGame()
          ) : (
            <div className="mx-auto max-w-xl animate-fadeIn py-4 text-center sm:py-8">
              <span className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${theme.card} border ${theme.border}`}>
                <Info className={`h-7 w-7 ${theme.accentText}`} aria-hidden="true" />
              </span>
              <h3 className={`mt-4 text-2xl ${theme.heading}`}>{ui.howToPlay}</h3>
              <p className={`mt-2 ${theme.muted}`}>{meta.description}</p>
              <ol className="mt-6 space-y-3 text-left">
                {meta.instructions.map((step, i) => (
                  <li key={step} className={`flex gap-3 rounded-xl border p-3 ${theme.card} ${theme.border}`}>
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${theme.primaryBtn}`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm">{step}</span>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                autoFocus
                onClick={() => setStarted(true)}
                className={`${btnBase} ${theme.primaryBtn} mt-8 px-6 py-3 text-base`}
              >
                <Play className="h-5 w-5" aria-hidden="true" />
                {ui.start}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

