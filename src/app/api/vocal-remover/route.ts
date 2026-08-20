import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN is missing in environment variables." },
        { status: 500 }
      );
    }

    const { audioUrl } = await req.json();
    if (!audioUrl) {
      return NextResponse.json(
        { error: "No audio URL provided" },
        { status: 400 }
      );
    }

    // 1. Одиночный точный запрос к модели lucataco/demucs
    const createRes = await fetch(
      "https://api.replicate.com/v1/models/lucataco/demucs/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          Prefer: "respond-async",
        },
        body: JSON.stringify({
          input: {
            audio: audioUrl,
            two_stems: "vocals",
          },
        }),
      }
    );

    // Обработка лимитов бесплатного аккаунта Replicate
    if (createRes.status === 429) {
      return NextResponse.json(
        {
          error:
            "Replicate free tier rate limit reached (1 request at a time). Please wait 10 seconds and try again.",
        },
        { status: 429 }
      );
    }

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      throw new Error(
        errData.detail || errData.error || `Replicate returned error ${createRes.status}`
      );
    }

    let prediction = await createRes.json();

    // 2. Опрос статуса готовности (Polling)
    const pollUrl = prediction.urls.get;
    const maxAttempts = 45;
    let attempts = 0;

    while (
      prediction.status !== "succeeded" &&
      prediction.status !== "failed" &&
      attempts < maxAttempts
    ) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;

      const pollRes = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });

      if (pollRes.ok) {
        prediction = await pollRes.json();
      }
    }

    if (prediction.status !== "succeeded") {
      throw new Error(
        prediction.error || "AI stem separation timed out or failed on worker."
      );
    }

    // 3. Извлечение ссылок на стэмы
    let vocals: string | null = null;
    let instrumental: string | null = null;

    const out = prediction.output;
    if (out && typeof out === "object") {
      vocals = out.vocals || out.vocal || null;
      instrumental =
        out.no_vocals ||
        out.other ||
        out.instrumental ||
        out.accompaniment ||
        null;
    }

    return NextResponse.json({
      success: true,
      vocalsUrl: vocals,
      instrumentalUrl: instrumental,
    });
  } catch (error: any) {
    console.error("Vocal Remover AI Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process audio with AI" },
      { status: 500 }
    );
  }
}