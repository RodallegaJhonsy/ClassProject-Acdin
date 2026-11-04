import type { SectionKey } from "@/types/games";

/** Tailwind class bundles for each section's visual identity. */
export interface Theme {
  key: SectionKey;
  modalBg: string;
  text: string;
  muted: string;
  card: string;
  cardHover: string;
  border: string;
  primaryBtn: string;
  secondaryBtn: string;
  accentText: string;
  progressTrack: string;
  progressFill: string;
  success: string;
  error: string;
  heading: string;
}

export const themes: Record<SectionKey, Theme> = {
  princessDiana: {
    key: "princessDiana",
    modalBg: "bg-beige-50",
    text: "text-royal-950",
    muted: "text-royal-800/70",
    card: "bg-white",
    cardHover: "hover:bg-beige-100",
    border: "border-beige-200",
    primaryBtn:
      "bg-royal-900 text-beige-50 hover:bg-royal-800 focus-visible:ring-gold-400 disabled:bg-royal-900/40",
    secondaryBtn:
      "border border-royal-900/20 text-royal-900 bg-white hover:bg-beige-100 focus-visible:ring-gold-400",
    accentText: "text-gold-500",
    progressTrack: "bg-beige-200",
    progressFill: "bg-gold-400",
    success: "border-emerald-500 bg-emerald-50 text-emerald-900",
    error: "border-rose-400 bg-rose-50 text-rose-900",
    heading: "font-serif",
  },
  oceanGate: {
    key: "oceanGate",
    modalBg: "bg-abyss-900",
    text: "text-slate-100",
    muted: "text-cyan-100/70",
    card: "bg-abyss-800",
    cardHover: "hover:bg-abyss-700",
    border: "border-cyan-400/20",
    primaryBtn:
      "bg-cyan-400 text-abyss-950 hover:bg-cyan-300 focus-visible:ring-cyan-200 disabled:bg-cyan-400/40",
    secondaryBtn:
      "border border-cyan-400/40 text-cyan-100 bg-abyss-800 hover:bg-abyss-700 focus-visible:ring-cyan-200",
    accentText: "text-cyan-300",
    progressTrack: "bg-abyss-700",
    progressFill: "bg-cyan-400",
    success: "border-emerald-400 bg-emerald-950/60 text-emerald-100",
    error: "border-rose-400 bg-rose-950/60 text-rose-100",
    heading: "font-sans tracking-tight",
  },
  halloween: {
    key: "halloween",
    modalBg: "bg-spooky-950",
    text: "text-orange-50",
    muted: "text-purple-200/70",
    card: "bg-spooky-800",
    cardHover: "hover:bg-spooky-700",
    border: "border-orange-500/25",
    primaryBtn:
      "bg-orange-500 text-stone-950 font-bold hover:bg-orange-400 focus-visible:ring-orange-300 disabled:bg-orange-500/40",
    secondaryBtn:
      "border border-orange-500/30 text-orange-200 bg-spooky-800 hover:bg-spooky-700 focus-visible:ring-orange-300",
    accentText: "text-orange-400",
    progressTrack: "bg-spooky-800",
    progressFill: "bg-orange-500",
    success: "border-lime-400 bg-lime-950/60 text-lime-100",
    error: "border-rose-400 bg-rose-950/60 text-rose-100",
    heading: "font-sans font-bold tracking-tight",
  },
};

export const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed";

