import Link from "next/link";
import { Check, Sparkles, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PricingPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:py-20 space-y-10">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <Badge
          variant="secondary"
          className="px-3 py-1 text-xs font-semibold text-primary"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          Public Beta Launch
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Simple, Transparent Plans
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          AudioHub is currently{" "}
          <strong className="text-foreground">100% Free</strong> with full
          access to all client-side audio DSP tools.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Текущий бесплатный тариф */}
        <Card className="border-primary/50 bg-card/60 backdrop-blur-xl relative shadow-md">
          <div className="absolute -top-3 right-4">
            <Badge className="bg-primary text-primary-foreground text-[10px] font-bold uppercase">
              Current Plan
            </Badge>
          </div>
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Free Community
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Unlimited in-browser audio processing for everyone.
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">
                  $0
                </span>
                <span className="text-xs text-muted-foreground">/ forever</span>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-muted-foreground border-t border-border/40 pt-4">
              <li className="flex items-center gap-2 text-foreground">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>All 8 audio DSP tools unlocked</span>
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Studio Lossless Export (WAV / MP3)</span>
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>100% Client-Side Privacy (Zero uploads)</span>
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>HD Video Waveform Generation</span>
              </li>
            </ul>

            <Link href="/converter" className="block pt-2">
              <Button className="w-full h-10 rounded-xl text-xs font-semibold">
                <span>Start Using Tools</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Будущий Pro тариф */}
        <Card className="border-border/60 bg-secondary/20 backdrop-blur-xl opacity-90">
          <CardContent className="p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">
                  AudioHub Pro
                </h3>
                <Badge variant="outline" className="text-[10px]">
                  Coming Soon
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Advanced batch tools for sound engineers & studios.
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">
                  $4.99
                </span>
                <span className="text-xs text-muted-foreground">/ month</span>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-muted-foreground border-t border-border/40 pt-4">
              <li className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                <span>100% Ad-Free Experience</span>
              </li>
              <li className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Bulk / Batch Processing (up to 50 files)</span>
              </li>
              <li className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                <span>AI Vocal Remover (Demucs v4 Stems)</span>
              </li>
              <li className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                <span>4K 60FPS Video Visualizer Export</span>
              </li>
            </ul>

            <div className="pt-2">
              <Button
                disabled
                variant="outline"
                className="w-full h-10 rounded-xl text-xs font-semibold opacity-70"
              >
                <span>Available Soon</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
