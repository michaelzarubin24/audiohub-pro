import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BPM & Musical Key Detector (Camelot Harmonic Mixing)",
  description:
    "Instant tempo detection in BPM and root musical key analysis with Camelot wheel notation for DJs and music producers.",
  keywords: [
    "bpm detector",
    "find song key",
    "camelot wheel finder",
    "tap tempo online",
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
