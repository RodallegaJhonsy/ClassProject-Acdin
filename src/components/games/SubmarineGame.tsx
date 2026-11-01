"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Gauge, RotateCcw, Timer } from "lucide-react";
import { fmt } from "@/lib/data";
import { btnBase } from "@/lib/theme";
import type { Obstacle, SubmarineGameData } from "@/types/games";
import { ProgressBar, ResultScreen, StatPill, type BaseGameProps } from "./shared";

interface Props extends BaseGameProps {
  data: SubmarineGameData;
}

type Status = "playing" | "crashed" | "won";
type Dir = "up" | "down" | "left" | "right";

// Logical canvas size (scaled with CSS).
const W = 360;
const H = 480;
const PPM = 60; // pixels per meter
const SURFACE_Y = 70;
const SUB_W = 48;
const SUB_H = 24;
const PASSIVE_SINK = 0.2; // m/s when no vertical key is pressed
const BEST_KEY = "acdin-sub-best-time";

const KEY_MAP: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  W: "up",
  s: "down",
  S: "down",
  a: "left",
  A: "left",
  d: "right",
  D: "right",
};

interface Bubble {
  x: number;
  y: number;
  r: number;
  v: number;
}

function obstaclePos(o: Obstacle, t: number): { x: number; y: number; r: number } {
  const sway = o.moveRange ? Math.sin(t * (o.speed ?? 1)) * (o.moveRange / 100) * W : 0;
  return { x: (o.x / 100) * W + sway, y: SURFACE_Y + o.depth * PPM, r: o.size / 2 };
}

function circleRectHit(cx: number, cy: number, r: number, rx: number, ry: number, rw: number, rh: number): boolean {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  return (cx - nx) ** 2 + (cy - ny) ** 2 <= r * r;
}

function computeScore(seconds: number): number {
  return Math.max(40, Math.min(100, Math.round(100 - Math.max(0, seconds - 32) * 2)));
}

