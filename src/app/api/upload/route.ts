import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Поддержка всех возможных MIME-типов аудио
        return {
          allowedContentTypes: [
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/x-wav",
            "audio/vnd.wave",
            "audio/wave",
            "audio/flac",
            "audio/x-flac",
            "audio/aac",
            "audio/ogg",
            "audio/vorbis",
            "audio/x-m4a",
            "audio/m4a",
            "audio/mp4",
            "audio/webm",
          ],
          maximumSizeInBytes: 60 * 1024 * 1024, // До 60MB
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("Audio uploaded successfully to Blob:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.error("Vercel Blob Token Generation Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate client token" },
      { status: 400 }
    );
  }
}