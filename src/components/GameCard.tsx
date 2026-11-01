import {
  Anchor,
  Clock,
  Gamepad2,
  HelpCircle,
  History,
  Play,
  Search,
  ShieldAlert,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { GameMeta, SectionKey, UiStrings } from "@/types/games";

const icons: Record<string, LucideIcon> = {
  anchor: Anchor,
  clock: Clock,
  help: HelpCircle,
  history: History,
  search: Search,
  shield: ShieldAlert,
};

interface Props {
  index: number;
  meta: GameMeta;
  section: SectionKey;
  progress?: { best: number; total: number };
  ui: UiStrings;
  onPlay: () => void;
}

export default function GameCard({ index, meta, section, progress, ui, onPlay }: Props) {
  const Icon = icons[meta.icon] ?? Gamepad2;
  const isDiana = section === "princessDiana";

  return (
    <button
      type="button"
      onClick={onPlay}
      className={`group flex h-full flex-col rounded-2xl border p-6 text-left transition duration-200 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 ${
        isDiana
          ? "border-beige-200 bg-white shadow-sm hover:border-gold-300 hover:shadow-lg focus-visible:ring-gold-400"
          : "border-cyan-400/20 bg-abyss-800/80 shadow-lg shadow-black/30 hover:border-cyan-300/60 hover:shadow-cyan-900/40 focus-visible:ring-cyan-300"
      }`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`grid h-12 w-12 place-items-center rounded-xl ${
            isDiana ? "bg-royal-900 text-gold-300" : "bg-cyan-400/15 text-cyan-300"
          }`}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <span className={`font-mono text-sm ${isDiana ? "text-gold-500" : "text-cyan-300/70"}`}>
          {String(index).padStart(2, "0")}
        </span>
      </div>
      <h3
        className={`mt-5 text-xl ${isDiana ? "font-serif text-royal-950" : "font-bold tracking-tight text-white"}`}
      >
        {meta.title}
      </h3>
      <p className={`mt-2 flex-1 text-sm ${isDiana ? "text-royal-800/75" : "text-cyan-50/70"}`}>{meta.description}</p>
      <div className="mt-6 flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
            isDiana ? "text-royal-800/70" : "text-cyan-100/70"
          }`}
        >
          {progress ? (
            <>
              <Trophy className={`h-4 w-4 ${isDiana ? "text-gold-500" : "text-cyan-300"}`} aria-hidden="true" />
              {ui.best}: {progress.best}/{progress.total}
            </>
          ) : (
            ui.notPlayed
          )}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            isDiana
              ? "bg-royal-900 text-beige-50 group-hover:bg-royal-800"
              : "bg-cyan-400 text-abyss-950 group-hover:bg-cyan-300"
          }`}
        >
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          {ui.play}
        </span>
      </div>
    </button>
  );
}

