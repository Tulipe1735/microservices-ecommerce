"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CartItemType } from "@repo/types";
import useCartStore from "@/stores/cartStore";

type PaymentResult = {
  status: "pending" | "processing" | "success" | "failed" | "cancelled";
  paymentStatus: string;
  cart: Pick<
    CartItemType,
    "id" | "quantity" | "selectedSize" | "selectedColor"
  >[];
};

export default function PaymentStatus({ sessionId }: { sessionId: string }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const completeCheckout = useCartStore((state) => state.completeCheckout);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !hasHydrated) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const check = async () => {
      try {
        setError(null);
        const token = await getToken();
        if (!token) throw new Error("Please sign in to view this payment.");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL}/sessions/${encodeURIComponent(sessionId)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Unable to check payment status.");
        if (controller.signal.aborted) return;
        setResult(data);
        if (data.status === "success") completeCheckout(sessionId, data.cart);
        else if (
          ["pending", "processing"].includes(data.status) &&
          ++attempts < 60
        )
          timer = setTimeout(check, 2_000);
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "Unable to check payment status.",
          );
      }
    };
    check();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [
    completeCheckout,
    getToken,
    hasHydrated,
    isLoaded,
    isSignedIn,
    retry,
    sessionId,
  ]);

  const messages = {
    pending: "等待支付宝付款确认…",
    processing: "正在确认付款并准备订单…",
    success: "支付宝付款成功，订单正在准备中。",
    failed: "付款失败，购物车已保留。请重新结账。",
    cancelled: "支付会话已结束，购物车已保留。",
  };
  return (
    <div className="max-w-xl mx-auto py-12 px-4 flex flex-col gap-4">
      <h1 className="text-2xl font-medium">Payment status</h1>
      {isLoaded && !isSignedIn ? (
        <p>Please sign in to view this payment.</p>
      ) : (
        <p role="status">
          {result ? messages[result.status] : "正在查询支付结果…"}
        </p>
      )}
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      {result?.status !== "success" && isSignedIn && (
        <button
          type="button"
          onClick={() => setRetry((value) => value + 1)}
          className="text-blue-600 text-left"
        >
          重新查询
        </button>
      )}
      <Link
        className="underline"
        href={result?.status === "success" ? "/orders" : "/cart"}
      >
        {result?.status === "success" ? "查看订单" : "返回购物车"}
      </Link>
    </div>
  );
}
