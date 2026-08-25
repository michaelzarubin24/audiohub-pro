import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audio Converter & YouTube Audio Extractor",
  description:
    "Convert audio files between WAV, MP3, FLAC, AAC, OGG in studio quality or extract sound streams directly in your browser.",
  keywords: [
    "audio converter",
    "wav to mp3",
    "youtube audio extractor",
    "flac converter",
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
