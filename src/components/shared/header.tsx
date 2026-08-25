"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRightLeft,
  Sliders,
  Activity,
  Gauge,
  VolumeX,
  Volume2,
  Compass,
  Maximize2,
  ChevronDown,
  Music,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const FEATURED_TOOLS = [
  { label: "Converter", href: "/converter", icon: ArrowRightLeft },
  { label: "Pitch & Speed", href: "/pitch-shifter", icon: Sliders },
  { label: "Visualizer", href: "/waveform-generator", icon: Activity },
  { label: "BPM & Key", href: "/bpm-key-detector", icon: Gauge },
];

const ALL_TOOLS = [
  {
    title: "Audio Converter",
    desc: "Convert WAV, MP3, FLAC or rip YouTube audio",
    href: "/converter",
    icon: ArrowRightLeft,
  },
  {
    title: "Pitch & Speed Shifter",
    desc: "Change tempo & transpose key in real time",
    href: "/pitch-shifter",
    icon: Sliders,
  },
  {
    title: "Waveform Visualizer",
    desc: "Generate HD beat-reactive videos for social media",
    href: "/waveform-generator",
    icon: Activity,
  },
  {
    title: "BPM & Key Detector",
    desc: "Instant tempo detection & Camelot wheel harmonic keys",
    href: "/bpm-key-detector",
    icon: Gauge,
  },
  {
    title: "Silence Remover",
    desc: "Auto-trim pauses and low-volume gaps in speech",
    href: "/silence-remover",
    icon: VolumeX,
  },
  {
    title: "Loudness Normalizer",
    desc: "EBU R128 & Spotify mastering loudness standards",
    href: "/normalizer",
    icon: Volume2,
  },
  {
    title: "8D Spatial Audio",
    desc: "360° binaural surround sound simulation",
    href: "/spatial-8d",
    icon: Compass,
  },
  {
    title: "Stereo Widener",
    desc: "Mid/Side soundstage expander with goniometer",
    href: "/stereo-widener",
    icon: Maximize2,
  },
];

const PAYPAL_DONATE_URL =
  "https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=zarubinmihail99@gmail.com&currency_code=USD&item_name=AudioHub+Support";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Закрытие дропдауна при клике вне меню
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Логотип */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary border border-border/60 text-foreground group-hover:scale-105 group-hover:border-primary/50 transition-all shadow-xs">
              <Music className="h-4 w-4 text-primary" />
            </div>
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-foreground">
              AudioHub
            </span>
          </Link>

          {/* Быстрые ссылки (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1">
            {FEATURED_TOOLS.map((tool) => {
              const isActive = pathname === tool.href;
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tool.label}</span>
                </Link>
              );
            })}

            {/* Выпадающий список всех инструментов */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <span>All Tools</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-80 p-2 rounded-2xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-xl grid grid-cols-1 gap-1 z-50 animate-in fade-in-50 zoom-in-95">
                  {ALL_TOOLS.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = pathname === tool.href;
                    return (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        onClick={() => setDropdownOpen(false)}
                        className={`flex items-start gap-3 p-2 rounded-xl transition-colors ${
                          isActive
                            ? "bg-secondary text-foreground"
                            : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-secondary/80 text-primary border border-border/40 shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-foreground">
                            {tool.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {tool.desc}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Правая секция */}
        <div className="flex items-center gap-2.5">
          {/* Бейдж бесплатности */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>100% Free & Private</span>
          </div>

          {/* Кнопка доната PayPal */}
          <a
            href={PAYPAL_DONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-3 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors hidden sm:flex items-center gap-1.5 border border-transparent hover:border-border/40"
            title="Support AudioHub via PayPal"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-3.5 w-3.5 text-[#0079C1]"
              aria-hidden="true"
            >
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.004.408 5.43 0 5.926 0h7.324c3.61 0 6.09 1.63 5.56 5.378-.45 3.197-2.484 4.88-5.32 4.88h-2.31l-1.07 6.772-.034.22-.001.006a.715.715 0 0 1-.71.603H7.076z" />
            </svg>
            <span>Donate</span>
          </a>

          {/* Переключатель темы */}
          <ThemeToggle />

          {/* Мобильная кнопка меню */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-8 w-8 rounded-xl lg:hidden text-muted-foreground"
          >
            {mobileMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Мобильное меню */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl p-4 space-y-3 animate-in slide-in-from-top-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2">
            Audio Tools
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {ALL_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isActive = pathname === tool.href;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <span>{tool.title}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-border/40">
            <a
              href={PAYPAL_DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-secondary/80 text-xs font-semibold text-foreground border border-border/40"
            >
              <span>Support via PayPal</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
