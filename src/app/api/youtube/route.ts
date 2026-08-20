import { NextResponse } from "next/server";

export const maxDuration = 20;
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

    const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // 1. Пул инстансов Cobalt API (протокол v10)
    const cobaltEndpoints = [
      "https://api.cobalt.tools",
      "https://cobalt-backend.canine.tools",
    ];

    for (const endpoint of cobaltEndpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(`${endpoint}/`, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "AudioHub-Web/1.0",
          },
          body: JSON.stringify({
            url: targetUrl,
            downloadMode: "audio",
            audioFormat: "mp3",
            audioBitrate: "320",
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const downloadUrl = data.url || data.audio;

          if (downloadUrl) {
            const streamRes = await fetch(downloadUrl);
            if (streamRes.ok) {
              const buffer = await streamRes.arrayBuffer();
              return new NextResponse(buffer, {
                headers: {
                  "Content-Type": "audio/mpeg",
                  "Content-Disposition": `attachment; filename="audio_${videoId}.mp3"`,
                },
              });
            }
          }
        }
      } catch {
        // Переход к следующему зеркалу
      }
    }

    // 2. Пул активных зеркал Invidious API
    const invidiousNodes = [
      "https://yewtu.be",
      "https://inv.nadeko.net",
      "https://invidious.nerdvpn.de",
      "https://invidious.f5.si",
    ];

    for (const node of invidiousNodes) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const infoRes = await fetch(`${node}/api/v1/videos/${videoId}`, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        clearTimeout(timeout);

        if (infoRes.ok) {
          const info = await infoRes.json();
          const formats = [
            ...(info.adaptiveFormats || []),
            ...(info.formatStreams || []),
          ];

          // Ищем аудиопотоки с наилучшим качеством
          const audioFormats = formats.filter(
            (f: any) =>
              f.type?.startsWith("audio/") ||
              f.mimeType?.startsWith("audio/") ||
              f.audioQuality
          );

          if (audioFormats.length > 0) {
            audioFormats.sort(
              (a: any, b: any) =>
                (parseInt(b.bitrate, 10) || 0) - (parseInt(a.bitrate, 10) || 0)
            );

            const bestAudio = audioFormats[0];
            const audioStreamUrl = bestAudio.url;

            if (audioStreamUrl) {
              const audioStreamRes = await fetch(audioStreamUrl, {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
              });

              if (audioStreamRes.ok) {
                const buffer = await audioStreamRes.arrayBuffer();
                return new NextResponse(buffer, {
                  headers: {
                    "Content-Type":
                      bestAudio.type || bestAudio.mimeType || "audio/mpeg",
                    "Content-Disposition": `attachment; filename="audio_${videoId}.mp3"`,
                  },
                });
              }
            }
          }
        }
      } catch {
        // Переход к следующей ноде
      }
    }

    return NextResponse.json(
      {
        error:
          "YouTube rate-limit reached across all public mirrors. Please upload your audio file directly via the 'Upload File' tab.",
      },
      { status: 502 }
    );
  } catch (error: any) {
    console.error("YouTube API Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process audio stream" },
      { status: 500 }
    );
  }
}