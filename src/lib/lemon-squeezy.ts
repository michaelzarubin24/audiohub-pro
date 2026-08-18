import { lemonSqueezySetup, createCheckout } from "@lemonsqueezy/lemonsqueezy.js";

lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY || "",
  onError: (error) => console.error("Lemon Squeezy SDK Error:", error),
});

interface CheckoutParams {
  variantId: string;
  userEmail?: string;
  userId?: string;
}

export async function createLemonCheckout({
  variantId,
  userEmail,
  userId,
}: CheckoutParams) {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://audiohub-pro.vercel.app";

  if (!process.env.LEMONSQUEEZY_API_KEY) {
    throw new Error("Missing LEMONSQUEEZY_API_KEY in environment variables");
  }
  if (!storeId) {
    throw new Error("Missing LEMONSQUEEZY_STORE_ID in environment variables");
  }

  const checkout = await createCheckout(storeId, variantId, {
    checkoutOptions: {
      embed: true,
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
      redirectUrl: `${appUrl}/pricing`,
      receiptButtonText: "Return to AudioHub",
    },
  });

  if (checkout.error) {
    console.error("Lemon Checkout Creation Error:", checkout.error);
    throw new Error(checkout.error.message || "Failed to create checkout");
  }

  return checkout.data?.data.attributes.url;
}