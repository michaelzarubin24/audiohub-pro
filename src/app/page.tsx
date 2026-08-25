import Link from "next/link";
import {
  ArrowRightLeft,
  Sliders,
  VolumeX,
  Activity,
  Volume2,
  Gauge,
  Compass,
  Maximize2,
  Download,
  Zap,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TOOLS = [
  {
    title: "Audio Converter",
    description:
      "Convert audio files between WAV, MP3, FLAC, AAC or rip studio-quality sound from YouTube.",
    href: "/converter",
    icon: ArrowRightLeft,
    badge: "Popular",
    color: "from-blue-500/20 to-indigo-500/20 text-blue-400",
  },
  {
    title: "Pitch & Speed Shifter",
    description:
      "Change playback speed and transpose musical keys independently without quality distortion.",
    href: "/pitch-shifter",
    icon: Sliders,
    badge: "DSP",
    color: "from-amber-500/20 to-orange-500/20 text-amber-400",
  },
  {
    title: "Silence Remover",
    description:
      "Detect and auto-trim dead air, pauses, and low-volume gaps in podcasts and speech tracks.",
    href: "/silence-remover",
    icon: VolumeX,
    badge: null,
    color: "from-rose-500/20 to-red-500/20 text-rose-400",
  },
  {
    title: "Waveform Visualizer",
    description:
      "Generate beat-reactive waveforms, circular spectrum rings, and export HD video animations.",
    href: "/waveform-generator",
    icon: Activity,
    badge: "Video Export",
    color: "from-cyan-500/20 to-teal-500/20 text-cyan-400",
  },
  {
    title: "Loudness Normalizer",
    description:
      "Normalize track loudness to broadcast standards (EBU R128, -14 LUFS Spotify) with True Peak limiter.",
    href: "/normalizer",
    icon: Volume2,
    badge: "Mastering",
    color: "from-emerald-500/20 to-green-500/20 text-emerald-400",
  },
  {
    title: "BPM & Key Detector",
    description:
      "Detect tempo in BPM, root musical key, and Camelot wheel harmonic mixing tags instantly.",
    href: "/bpm-key-detector",
    icon: Gauge,
    badge: "DJ Tool",
    color: "from-violet-500/20 to-purple-500/20 text-violet-400",
  },
  {
    title: "8D Spatial Audio",
    description:
      "Transform flat stereo into a 360-degree rotating binaural sound experience with spatial reverb.",
    href: "/spatial-8d",
    icon: Compass,
    badge: null,
    color: "from-sky-500/20 to-blue-500/20 text-sky-400",
  },
  {
    title: "Stereo Widener",
    description:
      "Expand soundstage width with Mid/Side matrix processing and verify mono compatibility.",
    href: "/stereo-widener",
    icon: Maximize2,
    badge: "Studio",
    color: "from-fuchsia-500/20 to-pink-500/20 text-fuchsia-400",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      <main className="container mx-auto max-w-7xl px-4 py-10 sm:py-16 space-y-12 flex-1">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
            Next-Gen Audio Toolkit for Creators & Musicians
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Fast, client-side sound processing suite. Zero server queues, studio
            lossless export, and 100% privacy.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>Instant In-Browser Processing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>100% Private (No Cloud Storage)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Download className="h-4 w-4 text-primary" />
              <span>Studio Lossless Export (WAV / 320k MP3)</span>
            </div>
          </div>
        </div>

        {/* Сетка инструментов: 4 колонки x 2 ряда */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;

            return (
              <Link key={tool.href} href={tool.href} className="group block">
                <Card className="h-full border-border/60 bg-card/50 backdrop-blur-sm transition-all duration-200 group-hover:border-primary/40 group-hover:shadow-md group-hover:-translate-y-1">
                  <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.color} border border-border/40 flex items-center justify-center transition-transform group-hover:scale-105`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        {tool.badge && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-semibold px-2 py-0.5"
                          >
                            {tool.badge}
                          </Badge>
                        )}
                      </div>

                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                          <span>{tool.title}</span>
                        </h2>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                          {tool.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center text-xs font-semibold text-primary pt-1 opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                      <span>Open tool</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
