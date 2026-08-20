import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/40 py-6 sm:py-8 bg-background/50 backdrop-blur-sm">
      <div className="container mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div>© {new Date().getFullYear()} AudioHub. All rights reserved.</div>

        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/converter"
            className="hover:text-foreground transition-colors"
          >
            Tools
          </Link>
        </div>
      </div>
    </footer>
  );
}
