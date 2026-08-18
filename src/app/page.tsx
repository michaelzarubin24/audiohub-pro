import Link from "next/link";
import {
  Sliders,
  VolumeX,
  Activity,
  ArrowRightLeft,
  Gauge,
  Volume2,
  Compass,
  Maximize2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TOOLS = [
  {
    title: "Universal Audio Converter",
    description:
      "Convert local audio formats or rip high-quality audio from YouTube directly to MP3 or WAV.",
    href: "/converter",
    icon: ArrowRightLeft,
    badge: "Popular / Lossless",
    color: "from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30",
    ready: true,
  },
  {
    title: "Pitch & Speed Shifter",
    description:
      "Transpose musical keys by semitones and stretch tempo independently using studio WSOLA algorithm.",
    href: "/pitch-shifter",
    icon: Sliders,
    badge: "Studio WSOLA",
    color:
      "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30",
    ready: true,
  },
  {
    title: "Silence Remover",
    description:
      "Automatically detect and cut out dead air, long pauses, and breaths with anti-click crossfades.",
    href: "/silence-remover",
    icon: VolumeX,
    badge: "Smart Trim",
    color:
      "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    ready: true,
  },
  {
    title: "Waveform Visualizer",
    description:
      "Create beat-reactive animated video visualizers for Reels & Shorts or export clean PNG/SVG vectors.",
    href: "/waveform-generator",
    icon: Activity,
    badge: "Beat-Reactive Video",
    color:
      "from-amber-500/20 to-rose-500/20 text-amber-400 border-amber-500/30",
    ready: true,
  },
  {
    title: "Loudness Normalizer & Maximizer",
    description:
      "Target EBU R128 (-14 LUFS Spotify/YouTube, -16 LUFS Apple) with True Peak brickwall limiting.",
    href: "/normalizer",
    icon: Volume2,
    badge: "EBU R128 / True Peak",
    color:
      "from-indigo-500/20 to-blue-500/20 text-indigo-400 border-indigo-500/30",
    ready: true,
  },
  {
    title: "BPM & Musical Key Detector",
    description:
      "Detect track tempo, root key, scale, and Camelot wheel code for DJ harmonic mixing.",
    href: "/bpm-key-detector",
    icon: Gauge,
    badge: "Camelot & Chroma",
    color:
      "from-orange-500/20 to-amber-500/20 text-orange-400 border-orange-500/30",
    ready: true,
  },
  {
    title: "8D Audio Spatializer",
    description:
      "Binaural 360° spatial rotation with customizable LFO speed and distance acoustics.",
    href: "/spatial-8d",
    icon: Compass,
    badge: "360° HRTF / Ambience",
    color:
      "from-fuchsia-500/20 to-purple-500/20 text-fuchsia-400 border-fuchsia-500/30",
    ready: true,
  },
  {
    title: "Stereo Widener & Phase Checker",
    description:
      "Expand soundstage width, mono-filter low bass, and inspect phase cancellation on a Lissajous scope.",
    href: "/stereo-widener",
    icon: Maximize2,
    badge: "Mid/Side & Phase Scope",
    color: "from-sky-500/20 to-teal-500/20 text-sky-400 border-sky-500/30",
    ready: true,
  },
];

export default function HomePage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-16 space-y-16">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Professional Web Audio Processing Suite</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
          Next-Gen Audio Toolkit for Creators & Musicians
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
          Fast, client-side sound processing tools. Zero server uploads, zero
          audio compression loss, and 100% privacy.
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>Instant In-Browser Processing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>100% Private (No File Uploads)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Studio Lossless Export (WAV / 320k MP3)</span>
          </div>
        </div>
      </div>

      {/* Tools Grid (8 Cards: 4x2 on large screens) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;

          return (
            <Link key={tool.title} href={tool.href} className="group block">
              <Card className="h-full border-border/60 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 bg-card/60 backdrop-blur flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`rounded-xl border p-3 bg-gradient-to-br transition-all duration-300 group-hover:scale-110 ${tool.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge
                      variant="secondary"
                      className="font-mono text-[10px]"
                    >
                      {tool.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {tool.title}
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed line-clamp-3">
                    {tool.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                  >
                    <span>Launch Tool</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
