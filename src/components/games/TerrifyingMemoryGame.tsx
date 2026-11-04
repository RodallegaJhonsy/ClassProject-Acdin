"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Timer } from "lucide-react";
import { fmt, shuffle } from "@/lib/data";
import type { MemoryGameData, MemoryPair } from "@/types/games";
import { ProgressBar, ResultScreen, StatPill, type BaseGameProps } from "./shared";

interface Props extends BaseGameProps {
  data: MemoryGameData;
}

interface CardState {
  uid: string;
  pairId: string;
  icon: string;
  label: string;
}

function generateShuffledCards(pairs: MemoryPair[]): CardState[] {
  const cards: CardState[] = [];
  pairs.forEach((pair) => {
    cards.push({ uid: `${pair.id}-1`, pairId: pair.id, icon: pair.icon, label: pair.label });
    cards.push({ uid: `${pair.id}-2`, pairId: pair.id, icon: pair.icon, label: pair.label });
  });
  return shuffle(cards);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TerrifyingMemoryGame({ data, theme, ui, onFinish, onBack }: Props) {
  const [runId, setRunId] = useState(0);

  const handleRestart = useCallback(() => {
    setRunId((id) => id + 1);
  }, []);

  return (
    <TerrifyingMemoryInner
      key={runId}
      data={data}
      theme={theme}
      ui={ui}
      onFinish={onFinish}
      onBack={onBack}
      onRestart={handleRestart}
    />
  );
}

interface InnerProps extends Props {
  onRestart: () => void;
}

function TerrifyingMemoryInner({ data, theme, ui, onFinish, onBack, onRestart }: InnerProps) {
  const [cards, setCards] = useState<CardState[]>(() => generateShuffledCards(data.pairs));
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [flipsUsed, setFlipsUsed] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(data.timeLimitSeconds);
  const [isWon, setIsWon] = useState(false);
  const [defeatReason, setDefeatReason] = useState<"time" | "flips" | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const timerRef = useRef<number | null>(null);
  const flipBackTimeoutRef = useRef<number | null>(null);
  const onFinishRef = useRef(onFinish);
  const isFinishedRef = useRef(false);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const totalPairs = data.pairs.length; // 8 pairs in 4x4
  const matchedPairsCount = matched.size;

  const cleanupTimers = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (flipBackTimeoutRef.current !== null) {
      window.clearTimeout(flipBackTimeoutRef.current);
      flipBackTimeoutRef.current = null;
    }
  }, []);

  const handleDefeat = useCallback((reason: "time" | "flips") => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    cleanupTimers();
    setDefeatReason(reason);

    const score = Math.round((matched.size / totalPairs) * 60);
    onFinishRef.current(score, 100);
  }, [matched.size, totalPairs, cleanupTimers]);

  // Countdown timer
  useEffect(() => {
    if (isWon || defeatReason !== null) return;

    timerRef.current = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          handleDefeat("time");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      cleanupTimers();
    };
  }, [isWon, defeatReason, handleDefeat, cleanupTimers]);

  const handleCardClick = (card: CardState) => {
    if (isLocked || isWon || defeatReason !== null || isFinishedRef.current) return;
    if (matched.has(card.pairId)) return;
    if (flipped.includes(card.uid)) return;

    const nextFlips = flipsUsed + 1;
    setFlipsUsed(nextFlips);

    if (flipped.length === 0) {
      setFlipped([card.uid]);

      if (nextFlips >= data.maxFlips) {
        handleDefeat("flips");
      }
    } else if (flipped.length === 1) {
      const firstUid = flipped[0];
      const firstCard = cards.find((c) => c.uid === firstUid);
      if (!firstCard) return;

      const newFlipped = [firstUid, card.uid];
      setFlipped(newFlipped);

      if (firstCard.pairId === card.pairId) {
        // Matched!
        const nextMatched = new Set(matched);
        nextMatched.add(card.pairId);
        setMatched(nextMatched);
        setFlipped([]);

        if (nextMatched.size === totalPairs) {
          // Win condition!
          isFinishedRef.current = true;
          cleanupTimers();
          setIsWon(true);

          const flipsRemaining = Math.max(0, data.maxFlips - nextFlips);
          const timeBonus = Math.round((secondsRemaining / data.timeLimitSeconds) * 40);
          const flipsBonus = Math.round((flipsRemaining / data.maxFlips) * 60);
          const calculatedScore = Math.max(40, Math.min(100, timeBonus + flipsBonus));
          onFinishRef.current(calculatedScore, 100);
        }
      } else {
        // No match -> flip back after flipBackDelayMs (650ms)
        setIsLocked(true);
        if (flipBackTimeoutRef.current !== null) {
          window.clearTimeout(flipBackTimeoutRef.current);
        }
        flipBackTimeoutRef.current = window.setTimeout(() => {
          setFlipped([]);
          setIsLocked(false);
          if (nextFlips >= data.maxFlips && !isWon) {
            handleDefeat("flips");
          }
        }, data.flipBackDelayMs);
      }
    }
  };

  const handleCleanBack = () => {
    cleanupTimers();
    onBack();
  };

  const handleCleanRestart = () => {
    cleanupTimers();
    onRestart();
  };

  if (isWon) {
    const flipsRemaining = Math.max(0, data.maxFlips - flipsUsed);
    const timeBonus = Math.round((secondsRemaining / data.timeLimitSeconds) * 40);
    const flipsBonus = Math.round((flipsRemaining / data.maxFlips) * 60);
    const finalScore = Math.max(40, Math.min(100, timeBonus + flipsBonus));

    return (
      <ResultScreen
        theme={theme}
        ui={ui}
        score={finalScore}
        total={100}
        message={fmt(ui.halloween.memoryWonText, {
          time: secondsRemaining,
          flips: flipsUsed,
          score: finalScore,
        })}
        onRestart={handleCleanRestart}
        onBack={handleCleanBack}
      >
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs font-semibold text-purple-200">
          <span>{ui.halloween.memoryFlips}: {flipsUsed}/{data.maxFlips}</span>
          <span>•</span>
          <span>Time Left: {secondsRemaining}s</span>
          <span>•</span>
          <span>{ui.halloween.memoryPairs}: {totalPairs}/{totalPairs}</span>
        </div>
      </ResultScreen>
    );
  }

  if (defeatReason !== null) {
    const isTimeout = defeatReason === "time";
    // Check if player found >= 6 pairs on timeout for positive feedback "Almost!"
    const isAlmostThere = isTimeout && matchedPairsCount >= 6;
    const defeatMessage = isAlmostThere
      ? fmt(ui.halloween.memoryTimeAlmostText, { pairs: matchedPairsCount })
      : isTimeout
      ? ui.halloween.memoryTimeDefeatText
      : fmt(ui.halloween.memoryFlipsDefeatText, { maxFlips: data.maxFlips });

    const partialScore = Math.round((matchedPairsCount / totalPairs) * 60);

    return (
      <ResultScreen
        theme={theme}
        ui={ui}
        score={partialScore}
        total={100}
        message={defeatMessage}
        onRestart={handleCleanRestart}
        onBack={handleCleanBack}
      >
        <div className="mt-4 text-center">
          <p className="text-sm font-semibold text-rose-400">
            {isAlmostThere
              ? "Almost Won!"
              : isTimeout
              ? ui.halloween.memoryTimeDefeat
              : ui.halloween.memoryFlipsDefeat}
          </p>
          <p className="mt-1 text-xs text-purple-200">
            Pairs Discovered: {matchedPairsCount} / {totalPairs}
          </p>
        </div>
      </ResultScreen>
    );
  }

  return (
    <div className="animate-fadeIn mx-auto max-w-xl">
      {/* Top HUD: ⏱ MM:SS | 🔄 flips X/60 | 🃏 pares X/8 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <StatPill
            theme={theme}
            label="⏱"
            value={
              <span className={`font-mono font-bold ${secondsRemaining <= 15 ? "text-rose-400 animate-pulse" : ""}`}>
                {formatTime(secondsRemaining)}
              </span>
            }
          />
          <StatPill
            theme={theme}
            label="🔄"
            value={
              <span className={flipsUsed >= data.maxFlips - 6 ? "text-rose-400 font-bold" : ""}>
                {flipsUsed}/{data.maxFlips}
              </span>
            }
          />
          <StatPill
            theme={theme}
            label="🃏"
            value={`${matchedPairsCount}/${totalPairs}`}
          />
        </div>
      </div>

      <ProgressBar
        value={matchedPairsCount}
        max={totalPairs}
        theme={theme}
        label={ui.progress}
      />

      {/* Dynamic 4x4 Grid of Cards */}
      <div
        className="mt-5 grid gap-2.5 sm:gap-3"
        style={{
          gridTemplateColumns: `repeat(${data.gridCols}, minmax(0, 1fr))`,
        }}
      >
        {cards.map((card) => {
          const isFlipped = flipped.includes(card.uid) || matched.has(card.pairId);
          const isCardMatched = matched.has(card.pairId);

          return (
            <button
              key={card.uid}
              type="button"
              onClick={() => handleCardClick(card)}
              disabled={isCardMatched || isLocked}
              aria-label={isFlipped ? card.label : "Hidden Halloween Card"}
              className={`relative aspect-square w-full select-none rounded-xl border-2 transition-all duration-200 transform perspective-1000 ${
                isCardMatched
                  ? "border-lime-400/80 bg-spooky-900 shadow-md shadow-lime-950/40 opacity-90 scale-[0.98]"
                  : isFlipped
                  ? "border-orange-500 bg-spooky-800 shadow-lg shadow-orange-950/50 scale-[1.02]"
                  : "border-purple-600/40 bg-spooky-900/90 hover:border-orange-400 hover:bg-spooky-800 active:scale-95"
              }`}
            >
              <div className="flex h-full w-full items-center justify-center p-1 sm:p-2">
                {isFlipped ? (
                  <div className="flex flex-col items-center justify-center animate-pop">
                    <span className="text-3xl sm:text-4xl">{card.icon}</span>
                    <span className="mt-1 hidden text-[10px] font-bold text-orange-200 sm:block truncate max-w-full">
                      {card.label}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center opacity-60">
                    <Sparkles className="h-5 w-5 text-orange-400/80 sm:h-6 sm:w-6" />
                    <span className="text-[10px] font-mono font-bold text-purple-300/80">
                      ?
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
