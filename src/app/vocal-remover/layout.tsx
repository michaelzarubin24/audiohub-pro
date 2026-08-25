import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Vocal Remover & Stem Splitter (Acapella & Instrumental)",
  description:
    "Extract clean vocals, remove singing for karaoke, and split music tracks into isolated instrumental and acapella stems.",
  keywords: [
    "vocal remover online",
    "isolate vocals",
    "extract acapella",
    "karaoke generator",
    "ai stem splitter",
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
