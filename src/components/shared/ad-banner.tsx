"use client";

import React, { useEffect, useRef } from "react";

interface AdBannerProps {
  slotId?: string;
  format?: "auto" | "horizontal" | "rectangle";
  className?: string;
  isPro?: boolean;
}

export function AdBanner({
  slotId = "1234567890",
  format = "auto",
  className = "",
  isPro = false,
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement | null>(null);

  // Если у пользователя активна Pro-подписка — реклама не рендерится вовсе
  if (isPro) return null;

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  useEffect(() => {
    // Вызываем adsbygoogle только в браузере при наличии реального Client ID
    if (typeof window !== "undefined" && clientId) {
      try {
        const adsbygoogle =
          (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle || [];
        adsbygoogle.push({});
      } catch (err) {
        console.warn("AdSense push error:", err);
      }
    }
  }, [clientId]);

  return (
    <div
      className={`w-full my-8 flex flex-col items-center justify-center rounded-2xl border border-border/40 bg-secondary/15 p-4 text-center transition-all ${className}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/70">
          Advertisement
        </span>
      </div>

      {clientId ? (
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: "block", minHeight: "90px", width: "100%" }}
          data-ad-client={clientId}
          data-ad-slot={slotId}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      ) : (
        /* Аккуратная заглушка до подключения и одобрения реального AdSense */
        <div className="w-full h-20 sm:h-24 rounded-xl border border-dashed border-border/50 flex flex-col items-center justify-center text-xs text-muted-foreground/60 select-none bg-background/30">
          <span>Google AdSense Slot ({format})</span>
          <span className="text-[10px] text-muted-foreground/40 mt-0.5">
            Will activate once custom domain & publisher ID are configured
          </span>
        </div>
      )}
    </div>
  );
}
