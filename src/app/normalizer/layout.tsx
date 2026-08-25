import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audio Loudness Normalizer (LUFS & EBU R128 Mastering)",
  description:
    "Normalize track loudness to broadcast and streaming standards (Spotify -14 LUFS, YouTube, Apple Music) with True Peak limiting.",
  keywords: [
    "audio normalizer",
    "lufs normalizer online",
    "ebu r128 standard",
    "spotify loudness normalizer",
    "mastering limiter online",
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
