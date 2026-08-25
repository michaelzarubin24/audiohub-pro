import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audio Waveform Visualizer (Video & Vector Export)",
  description:
    "Generate beat-reactive animated video visualizers for Reels, TikTok, and YouTube Shorts or export clean SVG/PNG waveform graphics.",
  keywords: [
    "waveform generator",
    "audio visualizer for youtube",
    "beat reactive visualizer",
    "sound wave generator",
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
