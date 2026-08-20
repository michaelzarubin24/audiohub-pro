import { NextResponse } from "next/server";

export const maxDuration = 15; // Максимальное время для Vercel Serverless
export const dynamic = "force-dynamic";

// Извлечение ID видео из ссылки любого формата
function extractVideoId(url: string): string | null {
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL format. Please provide a valid video or shorts link." },
        { status: 400 }
      );
    }

    // 1. Попытка через публичные инстансы Cobalt API (работает с аудиопотоками YouTube без блокировки по IP)
    const cobaltInstances = [
      "https://api.cobalt.tools",
      "https://cobalt-backend.canine.tools",
    ];

    for (const endpoint of cobaltInstances) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const cobaltRes = await fetch(`${endpoint}/`, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: `https://www.youtube.com/watch?v=${videoId}`,
            audioFormat: "mp3",
            downloadMode: "audio",
            audioBitrate: "320",
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (cobaltRes.ok) {
          const data = await cobaltRes.json();
          if (data.url || data.audio) {
            const streamUrl = data.url || data.audio;
            // Проксируем аудио через поток
            const audioStreamRes = await fetch(streamUrl);
            if (audioStreamRes.ok) {
              const audioBuffer = await audioStreamRes.arrayBuffer();
              return new NextResponse(audioBuffer, {
                headers: {
                  "Content-Type": "audio/mpeg",
                  "Content-Disposition": `attachment; filename="youtube_${videoId}.mp3"`,
                },
              });
            }
          }
        }
      } catch (err) {
        console.warn(`Cobalt instance ${endpoint} failed, trying next fallback...`);
      }
    }

    // 2. Резервный метод: Piped / Invidious Audio API
    const pipedInstances = [
      "https://pipedapi.kavin.rocks",
      "https://api.piped.privacydev.net",
      "https://pipedapi.tokhmi.xyz",
    ];

    for (const piped of pipedInstances) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const metaRes = await fetch(`${piped}/streams/${videoId}`, {
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0" },
        });

        clearTimeout(timeoutId);

        if (metaRes.ok) {
          const meta = await metaRes.json();
          const audioStreams = meta.audioStreams;

          if (audioStreams && audioStreams.length > 0) {
            // Выбираем лучший аудиопоток по битрейту
            audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
            const bestStream = audioStreams[0];

            const streamFetch = await fetch(bestStream.url);
            if (streamFetch.ok) {
              const audioData = await streamFetch.arrayBuffer();
              return new NextResponse(audioData, {
                headers: {
                  "Content-Type": bestStream.mimeType || "audio/webm",
                  "Content-Disposition": `attachment; filename="youtube_${videoId}.mp3"`,
                },
              });
            }
          }
        }
      } catch (err) {
        console.warn(`Piped instance ${piped} failed, trying next...`);
      }
    }

    return NextResponse.json(
      {
        error:
          "YouTube datacenter restriction: Unable to extract audio directly on cloud server. Please upload audio file directly or try another video.",
      },
      { status: 502 }
    );
  } catch (error: any) {
    console.error("YouTube Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process YouTube audio stream" },
      { status: 500 }
    );
  }
}