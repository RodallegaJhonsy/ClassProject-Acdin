"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowLeft, ArrowRight, Heart, Sparkles, Trophy } from "lucide-react";
import { fmt } from "@/lib/data";
import { btnBase } from "@/lib/theme";
import type { CatchCandiesGameData } from "@/types/games";
import { ProgressBar, ResultScreen, StatPill, type BaseGameProps } from "./shared";

interface Props extends BaseGameProps {
  data: CatchCandiesGameData;
}

interface ItemFalling {
  id: number;
  x: number;
  y: number;
  speed: number;
  type: string;
  isBad: boolean;
  size: number;
}

const W = 360;
const H = 480;
const BASKET_HEIGHT = 28;
const BASKET_Y = H - 42;

export default function CatchCandiesGame({ data, theme, ui, onFinish, onBack }: Props) {
  // Key state for atomic remount on restart
  const [runId, setRunId] = useState(0);

  const handleRestart = useCallback(() => {
    setRunId((id) => id + 1);
  }, []);

  return (
    <CatchCandiesInner
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

function CatchCandiesInner({ data, theme, ui, onFinish, onBack, onRestart }: InnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onFinishRef = useRef(onFinish);

  const [candiesCaught, setCandiesCaught] = useState(0);
  const [lives, setLives] = useState(data.lives);
  const [bonusSecondsLeft, setBonusSecondsLeft] = useState<number | null>(null);
  const [isBonusActive, setIsBonusActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isDefeated, setIsDefeated] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [hitFlash, setHitFlash] = useState(false);

  // References for mutable game loop state
  const keys = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const basketXRef = useRef<number>(W / 2);
  const itemsRef = useRef<ItemFalling[]>([]);
  const nextSpawnTimeRef = useRef<number>(0);
  const nextIdRef = useRef<number>(1);
  const caughtCountRef = useRef<number>(0);
  const livesRef = useRef<number>(data.lives);
  const isBonusActiveRef = useRef<boolean>(false);
  const isFinishedRef = useRef<boolean>(false);
  const flashUntilRef = useRef<number>(0);
  const gameStartTimeRef = useRef<number>(0);
  const lastBadSpawnTimeRef = useRef<number>(0);

  const rafRef = useRef<number | null>(null);
  const bonusIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  // Compute current basket width dynamically
  const currentBasketWidth = Math.max(
    data.basket.minWidthPx,
    data.basket.widthPx - Math.floor(candiesCaught / data.basket.shrinkEvery) * 4
  );
  const currentBasketWidthRef = useRef<number>(data.basket.widthPx);
  currentBasketWidthRef.current = currentBasketWidth;

  const cleanupTimers = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (bonusIntervalRef.current !== null) {
      window.clearInterval(bonusIntervalRef.current);
      bonusIntervalRef.current = null;
    }
  }, []);

  const finishGame = useCallback((won: boolean) => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    cleanupTimers();

    setIsFinished(true);
    setIsDefeated(!won);

    const count = caughtCountRef.current;
    let calculatedScore: number;
    if (won) {
      calculatedScore = count >= data.targetCandies
        ? 100 + (count - data.targetCandies) * 10
        : Math.round((count / data.targetCandies) * 100);
    } else {
      calculatedScore = Math.max(0, Math.round((count / data.targetCandies) * 80));
    }

    setFinalScore(calculatedScore);
    onFinishRef.current(calculatedScore, 100);
  }, [data.targetCandies, cleanupTimers]);

  // Keyboard controls with proper cleanup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        keys.current.left = true;
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        keys.current.right = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.current.right = false;
    };
    const handleBlur = () => {
      keys.current.left = false;
      keys.current.right = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // Main canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let lastTime = performance.now();
    gameStartTimeRef.current = lastTime;

    const spawnItem = (now: number) => {
      const count = caughtCountRef.current;
      const inBonus = isBonusActiveRef.current;
      const timeSinceStart = now - gameStartTimeRef.current;

      const progressRatio = Math.min(1, count / data.targetCandies);

      // Interval scaling
      let interval = data.spawnConfig.initialIntervalMs - progressRatio * (data.spawnConfig.initialIntervalMs - data.spawnConfig.minIntervalMs);
      let baseSpeed = data.spawnConfig.initialSpeed + progressRatio * (data.spawnConfig.maxSpeed - data.spawnConfig.initialSpeed);

      if (inBonus) {
        interval = data.spawnConfig.minIntervalMs * 0.9;
        baseSpeed = data.spawnConfig.maxSpeed * 1.1;
      }

      // Fairness rules:
      // 1. No badType in first 3 seconds
      // 2. Never 2 badTypes in less than 400ms
      const badChance = inBonus ? data.badSpawnChanceHard : data.badSpawnChance;
      const canSpawnBad = timeSinceStart >= 3000 && now - lastBadSpawnTimeRef.current >= 400;
      const isBad = canSpawnBad && Math.random() < badChance;

      if (isBad) {
        lastBadSpawnTimeRef.current = now;
      }

      const itemType = isBad
        ? data.badTypes[Math.floor(Math.random() * data.badTypes.length)]
        : data.candyTypes[Math.floor(Math.random() * data.candyTypes.length)];

      const randomX = 25 + Math.random() * (W - 50);
      const itemSpeed = baseSpeed + (Math.random() * 0.6 - 0.3);

      itemsRef.current.push({
        id: nextIdRef.current++,
        x: randomX,
        y: -20,
        speed: itemSpeed,
        type: itemType,
        isBad,
        size: 26,
      });

      nextSpawnTimeRef.current = now + interval;
    };

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (!isFinishedRef.current) {
        // Handle basket movement
        const moveSpeed = 270;
        const bWidth = currentBasketWidthRef.current;

        if (keys.current.left) {
          basketXRef.current = Math.max(bWidth / 2, basketXRef.current - moveSpeed * dt);
        }
        if (keys.current.right) {
          basketXRef.current = Math.min(W - bWidth / 2, basketXRef.current + moveSpeed * dt);
        }

        // Spawn items
        if (now >= nextSpawnTimeRef.current) {
          spawnItem(now);
        }

        // Collision detection
        const basketLeft = basketXRef.current - bWidth / 2;
        const basketRight = basketXRef.current + bWidth / 2;
        const basketTop = BASKET_Y - 6;
        const basketBottom = BASKET_Y + BASKET_HEIGHT;

        const remainingItems: ItemFalling[] = [];

        for (const item of itemsRef.current) {
          item.y += item.speed * 60 * dt;

          const itemBottom = item.y + item.size / 2;
          const itemX = item.x;

          if (
            itemBottom >= basketTop &&
            item.y <= basketBottom &&
            itemX >= basketLeft - 4 &&
            itemX <= basketRight + 4
          ) {
            if (item.isBad) {
              livesRef.current -= 1;
              const remainingLives = livesRef.current;
              setLives(remainingLives);
              flashUntilRef.current = now + 350;
              setHitFlash(true);

              if (remainingLives <= 0) {
                finishGame(false);
                return;
              }
            } else {
              caughtCountRef.current += 1;
              const newCount = caughtCountRef.current;
              setCandiesCaught(newCount);

              // Win on targetCandies! Hard mode is optional bonus
              if (newCount === data.targetCandies && !isBonusActiveRef.current) {
                // If target reached, finish or start optional bonus
                finishGame(true);
                return;
              }
            }
          } else if (item.y < H + 30) {
            remainingItems.push(item);
          }
        }

        itemsRef.current = remainingItems;
      }

      if (now > flashUntilRef.current && flashUntilRef.current > 0) {
        setHitFlash(false);
      }

      // Draw background scene
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#0e0717");
      bgGrad.addColorStop(0.6, "#1f0d38");
      bgGrad.addColorStop(1, "#2c0e4f");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Stars
      ctx.fillStyle = "rgba(254, 240, 138, 0.4)";
      for (let i = 0; i < 15; i++) {
        const sx = ((i * 73 + 19) % W);
        const sy = ((i * 47 + 11) % (H * 0.6));
        ctx.fillRect(sx, sy, 2, 2);
      }

      // Moon
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#ffedd5";
      ctx.beginPath();
      ctx.arc(W - 40, 50, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Ground
      ctx.fillStyle = "#09030e";
      ctx.fillRect(0, H - 18, W, 18);
      ctx.fillStyle = "#ff7a00";
      ctx.fillRect(0, H - 20, W, 2);

      // Draw falling items
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const item of itemsRef.current) {
        ctx.font = `${item.size}px sans-serif`;
        ctx.fillText(item.type, item.x, item.y);
      }

      // Draw basket
      const bx = basketXRef.current;
      const by = BASKET_Y;
      const bWidth = currentBasketWidthRef.current;

      ctx.strokeStyle = "#7c2d12";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bx, by - 6, bWidth / 2.8, Math.PI, 0);
      ctx.stroke();

      ctx.fillStyle = isBonusActiveRef.current ? "#ff4500" : "#ff7a00";
      ctx.beginPath();
      ctx.ellipse(bx, by + BASKET_HEIGHT / 2, bWidth / 2, BASKET_HEIGHT / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#9a3412";
      ctx.stroke();

      // Jack-o'-lantern face
      ctx.fillStyle = "#1c0b2b";
      ctx.beginPath();
      ctx.moveTo(bx - 12, by + 8);
      ctx.lineTo(bx - 4, by + 8);
      ctx.lineTo(bx - 8, by + 2);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(bx + 12, by + 8);
      ctx.lineTo(bx + 4, by + 8);
      ctx.lineTo(bx + 8, by + 2);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(bx, by + 14, 8, 0.1, Math.PI - 0.1);
      ctx.fill();

      // Damage screen flash
      if (now < flashUntilRef.current) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.4)";
        ctx.fillRect(0, 0, W, H);
      }

      if (!isFinishedRef.current) {
        rafRef.current = requestAnimationFrame(render);
      }
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      cleanupTimers();
    };
  }, [data, finishGame, cleanupTimers]);

  const handleStartBonus = () => {
    isFinishedRef.current = false;
    isBonusActiveRef.current = true;
    setIsFinished(false);
    setIsBonusActive(true);
    setBonusSecondsLeft(data.hardModeSeconds);

    bonusIntervalRef.current = window.setInterval(() => {
      setBonusSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (bonusIntervalRef.current !== null) {
            window.clearInterval(bonusIntervalRef.current);
            bonusIntervalRef.current = null;
          }
          finishGame(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = ((e.clientX - rect.left) / rect.width) * W;
    const bWidth = currentBasketWidthRef.current;
    basketXRef.current = Math.max(bWidth / 2, Math.min(W - bWidth / 2, touchX));
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.buttons > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const touchX = ((e.clientX - rect.left) / rect.width) * W;
      const bWidth = currentBasketWidthRef.current;
      basketXRef.current = Math.max(bWidth / 2, Math.min(W - bWidth / 2, touchX));
    }
  };

  const pressBtn = (dir: "left" | "right", active: boolean) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (active) e.currentTarget.setPointerCapture(e.pointerId);
    keys.current[dir] = active;
  };

  const handleCleanBack = () => {
    cleanupTimers();
    onBack();
  };

  const handleCleanRestart = () => {
    cleanupTimers();
    onRestart();
  };

  if (isFinished) {
    let resultMessageText: string;
    if (isDefeated) {
      resultMessageText = fmt(ui.halloween.candyDefeatText, { count: candiesCaught, score: finalScore });
    } else if (candiesCaught > data.targetCandies) {
      resultMessageText = fmt(ui.halloween.bonusCompletedText, { count: candiesCaught, score: finalScore });
    } else {
      resultMessageText = fmt(ui.halloween.targetReachedText, { count: candiesCaught, score: finalScore });
    }

    return (
      <ResultScreen
        theme={theme}
        ui={ui}
        score={finalScore}
        total={100}
        message={resultMessageText}
        onRestart={handleCleanRestart}
        onBack={handleCleanBack}
      >
        <div className="mt-4 flex flex-col items-center justify-center gap-2">
          <p className="text-sm font-semibold text-orange-400">
            {isDefeated ? ui.halloween.candyDefeat : "🎃 Total Sweets Caught"}: {candiesCaught}
          </p>

          {!isDefeated && !isBonusActive && (
            <button
              type="button"
              onClick={handleStartBonus}
              className={`${btnBase} ${theme.secondaryBtn} mt-2 text-xs border-orange-500`}
            >
              <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
              Play Optional Hard Bonus Mode ({data.hardModeSeconds}s)
            </button>
          )}
        </div>
      </ResultScreen>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Top HUD: 🍬 X/20 | ❤️ X/3 | ⏱ hard mode */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <StatPill
            theme={theme}
            label="🍬"
            value={`${candiesCaught}/${data.targetCandies}`}
          />
          <StatPill
            theme={theme}
            label=""
            value={
              <span className="inline-flex items-center gap-1">
                {Array.from({ length: data.lives }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`h-4 w-4 ${
                      i < lives ? "fill-rose-500 text-rose-500" : "text-stone-600 opacity-40"
                    }`}
                  />
                ))}
              </span>
            }
          />
          {isBonusActive && bonusSecondsLeft !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500 bg-orange-950/80 px-3 py-1 text-xs font-bold text-orange-300 animate-pulse">
              <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
              ⏱ {ui.halloween.bonusMode}: {bonusSecondsLeft}s
            </span>
          )}
        </div>

        {candiesCaught >= data.targetCandies && !isFinished && (
          <button
            type="button"
            onClick={() => finishGame(true)}
            className={`${btnBase} ${theme.primaryBtn} px-3 py-1.5 text-xs`}
          >
            <Trophy className="h-3.5 w-3.5" />
            {ui.seeResults}
          </button>
        )}
      </div>

      <ProgressBar
        value={Math.min(candiesCaught, data.targetCandies)}
        max={data.targetCandies}
        theme={theme}
        label={ui.progress}
      />

      {/* Canvas Game Area */}
      <div className="mt-4 flex flex-col items-center gap-4">
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          className={`relative touch-none overflow-hidden rounded-2xl border-2 border-orange-500/40 shadow-xl shadow-purple-950/50 cursor-grab active:cursor-grabbing ${
            hitFlash ? "animate-shake" : ""
          }`}
          style={{ width: "min(100%, 360px)", aspectRatio: `${W} / ${H}` }}
        >
          <canvas ref={canvasRef} className="block h-full w-full" />
        </div>

        {/* Mobile on-screen touch buttons */}
        <div className="flex w-full max-w-[360px] justify-between gap-4">
          <button
            type="button"
            aria-label={ui.halloween.left}
            onPointerDown={pressBtn("left", true)}
            onPointerUp={pressBtn("left", false)}
            onPointerCancel={pressBtn("left", false)}
            onLostPointerCapture={() => {
              keys.current.left = false;
            }}
            className={`${btnBase} ${theme.secondaryBtn} flex-1 h-14 p-0 text-base font-bold active:scale-95`}
          >
            <ArrowLeft className="h-6 w-6" />
            <span className="ml-1">{ui.halloween.left}</span>
          </button>

          <button
            type="button"
            aria-label={ui.halloween.right}
            onPointerDown={pressBtn("right", true)}
            onPointerUp={pressBtn("right", false)}
            onPointerCancel={pressBtn("right", false)}
            onLostPointerCapture={() => {
              keys.current.right = false;
            }}
            className={`${btnBase} ${theme.secondaryBtn} flex-1 h-14 p-0 text-base font-bold active:scale-95`}
          >
            <span className="mr-1">{ui.halloween.right}</span>
            <ArrowRight className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
