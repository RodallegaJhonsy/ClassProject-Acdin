"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Footprints, Heart, RotateCcw, Skull } from "lucide-react";
import { fmt } from "@/lib/data";
import { btnBase } from "@/lib/theme";
import type { SurviveNightGameData } from "@/types/games";
import { ProgressBar, ResultScreen, StatPill, type BaseGameProps } from "./shared";

interface Props extends BaseGameProps {
  data: SurviveNightGameData;
}

type Dir = "up" | "down" | "left" | "right";

interface ActiveCreature {
  id: number;
  obstacleId: string;
  icon: string;
  x: number;
  y: number;
  baseX: number;
  speed: number;
  size: number;
  pattern: "straight" | "sine" | "zigzag" | "homing";
  createdAt: number;
  zigzagDir?: number;
  lastZigzagChange?: number;
}

interface HomingPursuer {
  x: number;
  y: number;
  size: number;
  active: boolean;
}

const W = 360;
const H = 480;
const PLAYER_SIZE = 26;
// 25m total distance over 1500px forward travel
const GOAL_PIXELS = 1500;
const METERS_PER_PX = 25 / GOAL_PIXELS;

export default function SurviveNightGame({ data, theme, ui, onFinish, onBack }: Props) {
  const [runId, setRunId] = useState(0);

  const handleRestart = useCallback(() => {
    setRunId((id) => id + 1);
  }, []);

  return (
    <SurviveNightInner
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

function SurviveNightInner({ data, theme, ui, onFinish, onBack, onRestart }: InnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onFinishRef = useRef(onFinish);

  const [lives, setLives] = useState(data.lives);
  const [distance, setDistance] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [status, setStatus] = useState<"playing" | "crashed" | "won">("playing");
  const [finalScore, setFinalScore] = useState(0);
  const [isChasing, setIsChasing] = useState(false);

  const keys = useRef<Record<Dir, boolean>>({ up: false, down: false, left: false, right: false });
  const playerPos = useRef<{ x: number; y: number }>({ x: W / 2, y: H - 85 });
  const forwardTravelRef = useRef<number>(0);
  const creaturesRef = useRef<ActiveCreature[]>([]);
  const pursuerRef = useRef<HomingPursuer>({ x: W / 2, y: H + 40, size: 34, active: false });
  const livesRef = useRef<number>(data.lives);
  const statusRef = useRef<"playing" | "crashed" | "won">("playing");
  const nextCreatureTimeRef = useRef<number>(0);
  const nextCreatureIdRef = useRef<number>(1);
  const invulnerableUntilRef = useRef<number>(0);
  const timeElapsedRef = useRef<number>(0);
  const lastLaneSpawnTimes = useRef<Record<number, number>>({});

  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const cleanupTimers = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Compute lane margins based on path narrowing
  const computeLaneMargins = (currentMeters: number): { leftMargin: number; rightMargin: number; playableWidth: number } => {
    const narrowSteps = Math.floor(currentMeters / data.pathNarrowEvery);
    const widthFactor = Math.max(data.minPathWidthPercent, 1 - narrowSteps * data.pathNarrowPercent);
    const playableWidth = (W - 60) * widthFactor;
    const leftMargin = (W - playableWidth) / 2;
    const rightMargin = leftMargin + playableWidth;
    return { leftMargin, rightMargin, playableWidth };
  };

  // Keyboard controls with proper cleanup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        keys.current.up = true;
      }
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        keys.current.down = true;
      }
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
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") keys.current.up = false;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") keys.current.down = false;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.current.right = false;
    };

    const handleBlur = () => {
      keys.current = { up: false, down: false, left: false, right: false };
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

  // Main game loop
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

    const spawnCreature = (now: number, currentMeters: number) => {
      // Fairness rule 1: In first 5 meters, calibration zone with no obstacles
      if (currentMeters < 5) return;

      const nonHomingTemplates = data.obstacles.filter((o) => o.pattern !== "homing");
      const obstacleTemplate = nonHomingTemplates[Math.floor(Math.random() * nonHomingTemplates.length)] || data.obstacles[0];
      const { leftMargin, rightMargin } = computeLaneMargins(currentMeters);

      // Divide playable width into 3 discrete lanes (0, 1, 2)
      const laneWidth = (rightMargin - leftMargin) / 3;
      const targetLane = Math.floor(Math.random() * 3);

      // Fairness rule 2: Never spawn 2 obstacles in same lane in < 800ms
      const lastSpawnInLane = lastLaneSpawnTimes.current[targetLane] || 0;
      if (now - lastSpawnInLane < 800) {
        return;
      }
      lastLaneSpawnTimes.current[targetLane] = now;

      const randomX = leftMargin + targetLane * laneWidth + laneWidth / 2;

      const rawPattern = obstacleTemplate.pattern;
      const validPattern: "straight" | "sine" | "zigzag" | "homing" =
        rawPattern === "sine" || rawPattern === "zigzag" || rawPattern === "homing"
          ? rawPattern
          : "straight";

      creaturesRef.current.push({
        id: nextCreatureIdRef.current++,
        obstacleId: obstacleTemplate.id,
        icon: obstacleTemplate.icon,
        x: randomX,
        y: -30,
        baseX: randomX,
        speed: obstacleTemplate.speed * 75,
        size: obstacleTemplate.size,
        pattern: validPattern,
        createdAt: now,
        zigzagDir: Math.random() < 0.5 ? 1 : -1,
        lastZigzagChange: now,
      });

      nextCreatureTimeRef.current = now + (750 + Math.random() * 450);
    };

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const currentDistanceMeters = Math.min(
        data.targetDistance,
        Math.round(forwardTravelRef.current * METERS_PER_PX * 10) / 10
      );

      if (statusRef.current === "playing") {
        timeElapsedRef.current += dt;
        setTimeElapsed(Math.round(timeElapsedRef.current * 10) / 10);

        // Constant forward walking speed
        const baseForwardSpeed = (data.playerSpeed / 3.5) * 52;
        const forwardSpeedBoost = keys.current.up ? 38 : 0;
        const totalForwardSpeed = baseForwardSpeed + forwardSpeedBoost;

        forwardTravelRef.current += totalForwardSpeed * dt;
        setDistance(currentDistanceMeters);

        // Check victory (reached targetDistance = 25m)
        if (forwardTravelRef.current >= GOAL_PIXELS) {
          statusRef.current = "won";
          cleanupTimers();
          setStatus("won");
          const finalTime = Math.round(timeElapsedRef.current);
          const remainingLives = livesRef.current;
          const score = Math.max(
            45,
            Math.min(100, Math.round(70 + remainingLives * 10 - Math.max(0, finalTime - 30) * 1.2))
          );
          setFinalScore(score);
          onFinishRef.current(score, 100);
          return;
        }

        // Horizontal and vertical player control within dynamic lane margins
        const { leftMargin, rightMargin } = computeLaneMargins(currentDistanceMeters);
        const lateralSpeed = 165;
        let vx = 0;
        let vy = 0;

        if (keys.current.left) vx -= lateralSpeed;
        if (keys.current.right) vx += lateralSpeed;
        if (keys.current.up) vy -= lateralSpeed * 0.4;
        if (keys.current.down) vy += lateralSpeed * 0.65;

        playerPos.current.x = Math.max(
          leftMargin + PLAYER_SIZE / 2 + 2,
          Math.min(rightMargin - PLAYER_SIZE / 2 - 2, playerPos.current.x + vx * dt)
        );
        playerPos.current.y = Math.max(
          H * 0.35,
          Math.min(H - PLAYER_SIZE - 20, playerPos.current.y + vy * dt)
        );

        // Spawn regular creatures
        if (now >= nextCreatureTimeRef.current) {
          spawnCreature(now, currentDistanceMeters);
        }

        // Homing Chaser Pursuer: appears ONLY after chaseAfterMeters (20m, final 5m)
        const pursuer = pursuerRef.current;
        if (currentDistanceMeters >= data.chaseAfterMeters) {
          if (!pursuer.active) {
            pursuer.active = true;
            pursuer.y = H + 30;
            pursuer.x = playerPos.current.x;
            setIsChasing(true);
          }

          const pursuerTargetY = playerPos.current.y;
          const chaseSpeedY = totalForwardSpeed * 0.88 + 14;
          if (pursuer.y > pursuerTargetY) {
            pursuer.y -= chaseSpeedY * dt;
          } else {
            pursuer.y = Math.min(pursuerTargetY, pursuer.y + 10 * dt);
          }

          const dx = playerPos.current.x - pursuer.x;
          pursuer.x += Math.sign(dx) * Math.min(Math.abs(dx), 70 * dt);

          const isInvulnerable = now < invulnerableUntilRef.current;
          const distToPursuer = Math.hypot(pursuer.x - playerPos.current.x, pursuer.y - playerPos.current.y);
          if (distToPursuer < (pursuer.size / 2 + PLAYER_SIZE / 2 - 4) && !isInvulnerable) {
            livesRef.current -= 1;
            const currentLives = livesRef.current;
            setLives(currentLives);
            invulnerableUntilRef.current = now + 1000; // 1000ms invulnerability
            pursuer.y += 65;

            if (currentLives <= 0) {
              statusRef.current = "crashed";
              cleanupTimers();
              setStatus("crashed");
              return;
            }
          }
        }

        // Update creature positions and patterns
        const remainingCreatures: ActiveCreature[] = [];
        const isInvulnerable = now < invulnerableUntilRef.current;

        for (const creature of creaturesRef.current) {
          creature.y += (creature.speed + totalForwardSpeed * 0.35) * dt;

          if (creature.pattern === "sine") {
            const elapsedSinceSpawn = (now - creature.createdAt) / 1000;
            creature.x = creature.baseX + Math.sin(elapsedSinceSpawn * 3.0) * 32;
          } else if (creature.pattern === "zigzag") {
            if (now - (creature.lastZigzagChange ?? 0) > 500) {
              creature.zigzagDir = (creature.zigzagDir ?? 1) * -1;
              creature.lastZigzagChange = now;
            }
            creature.x += (creature.zigzagDir ?? 1) * 65 * dt;
          } else if (creature.pattern === "homing") {
            const hdx = playerPos.current.x - creature.x;
            creature.x += Math.sign(hdx) * Math.min(Math.abs(hdx), 55 * dt);
          }

          // Collision check with player
          const dx = creature.x - playerPos.current.x;
          const dy = creature.y - playerPos.current.y;
          const distanceToPlayer = Math.hypot(dx, dy);
          const collisionRadius = (creature.size / 2) + (PLAYER_SIZE / 2) - 4;

          if (distanceToPlayer < collisionRadius && !isInvulnerable) {
            livesRef.current -= 1;
            const currentLives = livesRef.current;
            setLives(currentLives);
            invulnerableUntilRef.current = now + 1000; // 1000ms invulnerability

            if (currentLives <= 0) {
              statusRef.current = "crashed";
              cleanupTimers();
              setStatus("crashed");
              return;
            }
          }

          if (creature.y < H + 40) {
            remainingCreatures.push(creature);
          }
        }

        creaturesRef.current = remainingCreatures;
      }

      // DRAW SCENE
      const pathGrad = ctx.createLinearGradient(0, 0, 0, H);
      pathGrad.addColorStop(0, "#08040d");
      pathGrad.addColorStop(0.5, "#150927");
      pathGrad.addColorStop(1, "#1e0b38");
      ctx.fillStyle = pathGrad;
      ctx.fillRect(0, 0, W, H);

      const { leftMargin, rightMargin } = computeLaneMargins(currentDistanceMeters);

      // Walls
      ctx.fillStyle = "#0d0517";
      ctx.fillRect(0, 0, leftMargin, H);
      ctx.fillRect(rightMargin, 0, W - rightMargin, H);

      // Boundaries
      const scrollOffset = (forwardTravelRef.current * 1.2) % 60;
      ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
      ctx.lineWidth = 3;
      ctx.setLineDash([15, 15]);
      ctx.lineDashOffset = -scrollOffset;
      ctx.beginPath();
      ctx.moveTo(leftMargin, 0);
      ctx.lineTo(leftMargin, H);
      ctx.moveTo(rightMargin, 0);
      ctx.lineTo(rightMargin, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Mist
      ctx.fillStyle = "rgba(163, 230, 53, 0.05)";
      for (let i = 0; i < 4; i++) {
        const my = ((i * 120 + scrollOffset * 2) % H);
        ctx.beginPath();
        ctx.ellipse(W / 2 + Math.sin(now / 400 + i) * 35, my, (rightMargin - leftMargin) / 2.5, 20, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Goal line
      const pixelsRemaining = GOAL_PIXELS - forwardTravelRef.current;
      if (pixelsRemaining < H) {
        const goalY = pixelsRemaining;
        ctx.strokeStyle = "#a3e635";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(leftMargin, goalY);
        ctx.lineTo(rightMargin, goalY);
        ctx.stroke();

        ctx.fillStyle = "#a3e635";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🎃 25m SAFE HAVEN 🎃", W / 2, goalY - 8);
      }

      // Draw regular creatures
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const creature of creaturesRef.current) {
        ctx.font = `${creature.size}px sans-serif`;
        ctx.fillText(creature.icon, creature.x, creature.y);
      }

      // Draw pursuer
      const pursuer = pursuerRef.current;
      if (pursuer.active && pursuer.y < H + 20) {
        ctx.save();
        ctx.shadowColor = "#dc2626";
        ctx.shadowBlur = 12;
        ctx.font = `${pursuer.size}px sans-serif`;
        ctx.fillText("👺", pursuer.x, pursuer.y);
        ctx.restore();
      }

      // Draw player
      const px = playerPos.current.x;
      const py = playerPos.current.y;
      const isBlinking = now < invulnerableUntilRef.current && Math.floor(now / 80) % 2 === 0;

      if (!isBlinking) {
        const beam = ctx.createRadialGradient(px, py - 10, 5, px, py - 70, 75);
        beam.addColorStop(0, "rgba(254, 240, 138, 0.45)");
        beam.addColorStop(1, "rgba(254, 240, 138, 0)");
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(px - 8, py - 10);
        ctx.lineTo(px - 45, py - 85);
        ctx.lineTo(px + 45, py - 85);
        ctx.lineTo(px + 8, py - 10);
        ctx.fill();

        ctx.fillStyle = "#ff7a00";
        ctx.beginPath();
        ctx.arc(px, py - 6, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#7e22ce";
        ctx.beginPath();
        ctx.moveTo(px - 10, py);
        ctx.lineTo(px + 10, py);
        ctx.lineTo(px + 12, py + 16);
        ctx.lineTo(px - 12, py + 16);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#facc15";
        ctx.fillRect(px + 8, py + 2, 5, 8);
        ctx.fillStyle = "#a16207";
        ctx.fillRect(px + 7, py, 7, 2);
      }

      // Red damage screen flash
      if (statusRef.current === "crashed") {
        ctx.fillStyle = "rgba(220, 38, 38, 0.4)";
        ctx.fillRect(0, 0, W, H);
      }

      if (statusRef.current === "playing") {
        rafRef.current = requestAnimationFrame(render);
      }
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      cleanupTimers();
    };
  }, [data, cleanupTimers]);

  const press = (dir: Dir, active: boolean) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (active) e.currentTarget.setPointerCapture(e.pointerId);
    keys.current[dir] = active;
  };

  const controlBtn = (dir: Dir, label: string, Icon: typeof ArrowUp, extra = "") => (
    <button
      type="button"
      aria-label={label}
      onPointerDown={press(dir, true)}
      onPointerUp={press(dir, false)}
      onPointerCancel={press(dir, false)}
      onLostPointerCapture={() => {
        keys.current[dir] = false;
      }}
      className={`${btnBase} ${theme.secondaryBtn} h-12 w-12 touch-none select-none p-0 active:scale-95 active:bg-orange-500 active:text-stone-950 ${extra}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );

  const handleCleanBack = () => {
    cleanupTimers();
    onBack();
  };

  const handleCleanRestart = () => {
    cleanupTimers();
    onRestart();
  };

  if (status === "won") {
    return (
      <ResultScreen
        theme={theme}
        ui={ui}
        score={finalScore}
        total={100}
        message={fmt(ui.halloween.surviveWonText, {
          time: timeElapsed,
          lives,
          score: finalScore,
        })}
        onRestart={handleCleanRestart}
        onBack={handleCleanBack}
      >
        <p className={`mt-3 text-center text-xs italic ${theme.muted}`}>
          {ui.halloween.disclaimer}
        </p>
      </ResultScreen>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Top HUD: 📏 X/25m | ❤️ X/3 | 🏃 chase activo */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <StatPill
            theme={theme}
            label="📏"
            value={
              <span className="inline-flex items-center gap-1 font-mono font-bold">
                {distance.toFixed(1)}/{data.targetDistance}m
              </span>
            }
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
          {isChasing && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500 bg-rose-950/80 px-2.5 py-0.5 text-xs font-bold text-rose-300 animate-pulse">
              <Skull className="h-3.5 w-3.5 text-rose-400" />
              {ui.halloween.surviveChase}
            </span>
          )}
        </div>
      </div>

      <ProgressBar
        value={distance}
        max={data.targetDistance}
        theme={theme}
        label={ui.progress}
      />

      {/* Canvas Area & Controls */}
      <div className="mt-4 flex flex-col items-center gap-4 md:flex-row md:items-start md:justify-center md:gap-8">
        <div
          className={`relative overflow-hidden rounded-2xl border-2 border-orange-500/40 shadow-xl shadow-purple-950/60 ${
            status === "crashed" ? "animate-shake" : ""
          }`}
          style={{ width: "min(100%, 360px)", aspectRatio: `${W} / ${H}` }}
        >
          <canvas ref={canvasRef} className="block h-full w-full" />

          {status === "crashed" && (
            <div className="absolute inset-0 grid place-items-center bg-spooky-950/85 p-6 text-center animate-fadeIn">
              <div>
                <AlertTriangle className="mx-auto h-12 w-12 text-rose-400" />
                <p className="mt-2 text-2xl font-bold text-white">{ui.halloween.surviveCrashed}</p>
                <p className="mt-2 text-sm text-purple-200">{ui.halloween.surviveCrashedText}</p>
                <button
                  type="button"
                  autoFocus
                  onClick={handleCleanRestart}
                  className={`${btnBase} ${theme.primaryBtn} mt-5`}
                >
                  <RotateCcw className="h-4 w-4" />
                  {ui.playAgain}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* On-screen controls */}
        <div className="grid grid-cols-3 gap-2 md:mt-16">
          <span />
          {controlBtn("up", ui.halloween.up, ArrowUp)}
          <span />
          {controlBtn("left", ui.halloween.left, ArrowLeft)}
          {controlBtn("down", ui.halloween.down, ArrowDown)}
          {controlBtn("right", ui.halloween.right, ArrowRight)}
        </div>
      </div>

      <p className={`mt-4 text-center text-xs italic ${theme.muted}`}>
        {ui.halloween.disclaimer}
      </p>
    </div>
  );
}
