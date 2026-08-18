import { NextResponse } from "next/server";
import { createLemonCheckout } from "@/lib/lemon-squeezy";

export async function POST(req: Request) {
  try {
    const { variantId, userEmail, userId } = await req.json();

    if (!variantId) {
      return NextResponse.json(
        { error: "Variant ID is required" },
        { status: 400 }
      );
    }

    const checkoutUrl = await createLemonCheckout({
      variantId,
      userEmail,
      userId,
    });

    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "Failed to generate checkout URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (error: any) {
    console.error("Checkout API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}