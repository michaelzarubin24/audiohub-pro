import { lemonSqueezySetup, createCheckout } from "@lemonsqueezy/lemonsqueezy.js";

// Инициализация Lemon Squeezy с вашим API-ключом
lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY!,
  onError: (error) => console.error("Lemon Squeezy SDK Error:", error),
});

interface CheckoutParams {
  variantId: string;
  userEmail?: string;
  userId?: string;
  redirectUrl?: string;
}

/**
 * Создает ссылку на оплату с кастомными метаданными
 */
export async function createLemonCheckout({
  variantId,
  userEmail,
  userId,
  redirectUrl,
}: CheckoutParams) {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const checkout = await createCheckout(storeId, variantId, {
    checkoutOptions: {
      embed: true, // Позволяет открывать модальное окно прямо поверх сайта
      media: true,
      logo: true,
    },
    checkoutData: {
      email: userEmail,
      custom: {
        user_id: userId || "guest_user",
      },
    },
    productOptions: {
      redirectUrl: redirectUrl || `${appUrl}/success`,
      receiptButtonText: "Return to AudioHub",
    },
  });

  return checkout.data?.data.attributes.url;
}