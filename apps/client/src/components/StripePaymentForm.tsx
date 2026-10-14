"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import type { ShippingFormInputs } from "@repo/types";
import useCartStore from "@/stores/cartStore";

const StripePaymentForm = ({
  shippingForm,
}: {
  shippingForm: ShippingFormInputs;
}) => {
  const cart = useCartStore((state) => state.cart);
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in before paying.");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL}/sessions/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            cart: cart.map(({ id, quantity, selectedSize, selectedColor }) => ({
              id,
              quantity,
              selectedSize,
              selectedColor,
            })),
            shippingForm,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.paymentUrl)
        throw new Error(data.message || "Unable to start checkout.");
      window.location.assign(data.paymentUrl);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to start checkout. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        使用支付宝完成支付。订单以美元计价，支付宝会显示实际付款金额。
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {cart.length === 0 && (
        <p className="text-sm text-gray-500">Your cart is empty.</p>
      )}
      <button
        type="button"
        disabled={loading || cart.length === 0}
        onClick={startCheckout}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-white p-3 rounded-lg text-sm font-medium"
      >
        {loading ? "正在打开支付宝…" : "前往支付宝支付"}
      </button>
    </div>
  );
};
export default StripePaymentForm;
