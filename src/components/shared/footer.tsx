import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/50 py-6 text-sm text-muted-foreground">
      <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <p>
          © {new Date().getFullYear()} AudioHub. All audio processed locally in
          your browser.
        </p>
        <div className="flex items-center gap-4 text-xs">
          <Link href="/pitch-shifter" className="hover:underline">
            Pitch Shifter
          </Link>
          <Link href="/silence-remover" className="hover:underline">
            Silence Remover
          </Link>
          <Link href="/waveform-generator" className="hover:underline">
            Waveform Generator
          </Link>
        </div>
      </div>
    </footer>
  );
}
