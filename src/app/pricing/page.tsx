"use client";

import React, { useState } from "react";
import Script from "next/script";
import {
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
  Infinity as InfinityIcon,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TIERS = [
  {
    name: "Free Creator",
    price: "$0",
    period: "forever",
    description:
      "Full in-browser studio tools for quick edits and single tracks.",
    features: [
      "Access to all 8 audio processing tools",
      "Up to 15-minute file duration",
      "Standard MP3 (up to 320 kbps) & 16-bit WAV",
      "100% private in-browser DSP",
    ],
    buttonText: "Current Plan",
    disabled: true,
    isPopular: false,
  },
  {
    name: "Pro Monthly",
    price: "$7",
    period: "per month",
    variantId:
      process.env.NEXT_PUBLIC_LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID || "12345",
    description: "For producers, sound designers, and content creators.",
    features: [
      "Everything in Free Creator",
      "Lossless 24-bit / 96 kHz Studio WAV Export",
      "Unlimited file duration (up to 120+ mins)",
      "Batch Processing (convert multiple files at once)",
      "Zero Ads & Priority YouTube Audio Extraction",
      "Cancel subscription anytime",
    ],
    buttonText: "Upgrade to Pro",
    disabled: false,
    isPopular: true,
  },
  {
    name: "Lifetime Studio Pass",
    price: "$39",
    period: "one-time payment",
    variantId:
      process.env.NEXT_PUBLIC_LEMONSQUEEZY_PRO_LIFETIME_VARIANT_ID || "67890",
    description: "Pay once, own all current and upcoming tools forever.",
    features: [
      "All Pro Monthly features forever",
      "Lifetime updates and newly added tools",
      "VIP Fast-Track Feature Requests",
      "Commercial license for monetized YouTube & streaming",
    ],
    buttonText: "Get Lifetime Access",
    disabled: false,
    isPopular: false,
  },
];

export default function PricingPage() {
  const [loadingVariant, setLoadingVariant] = useState<string | null>(null);

  const handleCheckout = async (variantId?: string) => {
    if (!variantId) return;

    try {
      setLoadingVariant(variantId);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId }),
      });

      const data = await res.json();
      if (data.url) {
        // Открытие оверлея Lemon.js или переход по прямой ссылке
        if ((window as any).LemonSqueezy) {
          (window as any).LemonSqueezy.Url.Open(data.url);
        } else {
          window.location.href = data.url;
        }
      } else {
        alert("Failed to initiate checkout. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Checkout error.");
    } finally {
      setLoadingVariant(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-16 px-4 sm:px-6">
      {/* Скрипт всплывающего окна Lemon.js */}
      <Script
        src="https://assets.lemonsqueezy.com/lemon.js"
        strategy="lazyOnload"
      />

      <div className="max-w-6xl mx-auto space-y-12">
        {/* Заголовок */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transparent & Simple Pricing</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Unlock Full Studio Master Power
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Export uncompressed 24-bit audio, batch process your entire library,
            and remove all file limits.
          </p>
        </div>

        {/* Сетка тарифов */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-7 flex flex-col justify-between transition-all duration-300 ${
                tier.isPopular
                  ? "bg-zinc-900/90 border-2 border-primary shadow-2xl shadow-primary/10 ring-1 ring-primary/40 md:-translate-y-2"
                  : "bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700"
              }`}
            >
              {tier.isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground font-bold text-xs uppercase px-3 py-1 flex items-center gap-1 shadow-lg">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Most Popular</span>
                  </Badge>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                    {tier.description}
                  </p>
                </div>

                <div className="flex items-baseline gap-1.5 border-b border-zinc-800 pb-5">
                  <span className="text-4xl sm:text-5xl font-black text-white font-mono">
                    {tier.price}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">
                    / {tier.period}
                  </span>
                </div>

                <ul className="space-y-3 text-xs text-zinc-300">
                  {tier.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <div className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="leading-tight">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <Button
                  disabled={tier.disabled || loadingVariant === tier.variantId}
                  onClick={() => handleCheckout(tier.variantId)}
                  className={`w-full py-5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    tier.isPopular
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                  }`}
                >
                  {loadingVariant === tier.variantId ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>{tier.buttonText}</span>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Доверительные плашки */}
        <div className="flex flex-wrap items-center justify-center gap-8 pt-4 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Secure 256-bit SSL Checkout</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Instant Pro Activation</span>
          </div>
          <div className="flex items-center gap-2">
            <InfinityIcon className="w-4 h-4 text-primary" />
            <span>Apple Pay & Google Pay Supported</span>
          </div>
        </div>
      </div>
    </div>
  );
}
