import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stereo Widener & Mid/Side Soundstage Expander",
  description:
    "Expand stereo field width and enhance spatial perception using Mid/Side matrix processing with mono compatibility checking.",
  keywords: [
    "stereo widener online",
    "mid side processor",
    "expand stereo width",
    "stereo imager online",
    "audio soundstage expander",
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