export default function SubmarineGame({ data, theme, ui, onFinish, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useRef<Record<Dir, boolean>>({ up: false, down: false, left: false, right: false });
  const statusRef = useRef<Status>("playing");
  const onFinishRef = useRef(onFinish);
  const [status, setStatus] = useState<Status>("playing");
  const [runId, setRunId] = useState(0);
  const [hud, setHud] = useState({ depth: 0, time: 0 });
  const [result, setResult] = useState<{ time: number; score: number } | null>(null);
  const [bestTime, setBestTime] = useState<number | null>(null);

  const target = data.targetDepth;

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(BEST_KEY);
      const n = stored ? Number(stored) : NaN;
      if (Number.isFinite(n) && n > 0) setBestTime(n);
    } catch {
      // Storage unavailable.
    }
  }, []);

  // Keyboard controls.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const dir = KEY_MAP[e.key];
      if (!dir) return;
      e.preventDefault();
      keys.current[dir] = true;
    };
    const up = (e: KeyboardEvent) => {
      const dir = KEY_MAP[e.key];
      if (dir) keys.current[dir] = false;
    };
    const blur = () => {
      keys.current = { up: false, down: false, left: false, right: false };
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  // Game loop (restarts whenever runId changes).
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const targetY = SURFACE_Y + target * PPM;
    const worldBottom = targetY + 140;
    const maxV = data.maxDescentSpeed * PPM;

    let subX = W / 2;
    let subY = SURFACE_Y;
    let vx = 0;
    let vy = 0;
    let facing = 1;
    let elapsed = 0;
    let crashT = 0;
    let last = performance.now();
    let hudTimer = 0;
    let frame = 0;
    const bubbles: Bubble[] = Array.from({ length: 28 }, () => ({
      x: Math.random() * W,
      y: SURFACE_Y + Math.random() * (worldBottom - SURFACE_Y),
      r: 1 + Math.random() * 2.5,
      v: 12 + Math.random() * 20,
    }));
    statusRef.current = "playing";
    keys.current = { up: false, down: false, left: false, right: false };

    const draw = (camY: number, t: number) => {
      // Water gradient across the whole world.
      const grad = ctx.createLinearGradient(0, SURFACE_Y - camY, 0, worldBottom - camY);
      grad.addColorStop(0, "#1479a8");
      grad.addColorStop(0.5, "#0a3f66");
      grad.addColorStop(1, "#03111f");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Sky above the surface.
      const skyBottom = SURFACE_Y - camY;
      if (skyBottom > 0) {
        const sky = ctx.createLinearGradient(0, -camY, 0, skyBottom);
        sky.addColorStop(0, "#9fd8f2");
        sky.addColorStop(1, "#dff3fb");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, skyBottom);
        // Waves.
        ctx.fillStyle = "#1479a8";
        ctx.beginPath();
        ctx.moveTo(0, skyBottom);
        for (let x = 0; x <= W; x += 10) ctx.lineTo(x, skyBottom + Math.sin(x / 22 + t * 2) * 3);
        ctx.lineTo(W, skyBottom + 10);
        ctx.lineTo(0, skyBottom + 10);
        ctx.fill();
      }

      // Light rays.
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 4; i++) {
        const x0 = 40 + i * 95 + Math.sin(t * 0.4 + i) * 10;
        ctx.beginPath();
        ctx.moveTo(x0, SURFACE_Y - camY);
        ctx.lineTo(x0 + 30, SURFACE_Y - camY);
        ctx.lineTo(x0 + 90, SURFACE_Y - camY + 520);
        ctx.lineTo(x0 + 20, SURFACE_Y - camY + 520);
        ctx.fill();
      }
      ctx.restore();

      // Bubbles.
      ctx.strokeStyle = "rgba(200,240,255,0.45)";
      ctx.lineWidth = 1;
      bubbles.forEach((b) => {
        ctx.beginPath();
        ctx.arc(b.x, b.y - camY, b.r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Depth scale.
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "right";
      for (let m = 5; m < target; m += 5) {
        const y = SURFACE_Y + m * PPM - camY;
        if (y < -10 || y > H + 10) continue;
        ctx.fillStyle = "rgba(165,243,252,0.6)";
        ctx.fillRect(W - 18, y, 14, 1.5);
        ctx.fillText(`${m} m`, W - 22, y + 3);
      }

      // Goal line + seabed.
      const gy = targetY - camY;
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = "#67e8f9";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#67e8f9";
      ctx.textAlign = "left";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillText(`${ui.submarine.goal}: ${target} m`, 8, gy - 6);
      ctx.fillStyle = "#3b3324";
      ctx.beginPath();
      ctx.moveTo(0, gy + 50);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, gy + 44 + Math.sin(x / 30) * 6);
      ctx.lineTo(W, H + 200);
      ctx.lineTo(0, H + 200);
      ctx.fill();

      // Obstacles.
      data.obstacles.forEach((o, i) => {
        const p = obstaclePos(o, t);
        const y = p.y - camY;
        if (y < -60 || y > H + 60) return;
        if (o.type === "jellyfish") {
          const pulse = 1 + Math.sin(t * 4 + i) * 0.06;
          ctx.fillStyle = "rgba(244,114,182,0.85)";
          ctx.beginPath();
          ctx.ellipse(p.x, y, p.r * pulse, p.r * 0.75, 0, Math.PI, 0);
          ctx.fill();
          ctx.strokeStyle = "rgba(251,207,232,0.8)";
          ctx.lineWidth = 2;
          for (let k = -2; k <= 2; k++) {
            ctx.beginPath();
            const tx = p.x + k * (p.r / 2.6);
            ctx.moveTo(tx, y);
            ctx.quadraticCurveTo(tx + Math.sin(t * 5 + k) * 5, y + p.r * 0.6, tx, y + p.r * 1.1);
            ctx.stroke();
          }
        } else {
          ctx.fillStyle = "#4b5563";
          ctx.beginPath();
          for (let k = 0; k < 9; k++) {
            const a = (k / 9) * Math.PI * 2;
            const rr = p.r * (0.85 + ((k * 37 + i * 13) % 10) / 60);
            const px = p.x + Math.cos(a) * rr;
            const py = y + Math.sin(a) * rr;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#6b7280";
          ctx.beginPath();
          ctx.arc(p.x - p.r * 0.25, y - p.r * 0.25, p.r * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Submarine.
      const sy = subY - camY;
      ctx.save();
      ctx.translate(subX, sy);
      if (statusRef.current === "crashed") ctx.rotate(Math.sin(crashT * 30) * 0.15);
      ctx.scale(facing, 1);
      // Headlight.
      const light = ctx.createRadialGradient(SUB_W / 2, 0, 2, SUB_W / 2 + 60, 0, 70);
      light.addColorStop(0, "rgba(254,249,195,0.35)");
      light.addColorStop(1, "rgba(254,249,195,0)");
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.moveTo(SUB_W / 2, 0);
      ctx.lineTo(SUB_W / 2 + 110, -40);
      ctx.lineTo(SUB_W / 2 + 110, 40);
      ctx.fill();
      // Body.
      ctx.fillStyle = statusRef.current === "crashed" ? "#f87171" : "#facc15";
      ctx.beginPath();
      ctx.ellipse(0, 0, SUB_W / 2, SUB_H / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-8, -SUB_H / 2 - 7, 16, 9);
      ctx.fillStyle = "#0e7490";
      ctx.beginPath();
      ctx.arc(10, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a16207";
      ctx.fillRect(-SUB_W / 2 - 6, -5, 6, 10);
      ctx.restore();

      if (statusRef.current === "crashed") {
        ctx.fillStyle = `rgba(239,68,68,${Math.max(0, 0.35 - crashT * 0.5)})`;
        ctx.fillRect(0, 0, W, H);
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = statusRef.current;

      if (st === "playing") {
        elapsed += dt;
        const k = keys.current;
        const tx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
        const targetVx = tx * data.horizontalSpeed;
        let targetVy = PASSIVE_SINK * PPM;
        if (k.down && !k.up) targetVy = maxV;
        else if (k.up && !k.down) targetVy = -maxV * 0.8;
        const blend = Math.min(1, dt * 6);
        vx += (targetVx - vx) * blend;
        vy += (targetVy - vy) * blend;
        if (tx !== 0) facing = tx;
        subX = Math.max(SUB_W / 2, Math.min(W - SUB_W / 2, subX + vx * dt));
        subY = Math.max(SURFACE_Y, subY + vy * dt);

        // Collisions (slightly forgiving hitbox).
        const hit = data.obstacles.some((o) => {
          const p = obstaclePos(o, elapsed);
          return circleRectHit(p.x, p.y, p.r * 0.82, subX - SUB_W / 2 + 4, subY - SUB_H / 2 + 3, SUB_W - 8, SUB_H - 6);
        });
        if (hit) {
          statusRef.current = "crashed";
          setStatus("crashed");
        } else if (subY >= targetY) {
          subY = targetY;
          statusRef.current = "won";
          const time = Math.round(elapsed * 10) / 10;
          const score = computeScore(time);
          setResult({ time, score });
          setStatus("won");
          setBestTime((prev) => {
            const best = prev === null ? time : Math.min(prev, time);
            try {
              window.localStorage.setItem(BEST_KEY, String(best));
            } catch {
              // Storage unavailable.
            }
            return best;
          });
          onFinishRef.current(score, 100);
        }
      } else if (st === "crashed") {
        crashT += dt;
      }

      bubbles.forEach((b) => {
        b.y -= b.v * dt;
        if (b.y < SURFACE_Y + 4) {
          b.y = worldBottom;
          b.x = Math.random() * W;
        }
      });

      const camY = Math.max(0, Math.min(worldBottom - H, subY - H * 0.4));
      draw(camY, elapsed);

      hudTimer += dt;
      if (hudTimer > 0.1) {
        hudTimer = 0;
        setHud({ depth: Math.max(0, (subY - SURFACE_Y) / PPM), time: elapsed });
      }

      if (statusRef.current !== "won") frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [runId, data, target, ui.submarine.goal]);

  const restart = useCallback(() => {
    setResult(null);
    setHud({ depth: 0, time: 0 });
    setStatus("playing");
    setRunId((r) => r + 1);
  }, []);

  const press = (dir: Dir, on: boolean) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (on) e.currentTarget.setPointerCapture(e.pointerId);
    keys.current[dir] = on;
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
      onContextMenu={(e) => e.preventDefault()}
      className={`${btnBase} ${theme.secondaryBtn} h-14 w-14 touch-none select-none p-0 active:scale-95 active:bg-cyan-400 active:text-abyss-950 ${extra}`}
    >
      <Icon className="h-6 w-6" aria-hidden="true" />
    </button>
  );

  if (status === "won" && result) {
    return (
      <ResultScreen
        theme={theme}
        ui={ui}
        score={result.score}
        total={100}
        message={`${ui.submarine.won} ${fmt(ui.submarine.wonText, { depth: target, time: result.time.toFixed(1) })}`}
        onRestart={restart}
        onBack={onBack}
      >
        {bestTime !== null && (
          <p className={`mt-4 text-center text-sm ${theme.muted}`}>
            {ui.submarine.bestTime}: {bestTime.toFixed(1)} s
          </p>
        )}
        <p className={`mt-2 text-center text-xs italic ${theme.muted}`}>{ui.submarine.disclaimer}</p>
      </ResultScreen>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatPill
          theme={theme}
          label={ui.submarine.depth}
          value={
            <span className="inline-flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
              {hud.depth.toFixed(1)} / {target} m
            </span>
          }
        />
        <StatPill
          theme={theme}
          label={ui.submarine.time}
          value={
            <span className="inline-flex items-center gap-1">
              <Timer className="h-3.5 w-3.5" aria-hidden="true" />
              {hud.time.toFixed(1)} s
            </span>
          }
        />
        {bestTime !== null && <StatPill theme={theme} label={ui.submarine.bestTime} value={`${bestTime.toFixed(1)} s`} />}
      </div>
      <ProgressBar value={hud.depth} max={target} theme={theme} label={ui.progress} />

      <div className="mt-4 flex flex-col items-center gap-4 md:flex-row md:items-start md:justify-center md:gap-8">
        <div
          className={`relative overflow-hidden rounded-2xl border-2 border-cyan-400/30 shadow-xl shadow-black/40 ${
            status === "crashed" ? "animate-shake" : ""
          }`}
          style={{ width: "min(100%, 400px, calc(58vh * 0.75))" }}
        >
          <canvas ref={canvasRef} className="block h-auto w-full" style={{ aspectRatio: `${W} / ${H}` }} />
          {status === "crashed" && (
            <div className="absolute inset-0 grid animate-fadeIn place-items-center bg-abyss-950/70 p-6 text-center">
              <div>
                <AlertTriangle className="mx-auto h-10 w-10 text-rose-400" aria-hidden="true" />
                <p className="mt-2 text-xl font-bold text-white">{ui.submarine.crashed}</p>
                <p className="mt-1 text-sm text-cyan-50/80">{ui.submarine.crashedText}</p>
                <button type="button" autoFocus onClick={restart} className={`${btnBase} ${theme.primaryBtn} mt-4`}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  {ui.submarine.restart}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* On-screen controls (touch + mouse). */}
        <div className="grid grid-cols-3 gap-2 md:mt-16">
          <span />
          {controlBtn("up", ui.submarine.up, ArrowUp)}
          <span />
          {controlBtn("left", ui.submarine.left, ArrowLeft)}
          {controlBtn("down", ui.submarine.down, ArrowDown)}
          {controlBtn("right", ui.submarine.right, ArrowRight)}
        </div>
      </div>

      <p className={`mt-4 text-center text-xs italic ${theme.muted}`}>{ui.submarine.disclaimer}</p>
    </div>
  );
}
