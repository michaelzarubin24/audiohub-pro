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

    // 1. Создание задачи через прямой эндпоинт модели (всегда выбирает актуальную версию)
    const createPredictionRes = await fetch(
      "https://api.replicate.com/v1/models/cjwbw/demucs/predictions",
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

    if (!createPredictionRes.ok) {
      const err = await createPredictionRes.json();
      throw new Error(
        err.detail || err.error || "Failed to initialize Replicate Demucs AI task"
      );
    }

    let prediction = await createPredictionRes.json();

    // 2. Опрос готовности (Polling)
    const pollUrl = prediction.urls.get;
    const maxAttempts = 40;
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

    // Извлечение ссылок на вокал и минус
    const vocals = prediction.output?.vocals || null;
    const instrumental =
      prediction.output?.no_vocals || prediction.output?.other || null;

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