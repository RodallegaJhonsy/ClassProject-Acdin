"use client";

import { useEffect, useState } from "react";
import { Crown, Anchor, Ghost } from "lucide-react";
import type { SectionKey } from "@/types/games";

interface Props {
  label: string;
  sections: { key: SectionKey; label: string }[];
}

export default function SectionSelector({ label, sections }: Props) {
  const [current, setCurrent] = useState<SectionKey | null>(null);

  // Highlight the section currently in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setCurrent(entry.target.id as SectionKey);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.key);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  const goTo = (key: SectionKey) => {
    document.getElementById(key)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      aria-label={label}
      className="sticky top-0 z-30 border-b border-royal-900/10 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6">
        <span className="mr-2 hidden text-xs font-medium uppercase tracking-widest text-royal-800/60 sm:inline">
          {label}
        </span>
        {sections.map((s) => {
          const isDiana = s.key === "princessDiana";
          const isHalloween = s.key === "halloween";
          const isActive = current === s.key;
          const Icon = isDiana ? Crown : isHalloween ? Ghost : Anchor;
          const activeCls = isDiana
            ? "bg-royal-900 text-beige-50 border-royal-900"
            : isHalloween
            ? "bg-spooky-950 text-orange-400 border-orange-500 shadow-sm shadow-orange-950/40"
            : "bg-abyss-900 text-cyan-200 border-abyss-900";
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => goTo(s.key)}
              aria-current={isActive ? "true" : undefined}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                isActive ? activeCls : "border-royal-900/15 bg-white text-royal-900 hover:bg-beige-100"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {s.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

