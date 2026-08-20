import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN is not configured in environment variables." },
        { status: 500 }
      );
    }

    const { audioUrl } = await req.json();

    if (!audioUrl) {
      return NextResponse.json({ error: "No audio URL provided" }, { status: 400 });
    }

    // Запуск инференса модели Meta Demucs v4
    const createPredictionRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "25a17394f11a49941ab20ce016bc4e28cd5b144b1fa0ed3e7c97e5cb083d65d2",
        input: {
          audio: audioUrl,
          two_stems: "vocals",
          stem: "vocals",
        },
      }),
    });

    if (!createPredictionRes.ok) {
      const err = await createPredictionRes.json();
      throw new Error(err.detail || "Failed to start AI separation task");
    }

    let prediction = await createPredictionRes.json();

    // Опрос готовности
    const pollUrl = prediction.urls.get;
    const maxAttempts = 35;
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
      throw new Error(prediction.error || "AI stem separation timed out or failed");
    }

    return NextResponse.json({
      success: true,
      vocalsUrl: prediction.output?.vocals || null,
      instrumentalUrl: prediction.output?.no_vocals || null,
    });
  } catch (error: any) {
    console.error("Vocal Remover AI Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process audio with AI" },
      { status: 500 }
    );
  }
}