import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "8D Audio Converter (360° Binaural Spatial Sound)",
  description:
    "Convert standard stereo music into an immersive 360-degree rotating 8D spatial audio experience with binaural panning and spatial reverb.",
  keywords: [
    "8d audio converter",
    "make 8d music online",
    "360 spatial audio generator",
    "binaural panner online",
    "8d sound creator",
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
