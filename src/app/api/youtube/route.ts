import { NextResponse } from "next/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: "YouTube URL is required" },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL format. Please provide a valid video or shorts link." },
        { status: 400 }
      );
    }

    const rapidApiKey = process.env.RAPIDAPI_KEY;
    if (!rapidApiKey) {
      return NextResponse.json(
        { error: "RAPIDAPI_KEY is not configured in environment variables." },
        { status: 500 }
      );
    }

    // 1. Запрос на конвертацию к RapidAPI
    const apiUrl = `https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`;
    const rapidRes = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-key": rapidApiKey,
        "x-rapidapi-host": "youtube-mp36.p.rapidapi.com",
      },
    });

    if (!rapidRes.ok) {
      throw new Error(`RapidAPI responded with status ${rapidRes.status}`);
    }

    const rapidData = await rapidRes.json();

    if (rapidData.status === "fail" || !rapidData.link) {
      throw new Error(rapidData.msg || "Failed to generate MP3 stream from YouTube.");
    }

    // 2. Скачивание аудиопотока и проксирование клиенту
    const streamRes = await fetch(rapidData.link);
    if (!streamRes.ok) {
      throw new Error("Failed to stream audio file from download provider.");
    }

    const audioBuffer = await streamRes.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${rapidData.title || `youtube_${videoId}`}.mp3"`,
      },
    });
  } catch (error: any) {
    console.error("RapidAPI YouTube Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to extract YouTube audio" },
      { status: 500 }
    );
  }
}