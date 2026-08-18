"use client";

import React, { useState } from "react";
import {
  Search,
  Loader2,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTime } from "@/lib/audio-utils";

export interface YouTubeVideoInfo {
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
  videoId: string;
  url: string;
}

interface YouTubeInputCardProps {
  onVideoLoaded: (info: YouTubeVideoInfo) => void;
  isLoading: boolean;
  disabled?: boolean;
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export function YouTubeInputCard({
  onVideoLoaded,
  isLoading,
  disabled = false,
}: YouTubeInputCardProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [loadedVideo, setLoadedVideo] = useState<YouTubeVideoInfo | null>(null);

  const handleFetch = async () => {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      setError("Please enter a valid YouTube link.");
      return;
    }

    try {
      setError(null);
      setIsFetching(true);

      const response = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch YouTube info.");
      }

      const videoInfo: YouTubeVideoInfo = {
        title: data.title,
        author: data.author,
        duration: data.duration,
        thumbnail: data.thumbnail,
        videoId: data.videoId,
        url: cleanUrl,
      };

      setLoadedVideo(videoInfo);
      onVideoLoaded(videoInfo);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || "Could not retrieve video. Please check the URL.",
      );
      setLoadedVideo(null);
    } finally {
      setIsFetching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleFetch();
    }
  };

  return (
    <div className="space-y-4">
      {/* Поле ввода URL */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <YouTubeIcon className="h-4 w-4 text-red-500" />
          </div>
          <Input
            type="url"
            placeholder="Paste YouTube Link (e.g. https://www.youtube.com/watch?v=...)"
            value={url}
            disabled={disabled || isFetching || isLoading}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            className="pl-9 h-11 bg-background/50 border-border/80 text-sm"
          />
        </div>
        <Button
          onClick={handleFetch}
          disabled={disabled || isFetching || isLoading || !url.trim()}
          className="h-11 px-5 font-semibold shrink-0 gap-2"
        >
          {isFetching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Get Audio
            </>
          )}
        </Button>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Карточка загруженного видео */}
      {loadedVideo && !error && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 backdrop-blur">
          {loadedVideo.thumbnail && (
            <div className="relative aspect-video w-full sm:w-36 overflow-hidden rounded-lg border border-border/60 bg-zinc-950 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={loadedVideo.thumbnail}
                alt={loadedVideo.title}
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] text-white">
                {formatTime(loadedVideo.duration)}
              </span>
            </div>
          )}

          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>YouTube Audio Stream Ready</span>
            </div>
            <h4
              className="font-semibold text-sm truncate"
              title={loadedVideo.title}
            >
              {loadedVideo.title}
            </h4>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" /> {loadedVideo.author}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {formatTime(loadedVideo.duration)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
