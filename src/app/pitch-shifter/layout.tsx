import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pitch & Speed Shifter (DSP Key Transposer)",
  description:
    "Transpose musical keys by semitones and adjust playback speed independently without audio distortion or artifacts.",
  keywords: [
    "pitch shifter online",
    "change song tempo",
    "transpose music",
    "speed up audio",
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
