import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 space-y-6 text-sm text-muted-foreground leading-relaxed">
      <Link href="/">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-xs">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Tools
        </Button>
      </Link>

      <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
        Terms of Service
      </h1>
      <p className="text-xs">Last updated: August 2026</p>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-foreground">
          1. Acceptance of Terms
        </h2>
        <p>
          By accessing and using AudioHub, you accept and agree to be bound by
          these terms. If you disagree with any part, you may not use the
          services.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-foreground">
          2. Audio Processing & Copyright
        </h2>
        <p>
          AudioHub provides in-browser audio processing tools. You retain all
          rights to your audio content. You agree not to process copyrighted
          material unless you own the rights or have express permission from the
          copyright holder.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-foreground">
          3. Disclaimer of Warranties
        </h2>
        <p>
          The service is provided on an "as is" and "as available" basis without
          warranties of any kind. AudioHub is not responsible for any data loss
          resulting from browser memory limits or local file corruption.
        </p>
      </section>
    </div>
  );
}
