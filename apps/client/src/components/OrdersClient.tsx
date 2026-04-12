"use client";

import { OrderType } from "@repo/types";
import { useState } from "react";

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  pending: {
    label: "Pending",
    color: "text-amber-600 bg-amber-50 border-amber-200",
    dot: "bg-amber-400",
  },
  paid: {
    label: "Paid",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-400",
  },
  processing: {
    label: "Processing",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    dot: "bg-blue-400",
  },
  shipped: {
    label: "Shipped",
    color: "text-violet-600 bg-violet-50 border-violet-200",
    dot: "bg-violet-400",
  },
  delivered: {
    label: "Delivered",
    color: "text-teal-600 bg-teal-50 border-teal-200",
    dot: "bg-teal-400",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-rose-600 bg-rose-50 border-rose-200",
    dot: "bg-rose-400",
  },
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function canDelete(createdAt?: string | Date): {
  allowed: boolean;
  reason?: string;
} {
  if (!createdAt) return { allowed: false, reason: "Unknown order date" };
  const age = Date.now() - new Date(createdAt).getTime();
  if (age > TWO_DAYS_MS) {
    const days = Math.floor(age / (24 * 60 * 60 * 1000));
    return {
      allowed: false,
      reason: `Orders can only be deleted within 48 hours of placement (${days}d ago)`,
    };
  }
  return { allowed: true };
}

function TimeAgo({ date }: { date?: string | Date }) {
  if (!date) return <span className="text-gray-400">—</span>;
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor(diffMs / 60000);

  let label: string;
  if (diffH >= 48) label = d.toLocaleDateString("zh-CN");
  else if (diffH >= 1) label = `${diffH}h ago`;
  else label = `${diffM}m ago`;

  return (
    <span title={d.toLocaleString("zh-CN")} className="tabular-nums">
      {label}
    </span>
  );
}

function DeleteButton({
  orderId,
  createdAt,
  onDeleted,
  token,
}: {
  orderId: string;
  createdAt?: string | Date;
  onDeleted: (id: string) => void;
  token: string;
}) {
  const [state, setState] = useState<"idle" | "confirming" | "loading">("idle");
  const { allowed, reason } = canDelete(createdAt);

  const handleDelete = async () => {
    setState("loading");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_ORDER_SERVICE_URL}/user-orders/${orderId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.ok) {
        onDeleted(orderId);
      } else {
        alert("Failed to delete order. Please try again.");
        setState("idle");
      }
    } catch {
      alert("Network error. Please try again.");
      setState("idle");
    }
  };

  if (!allowed) {
    return (
      <div className="group relative">
        <button
          disabled
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
            text-gray-300 bg-gray-50 border border-gray-100 cursor-not-allowed select-none"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Delete
        </button>
        {/* Tooltip */}
        <div
          className="absolute bottom-full right-0 mb-2 w-56 text-[11px] leading-relaxed
          bg-gray-900 text-gray-100 px-3 py-2 rounded-lg shadow-xl
          opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
        >
          <div className="flex items-start gap-1.5">
            <svg
              className="w-3 h-3 mt-0.5 shrink-0 text-amber-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {reason}
          </div>
          {/* Arrow */}
          <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-900" />
        </div>
      </div>
    );
  }

  if (state === "confirming") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">Sure?</span>
        <button
          onClick={handleDelete}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold
            text-white bg-rose-500 hover:bg-rose-600 active:scale-95
            transition-all duration-150"
        >
          Yes, delete
        </button>
        <button
          onClick={() => setState("idle")}
          className="px-3 py-1.5 rounded-lg text-xs font-medium
            text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setState("confirming")}
      disabled={state === "loading"}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
        text-rose-500 bg-rose-50 border border-rose-100
        hover:bg-rose-500 hover:text-white hover:border-rose-500
        active:scale-95 transition-all duration-150 disabled:opacity-50"
    >
      {state === "loading" ? (
        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      ) : (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      )}
      Delete
    </button>
  );
}

export function OrdersClient({
  initialOrders,
  token,
}: {
  initialOrders: OrderType[];
  token: string;
}) {
  const [orders, setOrders] = useState(initialOrders);

  const handleDeleted = (id: string) => {
    setOrders((prev) => prev.filter((o) => o._id !== id));
  };

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
          <svg
            className="w-7 h-7 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <p className="text-gray-500 text-sm font-medium">No orders yet</p>
        <p className="text-gray-400 text-xs mt-1">
          Your order history will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order, i) => {
        const total =
          order.products?.reduce((sum, p) => sum + p.price * p.quantity, 0) ??
          order.amount;

        const statusKey = (order.status ?? "").toLowerCase();
        const statusCfg = STATUS_CONFIG[statusKey] ?? {
          label: order.status ?? "Unknown",
          color: "text-gray-500 bg-gray-50 border-gray-200",
          dot: "bg-gray-400",
        };

        return (
          <div
            key={order._id}
            className="group relative bg-white rounded-2xl border border-gray-100
              shadow-sm hover:shadow-md hover:border-gray-200
              transition-all duration-200"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Top stripe accent */}
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent" />

            <div className="px-6 py-5">
              {/* Header row */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Order icon */}
                  <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-0.5">
                      Order
                    </p>
                    <p className="text-xs text-gray-500 font-mono truncate">
                      {order._id}
                    </p>
                  </div>
                </div>

                {/* Status badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                  text-xs font-medium border shrink-0 ${statusCfg.color}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}
                  />
                  {statusCfg.label}
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">
                    Total
                  </p>
                  <p className="text-lg font-semibold text-gray-900 tabular-nums">
                    {currencyFormatter.format(total)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">
                    Date
                  </p>
                  <p className="text-sm text-gray-700 font-medium">
                    <TimeAgo date={order.createdAt} />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">
                    Items
                  </p>
                  <p className="text-sm text-gray-700 font-medium">
                    {order.products?.length ?? "—"}
                  </p>
                </div>
              </div>

              {/* Products list */}
              {order.products && order.products.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {order.products.map((p, pi) => (
                    <span
                      key={pi}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg
                        bg-gray-50 border border-gray-100 text-xs text-gray-600"
                    >
                      {p.name}
                      {p.quantity > 1 && (
                        <span className="text-gray-400">×{p.quantity}</span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer row */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                {/* Deletability hint */}
                {(() => {
                  const { allowed } = canDelete(order.createdAt);
                  if (allowed && order.createdAt) {
                    const remaining =
                      TWO_DAYS_MS -
                      (Date.now() - new Date(order.createdAt).getTime());
                    const hours = Math.ceil(remaining / 3600000);
                    return (
                      <p className="text-[11px] text-amber-500">
                        ⏱ Can delete for {hours}h more
                      </p>
                    );
                  }
                  return <div />;
                })()}

                <DeleteButton
                  orderId={order._id}
                  createdAt={order.createdAt}
                  onDeleted={handleDeleted}
                  token={token}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
