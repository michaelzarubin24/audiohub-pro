import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") || "";
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";

    // 1. Проверка HMAC SHA256 подписи безопасности
    const hmac = crypto.createHmac("sha256", secret);
    const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");

    if (
      signatureBuffer.length !== digest.length ||
      !crypto.timingSafeEqual(digest, signatureBuffer)
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta.event_name;
    const customData = payload.meta.custom_data;
    const userEmail = payload.data.attributes.user_email;

    console.log(`[Webhook] Event: ${eventName} for ${userEmail}`);

    // 2. Обработка событий оплаты и подписки
    switch (eventName) {
      case "order_created": {
        // Разовая покупка (напр. Lifetime Pass)
        const orderId = payload.data.id;
        console.log(`[Order Created] Grant Pro Access to: ${userEmail}, Order: ${orderId}`);
        // TODO: Сохранить Pro-статус в базе данных (Supabase/Prisma) или выдать лицензионный токен
        break;
      }

      case "subscription_created":
      case "subscription_updated": {
        // Активация или продление подписки
        const status = payload.data.attributes.status; // 'active', 'past_due', 'cancelled'
        console.log(`[Subscription Update] Status: ${status} for ${userEmail}`);
        break;
      }

      case "subscription_cancelled":
      case "subscription_expired": {
        // Отмена подписки
        console.log(`[Subscription Cancelled] Revoke Pro Access for ${userEmail}`);
        break;
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}