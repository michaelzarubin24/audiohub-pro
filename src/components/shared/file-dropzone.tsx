"use client";

import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Music, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileDropzoneProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  maxSizeMB?: number;
}

export function FileDropzone({
  selectedFile,
  onFileSelect,
  maxSizeMB = 50,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: {
        "audio/*": [".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"],
      },
      maxFiles: 1,
      maxSize: maxSizeMB * 1024 * 1024,
    });

  if (selectedFile) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Music className="h-5 w-5" />
          </div>
          <div className="truncate">
            <p className="truncate text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onFileSelect(null)}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div
        {...getRootProps()}
        className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
          isDragActive
            ? "border-primary bg-primary/5 scale-[0.99]"
            : "border-border/80 hover:border-primary/50 hover:bg-secondary/30"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
          <UploadCloud className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium">
          {isDragActive
            ? "Drop your audio file here..."
            : "Click to upload or drag & drop"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          MP3, WAV, FLAC, OGG up to {maxSizeMB}MB
        </p>
      </div>

      {fileRejections.length > 0 && (
        <p className="text-xs text-destructive text-center">
          Invalid file type or size exceeds {maxSizeMB}MB.
        </p>
      )}
    </div>
  );
}
