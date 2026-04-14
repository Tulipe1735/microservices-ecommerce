"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { CartItemsType, ShippingFormInputs } from "@repo/types";
import useCartStore from "@/stores/cartStore";

const PaymePaymentForm = ({
  shippingForm,
}: {
  shippingForm: ShippingFormInputs;
}) => {
  const { cart } = useCartStore();
  const [token, setToken] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    getToken().then((t) => setToken(t));
  }, []);

  useEffect(() => {
    if (!token || cart.length === 0) return;

    let cancelled = false;

    const initializeCheckout = async () => {
      try {
        setError(null);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL}/sessions/create-checkout-session`,
          {
            method: "POST",
            body: JSON.stringify({ cart }),
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const json = await response.json();

        if (!response.ok)
          throw new Error(json?.message || "Failed to initialize payment.");
        if (!json?.paymentUrl) throw new Error("Payment URL was not returned.");

        if (!cancelled) setPaymentUrl(json.paymentUrl);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : "Failed to initialize payment.",
          );
      }
    };

    initializeCheckout();
    return () => {
      cancelled = true;
    };
  }, [cart, token]);

  if (!token || !paymentUrl) {
    return <div className="text-sm text-gray-500">Loading payment form...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">点击下方按钮跳转至 Payme 完成支付</p>
      <a
        href={paymentUrl}
        className="w-full bg-blue-600 hover:bg-blue-700 transition-all duration-300 text-white p-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
      >
        前往 Payme 支付
      </a>
    </div>
  );
};

export default PaymePaymentForm;
