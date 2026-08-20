import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            "audio/mpeg",
            "audio/wav",
            "audio/flac",
            "audio/aac",
            "audio/ogg",
            "audio/x-m4a",
            "audio/mp4",
          ],
          maximumSizeInBytes: 50 * 1024 * 1024, // Поддержка файлов до 50MB
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("Blob upload completed:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate upload token" },
      { status: 400 }
    );
  }
}