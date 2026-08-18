import { NextRequest, NextResponse } from "next/server";
import YTDlpWrap from "yt-dlp-wrap";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Путь для хранения бинарного файла yt-dlp
const BIN_DIR = path.join(process.cwd(), "bin");
const BIN_NAME = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
const BIN_PATH = path.join(BIN_DIR, BIN_NAME);

let ytDlpInstance: YTDlpWrap | null = null;
let initPromise: Promise<YTDlpWrap> | null = null;

// Инициализация yt-dlp
async function getYtDlp(): Promise<YTDlpWrap> {
  if (ytDlpInstance) return ytDlpInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!fs.existsSync(BIN_DIR)) {
      fs.mkdirSync(BIN_DIR, { recursive: true });
    }

    if (!fs.existsSync(BIN_PATH)) {
      console.log("Downloading latest yt-dlp binary from GitHub...");
      await YTDlpWrap.downloadFromGithub(BIN_PATH);
      if (process.platform !== "win32") {
        fs.chmodSync(BIN_PATH, 0o755);
      }
      console.log("yt-dlp binary downloaded successfully.");
    }

    ytDlpInstance = new YTDlpWrap(BIN_PATH);
    return ytDlpInstance;
  })();

  return initPromise;
}

function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

// 1. POST /api/youtube — Получение метаданных ролика
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Please provide a valid YouTube URL." },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      return NextResponse.json(
        { error: "Could not extract Video ID from the link." },
        { status: 400 }
      );
    }

    const ytdlp = await getYtDlp();
    const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Прямой вызов --dump-single-json без жесткого -f best
    const stdout = await ytdlp.execPromise([
      cleanUrl,
      "--dump-single-json",
      "--no-playlist",
      "--no-warnings",
      "--extractor-args",
      "youtube:player_client=android,web",
      "--force-ipv4",
    ]);

    const metadata = JSON.parse(stdout);
    const durationSec = Math.round(metadata.duration || 0);

    if (durationSec > 5400) {
      return NextResponse.json(
        { error: "Audio exceeds maximum duration limit (90 minutes)." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      title: metadata.title || "YouTube Track",
      author: metadata.uploader || metadata.channel || "YouTube Artist",
      duration: durationSec,
      thumbnail: metadata.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      videoId,
    });
  } catch (error: any) {
    console.error("yt-dlp Metadata Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to retrieve video details." },
      { status: 500 }
    );
  }
}

// 2. GET /api/youtube?url=... — Извлечение чистого аудиопотока
export async function GET(req: NextRequest) {
  try {
    const rawUrl = req.nextUrl.searchParams.get("url") || "";
    const videoId =
      extractVideoId(rawUrl) || req.nextUrl.searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json(
        { error: "Missing or invalid YouTube Video ID." },
        { status: 400 }
      );
    }

    const ytdlp = await getYtDlp();
    const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Передаем правильные аргументы для захвата аудиопотока
    const args = [
      cleanUrl,
      "--no-playlist",
      "--no-warnings",
      "--extractor-args",
      "youtube:player_client=android,web",
      "-f",
      "ba/ba*/bestaudio/best",
      "--force-ipv4",
      "-o",
      "-",
    ];

    const readableStream = ytdlp.execStream(args);
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      readableStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      readableStream.on("end", () => resolve());
      readableStream.on("error", (err: any) => reject(err));
    });

    const fullBuffer = Buffer.concat(chunks);

    if (fullBuffer.length === 0) {
      return NextResponse.json(
        { error: "No audio data received from YouTube." },
        { status: 500 }
      );
    }

    return new Response(fullBuffer, {
      headers: {
        "Content-Type": "audio/mp4",
        "Content-Length": fullBuffer.length.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("yt-dlp Stream Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to stream audio from YouTube." },
      { status: 500 }
    );
  }
}