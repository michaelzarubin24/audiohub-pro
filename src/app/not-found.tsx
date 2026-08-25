import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground border border-border/60">
        <FileQuestion className="h-6 w-6 text-primary" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
        404 - Page Not Found
      </h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        The tool or page you are looking for doesn&apos;t exist or has been
        moved.
      </p>
      <Link href="/">
        <Button className="rounded-xl text-xs font-semibold">
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          <span>Back to AudioHub</span>
        </Button>
      </Link>
    </div>
  );
}
