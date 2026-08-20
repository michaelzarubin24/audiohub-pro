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
        { error: "Invalid YouTube URL. Please provide a valid video or shorts link." },
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

    // 1. Запрос к RapidAPI
    const apiUrl = `https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`;
    const rapidRes = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-key": rapidApiKey,
        "x-rapidapi-host": "youtube-mp36.p.rapidapi.com",
      },
    });

    if (!rapidRes.ok) {
      throw new Error(`RapidAPI status: ${rapidRes.status}`);
    }

    const rapidData = await rapidRes.json();

    if (rapidData.status === "fail" || !rapidData.link) {
      throw new Error(rapidData.msg || "Failed to generate MP3 stream link.");
    }

    const directDownloadLink = rapidData.link;

    // 2. Скачивание аудиопотока с эмуляцией браузера
    try {
      const streamRes = await fetch(directDownloadLink, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "*/*",
          Referer: "https://youtube-mp36.p.rapidapi.com/",
        },
        redirect: "follow",
      });

      if (streamRes.ok) {
        const audioBuffer = await streamRes.arrayBuffer();
        return new NextResponse(audioBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Disposition": `attachment; filename="${encodeURIComponent(
              rapidData.title || `audio_${videoId}`
            )}.mp3"`,
          },
        });
      }
    } catch {
      // Если Vercel IP заблокирован CDN, отдаем прямую ссылку клиенту
    }

    // 3. Fallback: отдаем прямую ссылку браузеру клиента
    return NextResponse.json({
      success: true,
      directUrl: directDownloadLink,
      title: rapidData.title || `youtube_${videoId}`,
    });
  } catch (error: any) {
    console.error("RapidAPI Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process YouTube audio" },
      { status: 500 }
    );
  }
}