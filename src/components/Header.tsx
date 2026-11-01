import { Crown, Waves } from "lucide-react";
import type { SiteData } from "@/types/games";

export default function Header({ site }: { site: SiteData }) {
  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-royal-950 via-royal-900 to-abyss-800 text-beige-50">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-400/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex items-center gap-3 text-gold-300">
          <Crown className="h-5 w-5" aria-hidden="true" />
          <span className="h-px w-10 bg-gold-300/50" aria-hidden="true" />
          <Waves className="h-5 w-5 text-cyan-300" aria-hidden="true" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-beige-200/70">{site.subtitle}</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">{site.title}</h1>
        <p className="mt-5 max-w-2xl text-base text-beige-100/80 sm:text-lg">{site.intro}</p>
      </div>
    </header>
  );
}

