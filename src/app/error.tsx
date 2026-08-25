"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("AudioHub runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 space-y-5">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Something went wrong!
        </h1>
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred during audio processing. This can happen
          if an audio buffer crashed or the browser ran out of memory.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button
          onClick={() => reset()}
          variant="default"
          className="rounded-xl text-xs font-semibold gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Try Again</span>
        </Button>

        <Link href="/">
          <Button
            variant="outline"
            className="rounded-xl text-xs font-semibold gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
