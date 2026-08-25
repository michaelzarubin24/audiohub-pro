import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Silence Remover for Podcasts & Speech",
  description:
    "Automatically detect and trim dead air, pauses, and silent gaps from voice recordings, podcast stems, and audio tracks.",
  keywords: [
    "remove silence from audio",
    "trim pauses podcast",
    "silence trimmer online",
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
