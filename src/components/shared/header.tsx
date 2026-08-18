"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Music2,
  Sliders,
  VolumeX,
  Activity,
  ArrowRightLeft,
  Volume2,
  Gauge,
  Compass,
  Maximize2,
  Sparkles,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Converter", href: "/converter", icon: ArrowRightLeft },
  { label: "Pitch & Speed", href: "/pitch-shifter", icon: Sliders },
  { label: "Silence Remover", href: "/silence-remover", icon: VolumeX },
  { label: "Waveform", href: "/waveform-generator", icon: Activity },
  { label: "Normalizer", href: "/normalizer", icon: Volume2 },
  { label: "BPM & Key", href: "/bpm-key-detector", icon: Gauge },
  { label: "8D Spatial", href: "/spatial-8d", icon: Compass },
  { label: "Stereo Widener", href: "/stereo-widener", icon: Maximize2 },
  { label: "Pricing", href: "/pricing", icon: Sparkles },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Music2 className="h-4 w-4" />
          </div>
          <span className="text-base font-extrabold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            AudioHub
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Status Badge */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">100% Client-Side</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
