"use client";

import React, { useState, useRef, useEffect } from "react";
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
  ChevronDown,
  Sparkles,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";

const TOOLS = [
  {
    label: "Audio Converter",
    desc: "Format conversion & YouTube rip",
    href: "/converter",
    icon: ArrowRightLeft,
  },
  {
    label: "Pitch & Speed",
    desc: "WSOLA tempo & key transpose",
    href: "/pitch-shifter",
    icon: Sliders,
  },
  {
    label: "Silence Remover",
    desc: "Auto-trim gaps & dead air",
    href: "/silence-remover",
    icon: VolumeX,
  },
  {
    label: "Waveform Visualizer",
    desc: "Beat-reactive video & vectors",
    href: "/waveform-generator",
    icon: Activity,
  },
  {
    label: "Loudness Normalizer",
    desc: "EBU R128 & True Peak limiter",
    href: "/normalizer",
    icon: Volume2,
  },
  {
    label: "BPM & Key Detector",
    desc: "Harmonic Camelot wheel & tempo",
    href: "/bpm-key-detector",
    icon: Gauge,
  },
  {
    label: "8D Spatial Audio",
    desc: "360° binaural rotation",
    href: "/spatial-8d",
    icon: Compass,
  },
  {
    label: "Stereo Widener",
    desc: "Mid/Side width & phase scope",
    href: "/stereo-widener",
    icon: Maximize2,
  },
];

export function Header() {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Закрытие дропдауна при клике вне его области
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setToolsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Закрытие меню при смене страницы
  useEffect(() => {
    setToolsOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  const isToolActive = TOOLS.some((t) => t.href === pathname);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl transition-colors">
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Логотип */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 transition-transform group-hover:scale-105">
            <Music2 className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">
            AudioHub
          </span>
        </Link>

        {/* Десктопная навигация */}
        <nav className="hidden md:flex items-center gap-1">
          {/* Tools Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setToolsOpen(!toolsOpen)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isToolActive || toolsOpen
                  ? "text-foreground bg-secondary/80 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <span>Tools</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  toolsOpen
                    ? "rotate-180 text-foreground"
                    : "text-muted-foreground"
                }`}
              />
            </button>

            {/* Выпадающая панель инструментов (2 колонки) */}
            {toolsOpen && (
              <div className="absolute top-full left-0 mt-2 w-[480px] rounded-2xl bg-popover/95 p-3 shadow-2xl border border-border/60 backdrop-blur-2xl grid grid-cols-2 gap-1.5 animate-in fade-in-0 zoom-in-95 duration-150">
                {TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  const active = pathname === tool.href;

                  return (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                        active
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-background border border-border/50 text-foreground shrink-0 mt-0.5">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-foreground truncate">
                          {tool.label}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                          {tool.desc}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ссылка на Pricing */}
          <Link
            href="/pricing"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              pathname === "/pricing"
                ? "text-foreground bg-secondary font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            Pricing
          </Link>
        </nav>

        {/* Правый блок: Переключатель темы + Кнопка Pro */}
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />

          <Link href="/pricing">
            <Button
              size="sm"
              className="h-8 px-3 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Get Pro</span>
            </Button>
          </Link>
        </div>

        {/* Мобильная кнопка меню */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Мобильное выдвижное меню */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border/50 bg-background/95 backdrop-blur-xl px-4 py-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2">
            Audio Tools
          </div>
          <div className="grid grid-cols-1 gap-1">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              const active = pathname === tool.href;

              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-colors ${
                    active
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{tool.label}</span>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-40" />
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-border/40 flex flex-col gap-2">
            <Link
              href="/pricing"
              className="flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-foreground hover:bg-secondary/50"
            >
              <span>Pricing & Plans</span>
              <Sparkles className="h-4 w-4 text-primary" />
            </Link>

            <Link href="/pricing" className="w-full">
              <Button className="w-full rounded-xl text-xs font-bold bg-primary text-primary-foreground py-2.5">
                Upgrade to Pro
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
