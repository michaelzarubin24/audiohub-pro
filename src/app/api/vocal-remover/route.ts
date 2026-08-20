import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Список активных публичных моделей Demucs на Replicate
const DEMUCS_MODELS = [
  "lucataco/demucs",
  "chenxwh/demucs",
  "sakurai-youhei/demucs",
];

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

    let prediction: any = null;
    let lastError: string = "";

    // 1. Поочередная попытка запуска инференса на доступных моделях
    for (const modelPath of DEMUCS_MODELS) {
      try {
        const createRes = await fetch(
          `https://api.replicate.com/v1/models/${modelPath}/predictions`,
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

        if (createRes.ok) {
          prediction = await createRes.json();
          break; // Модель успешно запущена
        } else {
          const errData = await createRes.json().catch(() => ({}));
          lastError = errData.detail || errData.error || `Failed on ${modelPath}`;
        }
      } catch (err: any) {
        lastError = err.message || `Network error on ${modelPath}`;
      }
    }

    if (!prediction || !prediction.urls?.get) {
      throw new Error(
        lastError || "Could not find an available Demucs AI instance on Replicate."
      );
    }

    // 2. Опрос статуса выполнения задачи (Polling)
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
        prediction.error || "AI stem separation timed out or failed."
      );
    }

    // 3. Универсальный парсинг выходных стэмов
    let vocals: string | null = null;
    let instrumental: string | null = null;

    const out = prediction.output;
    if (out && typeof out === "object") {
      if (Array.isArray(out)) {
        vocals = out[0] || null;
        instrumental = out[1] || null;
      } else {
        vocals = out.vocals || out.vocal || null;
        instrumental =
          out.no_vocals ||
          out.other ||
          out.instrumental ||
          out.accompaniment ||
          null;
      }
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