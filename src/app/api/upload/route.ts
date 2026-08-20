import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          maximumSizeInBytes: 60 * 1024 * 1024, // Лимит 60MB
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("Blob upload complete:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.error("Blob Upload Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate token" },
      { status: 400 }
    );
  }
}