import { OrdersClient } from "@/components/OrdersClient";
import { auth } from "@clerk/nextjs/server";
import { OrderType } from "@repo/types";

const fetchOrders = async (token: string): Promise<OrderType[]> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_ORDER_SERVICE_URL}/user-orders`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) return [];
  return res.json();
};

const OrdersPage = async () => {
  const { getToken } = await auth();
  const token = (await getToken()) ?? "";
  const orders = await fetchOrders(token);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Your Orders
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {orders.length} order{orders.length !== 1 ? "s" : ""} total
        </p>
      </div>

      <OrdersClient initialOrders={orders} token={token} />
    </div>
  );
};

export default OrdersPage;
