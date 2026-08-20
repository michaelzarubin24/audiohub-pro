import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Маршрут самопроверки токена (откройте /api/upload в браузере)
export async function GET() {
  const tokenExists = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  return NextResponse.json({
    status: "ready",
    blobTokenConfigured: tokenExists,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN is missing in environment variables!");
    return NextResponse.json(
      { error: "Blob token is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token, // Передаем токен явно
      onBeforeGenerateToken: async (pathname) => {
        return {
          maximumSizeInBytes: 60 * 1024 * 1024, // Лимит 60MB
          addRandomSuffix: true, // Защита от перезаписи файлов с одинаковым именем
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("Upload completed to Vercel Blob:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.error("Vercel Blob handleUpload Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate upload token" },
      { status: 400 }
    );
  }
}