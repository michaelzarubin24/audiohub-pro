import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin", "cyrillic-ext"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://audiohub.tools",
  ),
  title: {
    default: "AudioHub — Next-Gen Audio Toolkit for Creators",
    template: "%s | AudioHub",
  },
  description:
    "Free, instant in-browser audio processing toolkit. Pitch shifter, silence remover, waveform video visualizer, studio loudness normalizer, BPM detector & lossless converter.",
  keywords: [
    "audio converter",
    "online pitch shifter",
    "bpm detector online",
    "waveform video generator",
    "remove silence from audio",
    "lufs normalizer",
    "8d audio generator",
    "stereo widener",
    "web audio tools",
  ],
  authors: [{ name: "AudioHub Team" }],
  creator: "AudioHub",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "AudioHub",
    title: "AudioHub — In-Browser Audio DSP Suite",
    description:
      "Fast, zero-upload studio sound tools with lossless WAV/MP3 export.",
    images: [
      {
        url: "/og-image.png", // изображение 1200x630px в папке public/
        width: 1200,
        height: 630,
        alt: "AudioHub Audio Toolkit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AudioHub — Next-Gen Audio Toolkit",
    description: "Fast, 100% private in-browser sound processing suite.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased min-h-screen bg-background text-foreground selection:bg-primary/15 selection:text-primary`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>

          {/* Метрики Vercel (не влияют на скорость рендеринга) */}
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
